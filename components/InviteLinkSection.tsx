import { formatDistanceToNow } from "date-fns";
import * as Clipboard from "expo-clipboard";
import React, { useState } from "react";

import { Button } from "@/components/ui/button";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import en from "@/content/en";
import { useDemoMode } from "@/contexts/DemoContext";
import { useToast } from "@/hooks/useToast";
import { INVITE_TTL_SECONDS } from "@/lib/constants";
import { DeviceInfo } from "@/lib/database/types";
import { generateDemoInviteLink } from "@/lib/demo-data";
import { createNetworkInviteTypedData, generateNonce } from "@/lib/eip712";
import { createInvite } from "@/lib/relayId/api";
import { getAuditDeviceInfo } from "@/lib/utils/device-info";
import { marshalTypedData } from "@/lib/utils/serialize";
import { shareViaWhatsApp } from "@/lib/utils/whatsapp-share";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

interface InviteLinkSectionProps {
  disabled?: boolean;
}

export function InviteLinkSection({ disabled }: InviteLinkSectionProps) {
  const { isDemoMode, account, chainId, provider } = useDemoMode();
  const toast = useToast();
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);
  const [inviteLink, setInviteLink] = useState<string>("");

  const handleGenerateInvite = async () => {
    if (!account && !isDemoMode) return;
    if (!chainId && !isDemoMode) return;

    setIsGeneratingInvite(true);

    // Demo mode: generate fake invite link
    if (isDemoMode) {
      try {
        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const demoLink = generateDemoInviteLink();
        setInviteLink(demoLink);

        toast.show({
          title: "Demo: Invite Link Generated!",
          description:
            "This is a demo invite link. You can copy or share it to see how the flow works.",
          action: "success",
          duration: 4000,
        });
      } catch (error) {
        console.error("Demo error:", error);
        toast.show({
          title: "Demo Error",
          description: "Failed to generate demo invite link",
          action: "error",
        });
      } finally {
        setIsGeneratingInvite(false);
      }
      return;
    }

    // Type guards: we've already checked these above, but TypeScript needs help
    if (!account || !chainId || !provider) {
      toast.show({
        title: "Error",
        description: "Please connect your wallet first",
        action: "error",
      });
      setIsGeneratingInvite(false);
      return;
    }

    try {
      const nonce = generateNonce();
      const typedData = createNetworkInviteTypedData({
        inviterAddress: account,
        nonce,
        chainId,
      });

      const signature = await provider.request({
        method: "'eth_signTypedData_v4'",
        params: [account, JSON.stringify(typedData)],
      }) as string;

      
      // Get client request info for audit logging
      const deviceInfo = getAuditDeviceInfo();

      // Type assertion: getAuditDeviceInfo returns Partial<DeviceInfo> but the API accepts it
      // The schema uses z.custom<DeviceInfo>() which is permissive
      const deviceInfoForApi = deviceInfo as DeviceInfo;

      // Use RelayID API to create invite
      const result = await createInvite({
        inviterAddress: account,
        signature,
        nonce,
        typedData: marshalTypedData(typedData),
        deviceInfo: deviceInfoForApi,
      });

      if ("error" in result) {
        throw new Error(result.error);
      }

      // Generate universal link that can open the app or fallback to web
      // Alternative: You could also generate QR codes for in-person sharing
      const link = `https://relayid.refunite.org/invite?code=${result.inviteCode}`;
      setInviteLink(link);
      toast.show({
        title: "Invite link generated!",
        description:
          "Send this link to the leader you want to add to the network",
        action: "success",
      });
    } catch (error) {
      console.error("Error generating invite:", error);
      toast.show({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to generate invite link",
        action: "error",
      });
    } finally {
      setIsGeneratingInvite(false);
    }
  };

  const handleCopyLink = async () => {
    if (!inviteLink) return;
    await Clipboard.setStringAsync(inviteLink);
    toast.show({
      title: isDemoMode ? "Demo: Copied!" : "Copied!",
      description: isDemoMode
        ? "Demo invite link copied to clipboard"
        : "Invite link copied to clipboard",
      action: "success",
    });
  };

  const handleShareWhatsApp = async () => {
    if (!inviteLink) return;

    if (isDemoMode) {
      toast.show({
        title: "Demo: WhatsApp Share",
        description:
          "This would share the invite link via WhatsApp. No actual message sent in demo mode.",
        action: "info",
        duration: 4000,
      });
      return;
    }

    await shareViaWhatsApp({
      type: "inviteLink",
      inviteLink,
    });
  };

  const inviteExpiryText = formatDistanceToNow(
    new Date(Date.now() + INVITE_TTL_SECONDS * 1000),
    {
      addSuffix: true,
    }
  );

  return (
    <VStack className="gap-6">
      {/* Primary Action */}
      <Button
        size="xl"
        className="w-full bg-blue-600 disabled:opacity-50"
        onPress={handleGenerateInvite}
        disabled={isGeneratingInvite || disabled || !!inviteLink}
      >
        <HStack className="items-center justify-center gap-3">
          {isGeneratingInvite ? (
            <MaterialIcons name="hourglass-empty" size={20} color="#ffffff" />
          ) : (
            <MaterialIcons name="link" size={20} color="#ffffff" />
          )}
          <Text className="text-white font-bold text-base">
            {isGeneratingInvite ? "Generating..." : "Generate Invite Link"}
          </Text>
        </HStack>
      </Button>

      {/* Secondary Actions */}
      {inviteLink && (
        <VStack className="gap-3">
          <HStack className="gap-3">
            <Button
              size="lg"
              variant="outline"
              className="flex-1 border-2 border-gray-300"
              onPress={handleCopyLink}
            >
              <HStack className="items-center justify-center gap-2">
                <MaterialIcons name="content-copy" size={16} color="#374151" />
                <Text className="text-gray-700 font-semibold">Copy</Text>
              </HStack>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="flex-1 border-2 border-green-300 bg-green-50"
              onPress={handleShareWhatsApp}
            >
              <HStack className="items-center justify-center gap-2">
                <MaterialIcons name="share" size={16} color="#059669" />
                <Text className="text-green-700 font-semibold">WhatsApp</Text>
              </HStack>
            </Button>
          </HStack>

          {/* Info Text */}
          <VStack className="gap-2 mt-2">
            <Text className="text-xs text-gray-500 text-center">
              {en.addPage.prompts.singleUseInvite}
            </Text>
            <Text className="text-xs text-gray-400 text-center">
              Expires {inviteExpiryText}
            </Text>
          </VStack>
        </VStack>
      )}
    </VStack>
  );
}
