import { useDemoMode } from "@/contexts/DemoContext";
import { HATS_CONTRACT_ADDRESS, LEADER_HAT_ID } from "@/lib/constants";
import { abi as HatsAbi } from "@/lib/hatsAbi";
import { useEffect, useState } from "react";

export function useIsWearerOfHat() {
  const { account, publicClient } = useDemoMode();
  const [hasHat, setHasHat] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!account || !publicClient || !LEADER_HAT_ID) {
      setHasHat(false);
      setIsLoading(false);
      return;
    }

    const readContract = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await publicClient.readContract({
          address: HATS_CONTRACT_ADDRESS,
          abi: HatsAbi,
          functionName: "isWearerOfHat",
          args: [account, BigInt(LEADER_HAT_ID || "0")],
        });

        setHasHat(result as boolean);
      } catch (err) {
        setError(err as Error);
        setHasHat(false);
      } finally {
        setIsLoading(false);
      }
    };

    readContract();
  }, [account, publicClient]);

  return {
    hasHat,
    isLoading,
    error,
    isConnected: !!account,
  };
}
