export const HATS_CONTRACT_ADDRESS =
  "0x3bc1A0Ad72417f2d411118085256fC53CBdDd137";
export const HSG_CONTRACT_ADDRESS =
  process.env.EXPO_PUBLIC_HSG_CONTRACT_ADDRESS;
export const HATS_TREE_ID = process.env.EXPO_PUBLIC_HATS_TREE_ID;
export const LEADER_HAT_ID = process.env.EXPO_PUBLIC_HATS_LEADER_ID;
export const LEADER_SAFE_ADDRESS =
  process.env.EXPO_PUBLIC_HATS_LEADER_SAFE_ACCOUNT;
export const INVITE_TTL_SECONDS = Number(
  process.env.EXPO_PUBLIC_INVITE_TTL_SECONDS || 86400
);
export const RELAYER_CONTRACT_ADDRESS =
  "0x85c93B4d068dbaB44D86006dfd6d52179534EB79";
// The chain RelayID lives on: the Hats tree is read here and invites are
// signed for it, whatever chain the wallet happens to be on.
export const CHAIN_ID = Number(process.env.EXPO_PUBLIC_CHAIN_ID || 11155111);
const WAAP_ENVIRONMENTS = ["development", "staging", "production"] as const;
export type WaaPEnvironment = (typeof WAAP_ENVIRONMENTS)[number];
export const WAAP_ENVIRONMENT: WaaPEnvironment = WAAP_ENVIRONMENTS.find(
  (env) => env === process.env.EXPO_PUBLIC_WAAP_ENVIRONMENT
) ?? "production";
// Optional Stellar-enabled preview/local deployment. The SDK validates the origin.
export const WAAP_WALLET_ORIGIN = process.env.EXPO_PUBLIC_WAAP_WALLET_ORIGIN || undefined;
export const PROJECT_ID = process.env.EXPO_PUBLIC_WC_PROJECT_ID;
export const RELAYID_API_URL = process.env.EXPO_PUBLIC_RELAYID_API_URL;
export const RELAYID_APP_API_TOKEN =
  process.env.EXPO_PUBLIC_RELAYID_APP_API_TOKEN;
export const STELLAR_API_URL =
  process.env.EXPO_PUBLIC_STELLAR_API_URL || "http://localhost:3000";
