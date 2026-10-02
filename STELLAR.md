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

The **Stellar Native** tab uses WaaP's native Ed25519 Stellar account (`G…`). It shares the existing login and WebView through `getWaaPStellarProvider({ network })`. It does not use the contract-wallet backend or move existing contract-wallet funds.

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
- **Sign message:** asks WaaP to sign a fixed ownership-demo message using Stellar message signing. This is a demonstration, not a reusable backend authentication credential.
- **Send test payment:** builds a one-stroop (`0.0000001` XLM) self-payment, with a fresh sequence, a 100-stroop fee and a three-minute validity window. WaaP signs the transaction envelope; the app checks that the body is unchanged and submits it to testnet Horizon.
- Submission and confirmation are separate states. An uncertain submission retains its transaction hash, exposes **Check status**, and prevents another send while pending. The explorer link uses the selected network.
- Logout/account changes clear the tab's data and abort network reads. Late signatures after logout or an action timeout are never broadcast. The ownership probe has a 30-second deadline; other actions have a two-minute deadline; individual HTTP reads have a 15-second deadline including the response body.

`index.js` installs the Buffer polyfill before Expo Router loads screens. Raw XDR bytes are rewrapped with `Buffer.from` before base64 encoding because Hermes can return a plain `Uint8Array` from a Buffer subarray.

### Current boundary

The original **Stellar** tab retains disbursements and voting. Native disbursements require backend enrollment and Stellar-signature verification. The native counter/contract demo is deferred: WaaP currently rejects Soroban authorization-entry signing and unsupported contract-invocation operations. The native tab does not present a payment or signed message as a contract call.

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
3. Sign the ownership message and inspect the returned signature.
4. Send the test payment; review the source, destination, amount and network in WaaP. Check confirmation and open the explorer link.
5. Sign out and sign in with another account; confirm no previous address, signature or transaction remains.

Unit tests replace the native wallet bridge and HTTP responses. Bundle exports validate Metro/Hermes compatibility; they do not replace the device smoke test above.
