import { useCallback, useEffect, useRef, useState } from 'react';
import { getWaaPStellarProvider } from '@human.tech/waap-sdk-react-native/stellar';

import { toError, useDemoMode } from '@/contexts/DemoContext';
import {
  buildStellarTestPayment,
  fetchStellarBalance,
  fetchStellarTransactionStatus,
  fundStellarTestAccount,
  networkPassphrase,
  signedTransactionHash,
  submitStellarTestPayment,
  STELLAR_NATIVE_NETWORK,
  type StellarBalance,
  type StellarTransactionStatus,
} from '@/lib/stellar-native';

type Action = 'restore' | 'connect' | 'refresh' | 'fund' | 'message' | 'payment' | 'confirm';
type Transaction = { hash: string; status: StellarTransactionStatus };
type WalletState = {
  owner: string | null;
  address: string | null;
  balance: StellarBalance | null;
  signature: string | null;
  transaction: Transaction | null;
  error: string | null;
  busy: Action | null;
};

const emptyState = (owner: string | null): WalletState => ({
  owner, address: null, balance: null, signature: null,
  transaction: null, error: null, busy: null,
});

export const STELLAR_PROOF_MESSAGE = 'RelayID: I control this native Stellar wallet.';

export function useNativeStellarWallet() {
  const { account, provider } = useDemoMode();
  const owner = account ?? null;
  const [state, setState] = useState<WalletState>(() => emptyState(owner));
  const generation = useRef(0);
  const active = useRef<AbortController | null>(null);
  const network = STELLAR_NATIVE_NETWORK;

  const run = useCallback(async (
    action: Action,
    operation: (
      signal: AbortSignal,
      update: (patch: Partial<WalletState>) => void,
      isCurrent: () => boolean,
    ) => Promise<void>,
  ) => {
    if (!owner || !provider || active.current) return;
    const currentGeneration = generation.current;
    const controller = new AbortController();
    active.current = controller;
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, action === 'restore' ? 30_000 : 120_000);
    let onAbort: () => void = () => {};
    const aborted = new Promise<never>((_resolve, reject) => {
      onAbort = () => reject(new Error('The wallet took too long to respond. Please try again.'));
      controller.signal.addEventListener('abort', onAbort, { once: true });
    });
    const isCurrent = () =>
      generation.current === currentGeneration && !controller.signal.aborted;
    const update = (patch: Partial<WalletState>) => {
      if (isCurrent()) setState((previous) => ({ ...previous, owner, ...patch }));
    };
    update({ busy: action, error: null });
    try {
      await Promise.race([operation(controller.signal, update, isCurrent), aborted]);
    } catch (error) {
      if (timedOut && generation.current === currentGeneration) {
        setState((previous) => ({ ...previous, error: toError(error).message }));
      } else {
        const message = toError(error).message;
        update({ error: /unknown method.*stellar_|not implemented.*stellar_/i.test(message)
          ? 'This WaaP service does not support Stellar yet. The app needs a Stellar-enabled wallet service.'
          : message });
      }
    } finally {
      clearTimeout(timer);
      controller.signal.removeEventListener('abort', onAbort);
      if (generation.current === currentGeneration) {
        setState((previous) => ({ ...previous, busy: null }));
      }
      if (active.current === controller) active.current = null;
    }
  }, [owner, provider]);

  const connect = useCallback((interactive = true) => run(interactive ? 'connect' : 'restore', async (signal, update, isCurrent) => {
    // Startup must stay silent. On an explicit tap, use getAddress so WaaP
    // can connect and report errors that restoreAccount deliberately hides.
    const stellar = getWaaPStellarProvider({ network });
    let restored = await stellar.restoreAccount();
    if (!isCurrent()) return;
    if (!restored && interactive) restored = await stellar.getAddress();
    if (!isCurrent() || !restored) return;
    update({ address: restored.address });
    update({ balance: await fetchStellarBalance(restored.address, network, signal) });
  }), [run, network]);

  useEffect(() => {
    generation.current += 1;
    active.current?.abort();
    active.current = null;
    setState(emptyState(owner));
    if (owner && provider) void connect(false);
    return () => {
      generation.current += 1;
      active.current?.abort();
      active.current = null;
    };
  }, [owner, provider, connect]);

  // Hide another account's data in the render before the effect resets it.
  const wallet = state.owner === owner ? state : emptyState(owner);
  const address = wallet.address;

  const refresh = () => run('refresh', async (signal, update) => {
    if (!address) return;
    update({ balance: await fetchStellarBalance(address, network, signal) });
  });

  const fund = () => run('fund', async (signal, update) => {
    if (!address) return;
    await fundStellarTestAccount(address, network, signal);
    update({ balance: await fetchStellarBalance(address, network, signal) });
  });

  const signMessage = () => run('message', async (_signal, update, isCurrent) => {
    if (!address || !isCurrent()) return;
    const stellar = getWaaPStellarProvider({ network });
    const result = await stellar.signMessage(STELLAR_PROOF_MESSAGE, {
      address, networkPassphrase: networkPassphrase(network),
    });
    update({ signature: result.signedMessage });
  });

  const sendTestPayment = () => run('payment', async (signal, update, isCurrent) => {
    if (!address || wallet.transaction?.status === 'pending') return;
    const xdr = await buildStellarTestPayment(address, network, signal);
    // Do not open a signing prompt if the user logged out while building.
    if (!isCurrent()) return;
    const stellar = getWaaPStellarProvider({ network });
    const result = await stellar.signTransaction(xdr, {
      address, networkPassphrase: networkPassphrase(network),
    });
    if (!isCurrent()) return;
    const hash = signedTransactionHash(result.signedTxXdr, network);
    if (hash !== signedTransactionHash(xdr, network)) {
      throw new Error('The wallet returned a different payment. Nothing was submitted.');
    }
    // A submitted transaction isn't necessarily confirmed. Retain its hash
    // even if the confirmation read fails so the user can check it again.
    update({ transaction: { hash, status: 'pending' } });
    // Broadcast only while this screen still owns the same session. A late
    // signature from a timed-out/logged-out attempt must never move funds.
    await submitStellarTestPayment(result.signedTxXdr, network, signal);
    const status = await fetchStellarTransactionStatus(hash, network, signal);
    update({ transaction: { hash, status } });
    update({ balance: await fetchStellarBalance(address, network, signal) });
  });

  const checkTransaction = () => run('confirm', async (signal, update) => {
    if (!wallet.transaction || !address) return;
    const { hash } = wallet.transaction;
    const status = await fetchStellarTransactionStatus(hash, network, signal);
    update({ transaction: { hash, status } });
    update({ balance: await fetchStellarBalance(address, network, signal) });
  });

  return {
    ...wallet, network, connect, refresh, fund, signMessage,
    sendTestPayment, checkTransaction,
  };
}
