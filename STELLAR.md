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

### Signing Flow (Vote & Claim)

The mobile app cannot run `@stellar/stellar-sdk` (Node.js-only), so all Stellar operations are proxied through the backend:

1. **Prepare** (`POST /api/wallet/execute { action: "prepare" }`) — the Next.js backend builds and simulates the Soroban contract-invocation transaction using the source account (`NEXT_PUBLIC_WALLET_SOURCE_PUBLIC_KEY`). Returns the computed `authHash` (SHA-256 of the Soroban auth preimage), the encoded auth entry, and the encoded transaction XDR.

2. **Sign** — the mobile wallet signs the string `"auth hash: <hex>"` via WaaP's `personal_sign` (ECDSA secp256k1, 65-byte `r || s || v` signature). The `v` byte is normalized from Ethereum's `27/28` convention to `0/1` by the backend.

3. **Submit** (`POST /api/wallet/execute { action: "submit" }`) — the backend:
   - Attaches the ECDSA signature to the Soroban auth entry.
   - Rebuilds the transaction with a fresh sequence number and re-simulates for resource fees.
   - Signs the assembled transaction with `WALLET_SOURCE_PRIVATE_KEY` (an ed25519 Stellar keypair) via `/api/wallet-backend/tx/sign`.
   - Sends the signed transaction to the external **wallet-backend** service (`WALLET_BACKEND_URL`) which wraps it in a fee-bump transaction via `/tx/create-fee-bump`.
   - Submits the fee-bump transaction directly to Horizon.


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