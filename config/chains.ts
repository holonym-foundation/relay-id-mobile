import { celo, sepolia } from "viem/chains";

import { CHAIN_ID } from "@/lib/constants";

export const supportedChains = [sepolia, celo] as const;

export const appChain = supportedChains.find((chain) => chain.id === CHAIN_ID);
if (!appChain) {
  throw new Error(`EXPO_PUBLIC_CHAIN_ID ${CHAIN_ID} is not a supported chain`);
}
