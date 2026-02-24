import React from "react";
import { Modal, Pressable, ScrollView } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { SafeAreaView } from "react-native-safe-area-context";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

import { Box } from "@/components/ui/box";
import { Button } from "@/components/ui/button";
import { Center } from "@/components/ui/center";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import en from "@/content/en";

interface QRCodeModalProps {
  visible: boolean;
  onClose: () => void;
  address: string;
  chainId: number;
}

export function QRCodeModal({
  visible,
  onClose,
  address,
  chainId,
}: QRCodeModalProps) {
  // Create the QR code data with both address and chainId
  const qrData = JSON.stringify({
    address,
    chainId,
    type: "relayId",
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView className="flex-1 bg-white">
        <VStack className="flex-1">
          {/* Modal Header */}
          <HStack className="items-center justify-between px-6 py-4 border-b border-gray-200">
            <Text className="text-lg font-semibold text-gray-900">QR Code</Text>
            <Pressable onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#374151" />
            </Pressable>
          </HStack>

          {/* Modal Content */}
          <ScrollView className="flex-1 px-6 py-6">
            <VStack className="gap-6">
              <Text className="text-base text-gray-600 text-center">
                {en.qrCodeDialog.showQrInstruction}
              </Text>

              {/* QR Code Display */}
              <Center className="py-8">
                <Box className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                  <QRCode
                    value={qrData}
                    size={200}
                    color="#000000"
                    backgroundColor="#ffffff"
                    logoSize={30}
                    logoMargin={2}
                    logoBorderRadius={15}
                    quietZone={10}
                  />
                </Box>
              </Center>

              {/* Address Display */}
              <Box className="bg-gray-50 px-4 py-4 rounded-lg border border-gray-200">
                <VStack className="gap-2">
                  <Text className="text-sm font-medium text-gray-700">
                    Your RelayID
                  </Text>
                  <Text className="text-sm font-mono text-gray-800 break-all">
                    {address}
                  </Text>
                </VStack>
              </Box>
            </VStack>
          </ScrollView>

          {/* Modal Footer */}
          <Box className="px-6 py-4 border-t border-gray-200">
            <Button className="w-full bg-blue-600" onPress={onClose}>
              <Text className="text-white font-semibold text-base">Close</Text>
            </Button>
          </Box>
        </VStack>
      </SafeAreaView>
    </Modal>
  );
}
