import { Alert } from "react-native";

import { useDemoMode } from "@/contexts/DemoContext";
import { useToast } from "@/hooks/useToast";

/**
 * Hook that provides logout/disconnect functionality
 * Handles demo mode, connection disconnection, and error handling
 */
export function useLogout() {
  const { isDemoMode, toggleDemoMode, provider } = useDemoMode();
  const toast = useToast();

  const handleLogout = () => {
    Alert.alert(
      "Disconnect",
      "Are you sure you want to disconnect your wallet?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: async () => {
            // End demo mode if active
            if (isDemoMode) {
              toggleDemoMode();
            }

            try {
                await provider?.logout();
              toast.show({
                title: "Disconnected",
                description: "Your wallet has been disconnected.",
                action: "success",
              });
            } catch (error) {
              console.error("Disconnect wallet failed", error);
              toast.show({
                title: "Disconnect failed",
                description:
                  "We couldn't disconnect your wallet. Please try again.",
                action: "error",
              });
            }
          },
        },
      ]
    );
  };

  return { handleLogout };
}
