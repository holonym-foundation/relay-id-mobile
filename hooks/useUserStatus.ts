import { useDemoMode } from "@/contexts/DemoContext";
import { useIsWearerOfHat } from "@/hooks/useIsWearerOfHat";
import { DEMO_DATA } from "@/lib/demo-data";

/**
 * Hook that combines user account status, hat status, and demo mode
 * Provides computed display values and status flags for UI rendering
 */
export function useUserStatus() {
  const { isDemoMode, account, chainId, isConnected } = useDemoMode();
  const {
    isLoading: isHatLoading,
    error: isHatError,
    hasHat,
  } = useIsWearerOfHat();

  // Display values that respect demo mode
  const displayAddress = isDemoMode ? DEMO_DATA.userAddress : account;
  const displayIsConnected = isDemoMode || isConnected;
  // Only consider hasHat as true if it's explicitly true (not undefined)
  // This ensures we don't show "onboarded" state when the query hasn't completed
  const displayHasHat = isDemoMode ? DEMO_DATA.hasHat : hasHat === true;
  const displayChainId = isDemoMode ? 11155111 : chainId;

  // Check if we're still waiting for a definitive answer about hat status
  // Only show loading if we're connected, have address/chainId, but haven't gotten a result yet
  const isWaitingForHatStatus =
    !isDemoMode &&
    isConnected &&
    !!account &&
    !!chainId &&
    (isHatLoading || hasHat === undefined);

  return {
    // Raw values
    account,
    isConnected,
    chainId,
    hasHat,
    isHatLoading,
    isHatError,
    isDemoMode,

    // Display values (respect demo mode)
    displayAddress,
    displayIsConnected,
    displayHasHat,
    displayChainId,

    // Computed status flags
    isWaitingForHatStatus,
  };
}
