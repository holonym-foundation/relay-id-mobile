import en from "@/content/en";
import { Alert, Linking } from "react-native";

export type WhatsAppShareType = "requestOnboarding" | "inviteLink";

export interface WhatsAppShareOptions {
  type: WhatsAppShareType;
  address?: string;
  inviteLink?: string;
}

/**
 * Generates a deeplink URL for onboarding that opens the invite page with pre-filled address
 * Uses universal link format (https://relayid.refunite.org) which works even if app isn't installed
 * Falls back to custom scheme (relayidmobile://) for better app integration
 */
export const generateOnboardingDeeplink = (address: string): string => {
  // Use universal link format - works even if app isn't installed
  // The app.json configures this to open the app when installed
  const universalLink = `https://relayid.refunite.org/invite?address=${encodeURIComponent(
    address
  )}&tab=direct`;
  return universalLink;
};

/**
 * Google Play Store URL for the RelayID app
 */
export const GOOGLE_PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=org.refunite.relayid.app";

/**
 * Shares content via WhatsApp with proper fallback handling
 * @param options - Configuration for the WhatsApp share
 */
export const shareViaWhatsApp = async (
  options: WhatsAppShareOptions
): Promise<void> => {
  const { type, address, inviteLink } = options;

  let message = "";

  if (type === "requestOnboarding" && address) {
    // Generate deeplink that opens the invite page with pre-filled address
    const deeplink = generateOnboardingDeeplink(address);

    // Create message with deeplink and Play Store link
    message = `${en.share.requestOnboardingMessage}${address}\n\nAdd me via RelayID app:\n${deeplink}\n\nDownload RelayID:\n${GOOGLE_PLAY_STORE_URL}`;
  } else if (type === "inviteLink" && inviteLink) {
    message = `${en.share.inviteLinkMessage}${inviteLink}`;
  } else {
    throw new Error("Invalid WhatsApp share configuration");
  }

  const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;

  try {
    // Check if WhatsApp is installed
    const canOpen = await Linking.canOpenURL(whatsappUrl);

    if (canOpen) {
      await Linking.openURL(whatsappUrl);
    } else {
      // Fallback to web WhatsApp if app is not installed
      const webWhatsappUrl = `https://wa.me/?text=${encodeURIComponent(
        message
      )}`;
      await Linking.openURL(webWhatsappUrl);
    }
  } catch (error) {
    console.error("WhatsApp sharing error:", error);
    Alert.alert(
      "Error",
      "Unable to open WhatsApp. Please make sure WhatsApp is installed or try again later."
    );
  }
};
