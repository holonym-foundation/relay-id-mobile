# Stellar Tab — Setup & Feature Guide

## What the Stellar Tab Does

The **Stellar** tab connects your RelayID (Ethereum) wallet to a smart-contract wallet on Stellar. It uses the [Human-Wallet-On-Stellar](https://github.com/holonym-foundation/Human-Wallet-On-Stellar) backend, which handles transaction sponsorship (fee-bumping) so the user never needs to hold XLM to pay fees.

It is deployed on https://waap-on-stellar.up.railway.app/ and it leverages wallet backend deployed on https://stellar-wallet-backend.up.railway.app for transaction sponsorship.

### Sections

| Section | What it shows |
|---------|--------------|
| **Stellar Contract Wallet** | The Stellar contract address derived deterministically from your Ethereum address. If not yet deployed, shows the future address with a note that it will be auto-deployed on first disbursement. |
| **XLM Balance** | Native XLM balance of the contract wallet, read directly from the Soroban RPC ledger. Refresh button included. |
| **Disbursements** | List of XLM disbursements assigned to your address. Shows pending vs. redeemed totals. Each pending disbursement has a **Claim** button — tapping it prompts a `personal_sign` via WaaP and redeems on-chain. |
| **Vote: Chicken or Egg?** | Cast a vote on-chain via the Stellar vote contract. Selecting a choice and pressing **Submit Vote** triggers a two-step signing flow (sign auth hash via WaaP → backend fee-bumps and submits). The resulting transaction hash is displayed on success. |

### Disbursement Administration

Disbursement is administered at https://waap-on-stellar.up.railway.app/admin which is protected with simple username and password.

Beneficiaries are added with their ethereum addresses and deterministic Stellar smart contract wallets are deployed for them.

Then disbursements are created for beneficiaries. But tokens are not transferred.

Beneficiaries need to redeem from the RelayId mobile app.

### Vote Signing Flow

The contract-wallet tab delegates Soroban preparation and submission to the backend. The separate native tab below builds classic transactions locally with `@stellar/stellar-base`.

1. **Prepare** (`POST /api/wallet/execute { action: "prepare" }`) — the Next.js backend builds and simulates the Soroban contract-invocation transaction using the source account (`NEXT_PUBLIC_WALLET_SOURCE_PUBLIC_KEY`). Returns the computed `authHash` (SHA-256 of the Soroban auth preimage), the encoded auth entry, and the encoded transaction XDR.

2. **Sign** — the mobile wallet signs the string `"auth hash: <hex>"` via WaaP's `personal_sign` (ECDSA secp256k1, 65-byte `r || s || v` signature). The `v` byte is normalized from Ethereum's `27/28` convention to `0/1` by the backend.

3. **Submit** (`POST /api/wallet/execute { action: "submit" }`) — the backend:
   - Attaches the ECDSA signature to the Soroban auth entry.
   - Rebuilds the transaction with a fresh sequence number and re-simulates for resource fees.
   - Signs the assembled transaction with `WALLET_SOURCE_PRIVATE_KEY` (an ed25519 Stellar keypair) via `/api/wallet-backend/tx/sign`.
   - Sends the signed transaction to the external **wallet-backend** service (`WALLET_BACKEND_URL`) which wraps it in a fee-bump transaction via `/tx/create-fee-bump`.
   - Submits the fee-bump transaction directly to Horizon.

Claims use a separate route: the app signs `Redeem disbursement <id> for amount <amount> XLM` with `personal_sign` and sends `{ disbursementId, signature }` to `POST /api/wallet/redeem`.

---

## Configuring the Stellar Backend

The Stellar tab calls the **Human-Wallet-On-Stellar** Next.js server. You need to:

### 1. Set up the backend's `.env`

Create `.env.local` (or `.env`) inside the `Human-Wallet-On-Stellar` project directory:

Refer to the repo for the full list of environment variables.

### 2. Start the backend

```bash
cd /path/to/Human-Wallet-On-Stellar
pnpm install
pnpm dev        # starts on http://localhost:3000
```

### 3. Set the mobile app env var

In `relay-id-mobile/.env` (or `.env.local`):

```env
# URL where the Human-Wallet-On-Stellar backend is reachable from the device/simulator
EXPO_PUBLIC_STELLAR_API_URL=http://localhost:3000
```

`https://waap-on-stellar.up.railway.app`

## Stellar Native tab

The **Stellar** tab (the `(stellar-native)` route) uses WaaP's native Ed25519 Stellar account (`G…`). It shares the existing login and WebView through `getWaaPStellarProvider({ network })`. My RelayID and Stellar Native consume a single root-level Stellar wallet state, so tab navigation does not start another connection request. The wallet WebView mounts after SDK initialization to avoid attaching to a previous event bus after a React remount. It does not use the contract-wallet backend or move existing contract-wallet funds.

### Configuration

```env
# Optional; defaults to TESTNET. PUBLIC enables mainnet balance/message signing.
EXPO_PUBLIC_STELLAR_NATIVE_NETWORK=TESTNET
```

This network is independent of `EXPO_PUBLIC_CHAIN_ID` (Ethereum) and `EXPO_PUBLIC_WAAP_ENVIRONMENT` (wallet deployment). The pinned WaaP SDK already exports the native Stellar provider. The wallet deployment selected by the app must also support Stellar requests.

### Selecting WaaP staging

Native Stellar support is currently available on **WaaP staging only**. The
production wallet returns `Unknown method: stellar_connect`. Selecting Stellar
TESTNET alone does not switch the WaaP deployment.

Set these values in `.env.local`, then restart Metro and reload the app:

```env
EXPO_PUBLIC_WAAP_ENVIRONMENT=staging
EXPO_PUBLIC_STELLAR_NATIVE_NETWORK=TESTNET
```

This switches the shared WaaP wallet and sign-in for all tabs to staging. You may
need to sign in again because staging and production use separate web origins.
Remove `EXPO_PUBLIC_WAAP_WALLET_ORIGIN` if previously set: that override takes
precedence over the named environment.

An optional preview/local wallet can be selected with
`EXPO_PUBLIC_WAAP_WALLET_ORIGIN`. Use an origin without a path; HTTPS is required
except on loopback hosts. The iOS simulator can reach a running local wallet at
`http://127.0.0.1:3000`.

The initial session probe stays silent. **Connect Stellar wallet** explicitly
requests the address and surfaces unsupported-service errors rather than asking
the user to retry indefinitely.

### Features

- Native address with copy, XLM balance and manual refresh. Horizon 404 is shown as an account awaiting first funding, not a zero balance.
- **Get test XLM:** Friendbot creates an unfunded account on testnet. Never available on mainnet.
- **Disbursements:** sign in with the native Stellar account, list assigned XLM, and redeem pending payments. The RelayID web server sends treasury funds after verifying the signed message; no beneficiary transaction or fee is required.
- **Hidden signing demo:** the wallet helper can ask WaaP to sign `Hello Stellar!` using Stellar message signing. This is a demonstration, not a reusable backend authentication credential.
- **Hidden payment demo:** the wallet helper builds a one-stroop (`0.0000001` XLM) self-payment, with a fresh sequence, a 100-stroop fee and a three-minute validity window. WaaP signs the transaction envelope; the app checks that the body is unchanged and submits it to testnet Horizon.
- Submission and confirmation are separate states. An uncertain submission retains its transaction hash, exposes **Check status**, and prevents another send while pending. The explorer link uses the selected network.
- Logout/account changes clear the tab's data and abort network reads. Late signatures after logout or an action timeout are never broadcast. The session probe has a 30-second deadline; other actions have a two-minute deadline; individual HTTP reads have a 15-second deadline including the response body.

`index.js` installs the Buffer polyfill before Expo Router loads screens. Raw XDR bytes are rewrapped with `Buffer.from` before base64 encoding because Hermes can return a plain `Uint8Array` from a Buffer subarray.

### Current boundary

The original hidden **Stellar** tab retains the separate contract-wallet disbursement and voting flows. Native disbursements use the RelayID web app API described below. The native counter/contract demo is deferred: WaaP currently rejects Soroban authorization-entry signing and unsupported contract-invocation operations. The native tab does not present a payment or signed message as a contract call.

### Validation

```bash
npm test
npx tsc --noEmit
npx expo export --platform android
npx expo export --platform ios
```

Device smoke test:

1. Sign in normally and open **Stellar Native**; confirm the Testnet badge and native address.
2. Get test XLM if the account is new, then refresh the balance.
3. Follow the native disbursement acceptance steps below. The payment and greeting-signature demos are hidden from the screen.
4. Sign out and sign in with another account; confirm no previous address, signature or transaction remains.

Unit tests replace the native wallet bridge and HTTP responses. Bundle exports validate Metro/Hermes compatibility; they do not replace the device smoke test above.


### Native disbursements

- Server: the origin of `EXPO_PUBLIC_RELAYID_API_URL` (a trailing `/api` is removed). Override with `EXPO_PUBLIC_DISBURSEMENTS_API_URL=https://<relayid-web-host>` only when the web app is hosted separately. HTTPS required except loopback development. `EXPO_PUBLIC_STELLAR_API_URL` belongs to the old contract wallet and is not used here.
- Network: `EXPO_PUBLIC_STELLAR_NATIVE_NETWORK` selects the passphrase included in every signed action. It must match the web server's `NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE`.
- Auth: sign `StartStellarSession`, then `POST /api/session/stellar`. Store only the returned cookie, account and expiry in device-only Keychain/Keystore, scoped to server origin and network. Native HTTP cookies are disabled; requests explicitly send this cookie. No application bearer token is sent.
- Restart: validate the saved expiry/account and probe `GET /api/session/stellar` before listing. Expired/no-session responses return to the sign-in button. Logout/account changes abort active work, call `DELETE /api/session/stellar`, and clear local credentials even if the server is offline. An offline server session expires at its existing deadline.
- List: `GET /api/disbursements/mine`; retain amount strings exactly. Show assignment/receipt dates, status and network-correct transaction links. Refresh manually, on foregrounding, and every 30 seconds while processing or awaiting review.
- Redeem: freshly sign `RedeemDisbursement` for the beneficiary and UUID, then `POST /api/disbursements/redeem` with a 75-second HTTP deadline. All actions use a secure 128-bit nonce, decimal Unix seconds and the exact newline-delimited text from the server contract. WaaP applies SEP-53; the client verifies its returned signature locally before submitting.
- Concurrency: disbursement signing shares the existing wallet approval lock. Only pending rows from a successful list read can be redeemed. Every redeem response (including errors/timeouts) triggers a list refresh. A failed refresh disables redemption until a successful read. Unknown payment outcomes never trigger automatic POST retries. Only `expired_signature`/`replay` can retry once, using a new nonce and signature, and only after a fresh pending status for redemption.
- Tests: both published offline SEP-53 vectors, session restoration/storage isolation, logout races, expired sessions, duplicate approval attempts, all documented API errors and ambiguous payment responses.

Testnet acceptance: add the app's **G-address** as a beneficiary at the RelayID web app `/beneficiaries`, assign XLM, tap **Sign to see disbursements**, then **Redeem** and approve the corresponding message in WaaP. Confirm **Received** and open the transaction. A first disbursement to an unfunded account must be at least 1 XLM. Restart the app to verify session restoration, and sign out to verify credential removal.

The visible bottom tabs are ordered **My RelayID**, **Invite**, **Stellar**, **Help**. The signed session message still uses the exact server-contract statement (`Sign in to RelayID to see your disbursements.`); button wording does not change the signed payload.
