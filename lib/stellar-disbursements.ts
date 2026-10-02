import { hash, Keypair, StrKey } from '@stellar/stellar-base';
import { Buffer } from 'buffer';
import { z } from 'zod';

export type ActionMessage = { nonce: string; issuedAt: string } & (
  { account: string } | { beneficiary: string; disbursementId: string }
);

export function actionText(message: ActionMessage, passphrase: string) {
  const redeem = 'beneficiary' in message;
  return [
    'RelayID',
    redeem ? 'Redeem a disbursement into this Stellar account.' : 'Sign in to RelayID to see your disbursements.',
    `Action: ${redeem ? 'RedeemDisbursement' : 'StartStellarSession'}`,
    `Account: ${redeem ? message.beneficiary : message.account}`,
    ...(redeem ? [`Disbursement: ${message.disbursementId}`] : []),
    `Network: ${passphrase}`,
    `Nonce: ${message.nonce}`,
    `Issued at: ${message.issuedAt}`,
  ].join('\n');
}

// WaaP applies SEP-53 itself. Verify its response locally before authorizing an API action.
export function verifiedSignature(text: string, address: string, result: { signerAddress: string; signedMessage: string }) {
  if (result.signerAddress !== address) throw new Error('The wallet signed with a different Stellar account.');
  const encoded = result.signedMessage;
  const bytes = /^[a-f0-9]{128}$/i.test(encoded) ? Buffer.from(encoded, 'hex') :
    /^[A-Za-z0-9+/]{86}==$/.test(encoded) ? Buffer.from(encoded, 'base64') : null;
  if (!bytes || bytes.length !== 64 || !Keypair.fromPublicKey(address).verify(
    hash(Buffer.from(`Stellar Signed Message:\n${text}`, 'utf8')), bytes,
  )) throw new Error('The wallet returned an invalid Stellar message signature.');
  return bytes.toString('base64');
}

export function disbursementOrigin(value?: string) {
  if (!value) return null;
  const url = new URL(value);
  if (url.username || url.password || url.search || url.hash ||
    !['', '/', '/api', '/api/'].includes(url.pathname) ||
    (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))) {
    throw new Error('Configure the RelayID web app HTTPS origin for disbursements.');
  }
  return url.origin;
}

const addressSchema = z.string().refine((value) => StrKey.isValidEd25519PublicKey(value));
export const sessionSchema = z.object({ address: addressSchema, expiresAt: z.number().int().positive() });
export const storedSessionSchema = sessionSchema.extend({ cookie: z.string().regex(/^relayid_stellar_session=[A-Za-z0-9._~%+-]+$/) });
export type StoredSession = z.infer<typeof storedSessionSchema>;
const disbursementSchema = z.object({
  id: z.string().uuid(), beneficiary: addressSchema,
  amount: z.string().regex(/^\d+(\.\d{1,7})?$/),
  status: z.enum(['pending', 'redeeming', 'redeemed', 'needs_review', 'cancelled']),
  txHash: z.string().regex(/^[a-f0-9]{64}$/i).nullable(),
  createdAt: z.string().datetime(), redeemedAt: z.string().datetime().nullable(),
});
export type Disbursement = z.infer<typeof disbursementSchema>;
export const disbursementListSchema = z.object({ disbursements: z.array(disbursementSchema) });
export const redeemResultSchema = z.object({ disbursement: disbursementSchema });

export class DisbursementError extends Error {
  constructor(public code: string, public status = 0) {
    super(code);
    this.name = 'DisbursementError';
  }
}

export function disbursementErrorMessage(error: unknown) {
  if (!(error instanceof DisbursementError)) return error instanceof Error ? error.message : 'Unable to load disbursements. Please try again.';
  const messages: Record<string, string> = {
    invalid_request: 'We could not prepare this request. Please update the app and try again.',
    invalid_signature: 'The signature could not be verified. Check that the app and RelayID use the same Stellar network.',
    expired_signature: 'The signature expired. Check your device clock and try again.',
    replay: 'This signature was already used. Please try again to sign a fresh message.',
    no_session: 'Sign in again to see your disbursements.',
    not_beneficiary: 'This account has no disbursements.',
    disbursement_not_found: 'This disbursement is no longer available. The list has been refreshed.',
    not_redeemable: 'This disbursement is no longer ready to redeem. Check its latest status.',
    payment_failed: 'Payment failed, try again.',
    payment_unconfirmed: 'Payment sent, waiting for confirmation.',
    network_error: 'Connection interrupted. Refresh the list to check the payment status before trying again.',
    invalid_response: 'RelayID returned an unexpected response. Please try again later.',
  };
  return messages[error.code] ?? 'RelayID is unavailable. Please try again later.';
}

export type ApiRequest = (path: string, options?: {
  method?: string; body?: unknown; cookie?: string; signal?: AbortSignal;
}) => Promise<{ data: unknown; cookie: string | null }>;

export function createDisbursementApi(origin: string): ApiRequest {
  return async (path, options = {}) => {
    const controller = new AbortController();
    const abort = () => controller.abort();
    options.signal?.addEventListener('abort', abort, { once: true });
    if (options.signal?.aborted) abort();
    const timer = setTimeout(abort, path === '/api/disbursements/redeem' ? 75_000 : 15_000);
    try {
      const response = await fetch(`${origin}${path}`, {
        method: options.method ?? 'GET', signal: controller.signal,
        // Native cookie storage is deliberately bypassed: the scoped cookie lives in Keychain.
        credentials: 'omit', redirect: 'error', cache: 'no-store',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'Cache-Control': 'no-cache',
          ...(options.cookie ? { Cookie: options.cookie } : {}) },
        ...(options.body ? { body: JSON.stringify(options.body) } : {}),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const code = typeof data?.code === 'string' ? data.code :
          response.status === 401 && path === '/api/session/stellar' && !options.body ? 'no_session' : 'server_error';
        if (code === 'invalid_request' || code === 'invalid_signature') {
          console.error('RelayID disbursement request rejected', { code, status: response.status, path });
        }
        throw new DisbursementError(code, response.status);
      }
      const token = response.headers.get('set-cookie')?.match(/(?:^|,\s*)relayid_stellar_session=([A-Za-z0-9._~%+-]+)(?:;|$)/)?.[1];
      return { data, cookie: token ? `relayid_stellar_session=${token}` : null };
    } catch (error) {
      if (error instanceof DisbursementError) throw error;
      throw new DisbursementError('network_error');
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener('abort', abort);
    }
  };
}
