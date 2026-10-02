import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { AppState } from 'react-native';
import * as Crypto from 'expo-crypto';
import { useDemoMode } from '@/contexts/DemoContext';
import { useNativeStellarWallet } from './useNativeStellarWallet';
import { DisbursementController, type DisbursementState } from '@/lib/disbursement-controller';
import { disbursementSessionStorage } from '@/lib/disbursement-session-storage';
import { createDisbursementApi, disbursementOrigin, verifiedSignature } from '@/lib/stellar-disbursements';
import { networkPassphrase } from '@/lib/stellar-native';

const empty: DisbursementState = { authenticated: false, loaded: false, fresh: false, items: [], busy: null, redeemingId: null, error: null };
const subscribeEmpty = () => () => {};
const getEmpty = () => empty;
function configuration() {
  try {
    return { origin: disbursementOrigin(process.env.EXPO_PUBLIC_DISBURSEMENTS_API_URL || process.env.EXPO_PUBLIC_RELAYID_API_URL), error: null };
  } catch (error) { return { origin: null, error: error instanceof Error ? error.message : 'Invalid RelayID server configuration.' }; }
}
const config = configuration();

function useDisbursementState() {
  const { account } = useDemoMode();
  const wallet = useNativeStellarWallet();
  const walletRef = useRef(wallet);
  walletRef.current = wallet;
  const [revision, setRevision] = useState(0);
  const [controller, setController] = useState<DisbursementController | null>(null);
  const previous = useRef<{ key: string; controller: DisbursementController } | null>(null);
  const address = wallet.address;
  const network = wallet.network;
  const key = `${account}:${address}:${network}`;

  useEffect(() => {
    const old = previous.current;
    const cleanup = old && old.key !== key ? old.controller.endSession() : Promise.resolve(true);
    previous.current = null;
    if (!account || !address || !config.origin) {
      setController(null);
      void cleanup.catch(() => {});
      return;
    }
    const next = new DisbursementController({
      address, passphrase: networkPassphrase(network),
      api: createDisbursementApi(config.origin),
      storage: disbursementSessionStorage(config.origin, network),
      nonce: () => Array.from(Crypto.getRandomBytes(16), (byte) => byte.toString(16).padStart(2, '0')).join(''),
      sign: async (text, signal) => {
        if (walletRef.current.address !== address) throw new Error('This wallet session has ended.');
        const result = await walletRef.current.signActionMessage(text, signal);
        return verifiedSignature(text, address, result);
      },
    });
    previous.current = { key, controller: next };
    setController(null);
    let cancelled = false;
    void cleanup.catch(() => false).then(() => {
      if (cancelled) return;
      setController(next);
      void next.restore();
    });
    return () => { cancelled = true; next.dispose(); };
  }, [account, address, network, key, revision]);

  const snapshot = useSyncExternalStore(controller?.subscribe ?? subscribeEmpty, controller?.getSnapshot ?? getEmpty, getEmpty);
  // Account transitions must hide the old list even before effects run.
  const state = previous.current?.key === key ? snapshot : empty;
  useEffect(() => {
    const listener = AppState.addEventListener('change', (status) => {
      if (status === 'active' && controller?.getSnapshot().authenticated) void controller.refresh();
    });
    return () => listener.remove();
  }, [controller]);
  const needsRefresh = state.authenticated && state.items.some((item) => ['redeeming', 'needs_review'].includes(item.status));
  useEffect(() => {
    if (!needsRefresh) return;
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') void controller?.refresh();
    }, 30_000);
    return () => clearInterval(timer);
  }, [controller, needsRefresh]);
  return {
    ...state, configured: !!config.origin, configurationError: config.error,
    walletBusy: wallet.busy !== null,
    signIn: () => controller?.signIn(), refresh: () => controller?.refresh(),
    redeem: async (id: string) => {
      await controller?.redeem(id);
      if (walletRef.current.address === address && controller?.getSnapshot().items.some((item) => item.id === id && item.status === 'redeemed')) {
        void walletRef.current.refresh();
      }
    },
    endSession: async () => {
      try {
        if (previous.current) return await previous.current.controller.endSession();
        // Logout can happen before WaaP has restored its Stellar address.
        if (!config.origin) return true;
        const storage = disbursementSessionStorage(config.origin, network);
        const saved = await storage.read();
        await storage.clear();
        if (!saved) return true;
        try {
          await createDisbursementApi(config.origin)('/api/session/stellar', { method: 'DELETE', cookie: saved.cookie });
          return true;
        } catch { return false; }
      } finally {
        // If wallet logout fails, the still-connected account can sign in again.
        setRevision((value) => value + 1);
      }
    },
  };
}
const Context = createContext<ReturnType<typeof useDisbursementState> | null>(null);
export function StellarDisbursementsProvider({ children }: { children: ReactNode }) {
  return <Context.Provider value={useDisbursementState()}>{children}</Context.Provider>;
}
export function useStellarDisbursements() {
  const context = useContext(Context);
  if (!context) throw new Error('StellarDisbursementsProvider is required');
  return context;
}
