import React, { useEffect, useState } from "react";
import { Pressable, TextInput } from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

import { QRScannerModal } from "@/components/QRScannerModal";
import { Box } from "@/components/ui/box";
import { Button } from "@/components/ui/button";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { useDemoMode } from "@/contexts/DemoContext";
import { useToast } from "@/hooks/useToast";
import { CHAIN_ID } from "@/lib/constants";
import { marshalTypedData } from "@/lib/utils/serialize";
import { isAddress } from "viem";

interface DirectOnboardingSectionProps {
  initialAddress?: string;
}

export function DirectOnboardingSection({
  initialAddress,
}: DirectOnboardingSectionProps) {
  const { account, isConnected, signTypedData } = useDemoMode();
  const toast = useToast();
  const [relayIdInput, setRelayIdInput] = useState(initialAddress || "");
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Update input when initialAddress changes (e.g., from deeplink)
  useEffect(() => {
    if (initialAddress) {
      setRelayIdInput(initialAddress);
    }
  }, [initialAddress]);

  const handleQRScan = () => {
    setShowQRScanner(true);
  };

  const handleQRScanResult = (scannedData: string) => {
    setRelayIdInput(scannedData);
    setShowQRScanner(false);
  };

  const handleAddMember = async () => {
    if (!relayIdInput.trim()) {
      toast.show({
        title: "Error",
        description: "Please enter a RelayID or scan a QR code",
        action: "error",
      });
      return;
    }

    const recipient = relayIdInput.trim();

    // Validate recipient address format
    if (!isAddress(recipient)) {
      toast.show({
        title: "Error",
        description:
          "Invalid RelayID format. Must be a valid Ethereum address (0x...)",
        action: "error",
      });
      return;
    }

    if (!isConnected || !account) {
      toast.show({
        title: "Error",
        description: "Please connect your wallet first",
        action: "error",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Import required functions
      const { createDirectOnboardTypedData, generateNonce } = await import(
        "@/lib/eip712"
      );
      const { onboardDirect } = await import("@/lib/relayId/api");
      const { getDeviceInfo } = await import("@/lib/device-info");

      const nonce = generateNonce();

      const typedData = createDirectOnboardTypedData({
        inviterAddress: account,
        recipient: recipient as `0x${string}`,
        nonce,
        chainId: CHAIN_ID,
      });

      const signature = await signTypedData(typedData);

      // Get device info
      const deviceInfo = getDeviceInfo();

      // Call onboardDirect API
      const result = await onboardDirect({
        recipient,
        typedData: marshalTypedData(typedData),
        signature,
        deviceInfo,
      });

      if ("error" in result) {
        toast.show({
          title: "Error",
          description: result.error,
          action: "error",
        });
        return;
      }

      toast.show({
        title: "Success!",
        description: `Member added successfully! Transaction: ${result.transactionHash}`,
        action: "success",
        duration: 5000,
      });
      setRelayIdInput("");
    } catch (error) {
      toast.show({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to add member",
        action: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <VStack className="gap-6">
      {/* Input Section */}
      <VStack className="gap-4">
        <Text className="text-sm text-gray-600 text-center">
          Enter their RelayID or scan their QR code
        </Text>

        <HStack className="items-center gap-3">
          <Box className="flex-1 bg-gray-50 px-4 py-4 rounded-xl border border-gray-200">
            <TextInput
              value={relayIdInput}
              onChangeText={setRelayIdInput}
              placeholder="0x... or scan QR code"
              className="text-base text-gray-800"
              multiline={false}
              editable={!isLoading}
              placeholderTextColor="#9ca3af"
            />
          </Box>
          <Pressable
            onPress={handleQRScan}
            className="p-4 rounded-xl bg-blue-100 border border-blue-200"
            disabled={isLoading}
          >
            <MaterialIcons
              name="qr-code-scanner"
              size={24}
              color={isLoading ? "#9ca3af" : "#3b82f6"}
            />
          </Pressable>
        </HStack>
      </VStack>

      {/* Primary Action */}
      <Button
        size="xl"
        className="w-full bg-blue-600 disabled:opacity-50"
        onPress={handleAddMember}
        disabled={isLoading || !relayIdInput.trim()}
      >
        <HStack className="items-center justify-center gap-3">
          {isLoading ? (
            <MaterialIcons name="hourglass-empty" size={20} color="#ffffff" />
          ) : (
            <MaterialIcons name="person-add" size={20} color="#ffffff" />
          )}
          <Text className="text-white font-bold text-base">
            {isLoading ? "Adding to Network..." : "Add to Network"}
          </Text>
        </HStack>
      </Button>

      {/* QR Scanner Modal */}
      <QRScannerModal
        visible={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onScan={handleQRScanResult}
      />
    </VStack>
  );
}
