import {
  Account,
  Asset,
  Memo,
  Networks,
  Operation,
  StrKey,
  TransactionBuilder,
} from '@stellar/stellar-base';
import { Buffer } from 'buffer';

export type NativeStellarNetwork = 'TESTNET' | 'PUBLIC';
export type StellarBalance = { exists: boolean; balance: string | null };
export type StellarTransactionStatus = 'pending' | 'confirmed' | 'failed';

export function parseStellarNetwork(value?: string): NativeStellarNetwork {
  if (!value || value === 'TESTNET') return 'TESTNET';
  if (value === 'PUBLIC') return 'PUBLIC';
  throw new Error('EXPO_PUBLIC_STELLAR_NATIVE_NETWORK must be TESTNET or PUBLIC');
}

export const STELLAR_NATIVE_NETWORK = parseStellarNetwork(
  process.env.EXPO_PUBLIC_STELLAR_NATIVE_NETWORK,
);

export const horizonUrl = (network: NativeStellarNetwork) =>
  network === 'TESTNET'
    ? 'https://horizon-testnet.stellar.org'
    : 'https://horizon.stellar.org';

export const networkPassphrase = (network: NativeStellarNetwork) =>
  network === 'TESTNET' ? Networks.TESTNET : Networks.PUBLIC;

export const transactionUrl = (network: NativeStellarNetwork, hash: string) => {
  if (!/^[a-f0-9]{64}$/i.test(hash)) throw new Error('Invalid transaction hash');
  return `https://stellar.expert/explorer/${network === 'TESTNET' ? 'testnet' : 'public'}/tx/${hash}`;
};

function assertAddress(address: string) {
  if (!StrKey.isValidEd25519PublicKey(address)) {
    throw new Error('The wallet returned an invalid Stellar account address');
  }
}

/** All network reads are bounded and can be cancelled on logout/unmount. */
async function request(url: string, signal?: AbortSignal, init?: RequestInit): Promise<{
  ok: boolean; status: number; data: unknown;
}> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort', abort);
  const timer = setTimeout(abort, 15_000);
  try {
    const response = await fetch(url, {
      headers: { accept: 'application/json' },
      ...init,
      signal: controller.signal,
    });
    const data: unknown = response.ok ? await response.json() : null;
    return { ok: response.ok, status: response.status, data };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}

export async function fetchStellarBalance(
  address: string,
  network: NativeStellarNetwork,
  signal?: AbortSignal,
): Promise<StellarBalance> {
  assertAddress(address);
  const response = await request(`${horizonUrl(network)}/accounts/${address}`, signal);
  if (response.status === 404) return { exists: false, balance: null };
  if (!response.ok) throw new Error(`Unable to read the Stellar balance (${response.status})`);
  const data = response.data as { balances?: { asset_type: string; balance: unknown }[] };
  const balance = Array.isArray(data?.balances)
    ? data.balances.find((item) => item.asset_type === 'native')?.balance
    : undefined;
  if (typeof balance !== 'string' || !/^\d+(\.\d{1,7})?$/.test(balance)) {
    throw new Error('Stellar returned an invalid balance');
  }
  return { exists: true, balance };
}

export async function fundStellarTestAccount(
  address: string,
  network: NativeStellarNetwork,
  signal?: AbortSignal,
): Promise<void> {
  if (network !== 'TESTNET') throw new Error('Test funding is only available on Stellar testnet');
  assertAddress(address);
  const response = await request(`https://friendbot.stellar.org?addr=${address}`, signal);
  if (!response.ok) {
    throw new Error('Test funding was unavailable. Refresh your balance before trying again.');
  }
}

/** A one-stroop self-payment exercises native signing without another recipient. */
export async function buildStellarTestPayment(
  address: string,
  network: NativeStellarNetwork,
  signal?: AbortSignal,
): Promise<string> {
  if (network !== 'TESTNET') throw new Error('The test payment is only available on Stellar testnet');
  assertAddress(address);
  const response = await request(`${horizonUrl(network)}/accounts/${address}`, signal);
  if (response.status === 404) throw new Error('Get test XLM to create your account first');
  if (!response.ok) throw new Error(`Unable to prepare the payment (${response.status})`);
  const { sequence } = (response.data ?? {}) as { sequence?: unknown };
  if (typeof sequence !== 'string' || !/^\d+$/.test(sequence)) {
    throw new Error('Stellar returned an invalid account sequence');
  }
  const transaction = new TransactionBuilder(new Account(address, sequence), {
    fee: '100',
    networkPassphrase: networkPassphrase(network),
  })
    .addOperation(Operation.payment({
      destination: address,
      asset: Asset.native(),
      amount: '0.0000001',
    }))
    .addMemo(Memo.text('RelayID native test'))
    .setTimeout(180)
    .build();
  // Hermes can return Uint8Array from Buffer.subarray(). Rewrap the raw XDR
  // instead of relying on its toString('base64') implementation.
  return Buffer.from(transaction.toEnvelope().toXDR('raw')).toString('base64');
}

export function signedTransactionHash(xdr: string, network: NativeStellarNetwork): string {
  const transaction = TransactionBuilder.fromXDR(xdr, networkPassphrase(network));
  return Buffer.from(transaction.hash()).toString('hex');
}

export async function submitStellarTestPayment(
  signedXdr: string,
  network: NativeStellarNetwork,
  signal?: AbortSignal,
): Promise<void> {
  if (network !== 'TESTNET') throw new Error('The test payment is only available on Stellar testnet');
  const response = await request(`${horizonUrl(network)}/transactions`, signal, {
    method: 'POST',
    headers: { accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `tx=${encodeURIComponent(signedXdr)}`,
  });
  if (!response.ok) throw new Error(`Stellar could not confirm submission (${response.status}). Check the transaction status before trying again.`);
}

export async function fetchStellarTransactionStatus(
  hash: string,
  network: NativeStellarNetwork,
  signal?: AbortSignal,
): Promise<StellarTransactionStatus> {
  transactionUrl(network, hash); // Validate before putting the hash in a URL.
  const response = await request(`${horizonUrl(network)}/transactions/${hash}`, signal);
  if (response.status === 404) return 'pending';
  if (!response.ok) throw new Error(`Unable to check the transaction (${response.status})`);
  const data = response.data as { successful?: boolean };
  if (data.successful === true) return 'confirmed';
  if (data.successful === false) return 'failed';
  throw new Error('Stellar returned an unknown transaction status');
}
