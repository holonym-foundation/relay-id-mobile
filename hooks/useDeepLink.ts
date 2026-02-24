import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Linking } from "react-native";

export interface InviteLinkData {
  code: string;
  type: "invite";
}

export interface OnboardingLinkData {
  address: string;
  type: "onboarding";
}

export function useDeepLink() {
  const router = useRouter();
  const [inviteData, setInviteData] = useState<InviteLinkData | null>(null);
  const [onboardingData, setOnboardingData] =
    useState<OnboardingLinkData | null>(null);

  useEffect(() => {
    // Handle initial URL (when app is opened from a link)
    const handleInitialURL = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        handleDeepLink(initialUrl);
      }
    };

    // Handle URL changes (when app is already running)
    const handleUrlChange = (event: { url: string }) => {
      handleDeepLink(event.url);
    };

    const handleDeepLink = (url: string) => {
      console.log("Deep link received:", url);

      try {
        const urlObj = new URL(url);

        // Handle invite links with code (standalone invite page)
        if (urlObj.pathname === "/invite" && urlObj.searchParams.has("code")) {
          const code = urlObj.searchParams.get("code");
          if (code) {
            setInviteData({ code, type: "invite" });
            // Navigate to standalone invite page with the code
            router.push(`/invite?code=${code}`);
          }
        }
        // Handle onboarding links with address (for direct onboarding in tabs)
        else if (
          urlObj.pathname === "/invite" &&
          urlObj.searchParams.has("address")
        ) {
          const address = urlObj.searchParams.get("address");
          const tab = urlObj.searchParams.get("tab") || "direct";
          if (address) {
            setOnboardingData({ address, type: "onboarding" });
            // Navigate to invite page in tabs with address parameter and direct tab
            router.push(
              `/(tabs)/(invite)?address=${encodeURIComponent(
                address
              )}&tab=${tab}`
            );
          }
        }
      } catch (error) {
        console.error("Error parsing deep link:", error);
      }
    };

    // Set up listeners
    const subscription = Linking.addEventListener("url", handleUrlChange);

    // Handle initial URL
    handleInitialURL();

    // Cleanup
    return () => {
      subscription?.remove();
    };
  }, [router]);

  return {
    inviteData,
    onboardingData,
    clearInviteData: () => setInviteData(null),
    clearOnboardingData: () => setOnboardingData(null),
  };
}
