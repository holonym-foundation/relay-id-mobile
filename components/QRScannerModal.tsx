import { CameraView, useCameraPermissions } from "expo-camera";
import React, { useState } from "react";
import { Modal, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

import { Box } from "@/components/ui/box";
import { Button } from "@/components/ui/button";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

interface QRScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScan: (data: string) => void;
}

export function QRScannerModal({
  visible,
  onClose,
  onScan,
}: QRScannerModalProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  const handleBarcodeScanned = ({
    type,
    data,
  }: {
    type: string;
    data: string;
  }) => {
    if (scanned) return;

    setScanned(true);

    try {
      // Try to parse as JSON first (for structured QR codes)
      const parsedData = JSON.parse(data);
      if (parsedData.type === "relayId" && parsedData.address) {
        onScan(parsedData.address);
      } else {
        // If it's JSON but not a relayId, use the raw data
        onScan(data);
      }
    } catch {
      // If it's not JSON, treat as plain text (likely just an address)
      onScan(data);
    }

    onClose();
  };

  const resetScanner = () => {
    setScanned(false);
  };

  if (!permission) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView className="flex-1 bg-white">
          <VStack className="flex-1 items-center justify-center px-6">
            <Text className="text-lg text-gray-600">
              Requesting camera permission...
            </Text>
          </VStack>
        </SafeAreaView>
      </Modal>
    );
  }

  if (!permission.granted) {
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
              <Text className="text-lg font-semibold text-gray-900">
                QR Scanner
              </Text>
              <Pressable onPress={onClose}>
                <MaterialIcons name="close" size={24} color="#374151" />
              </Pressable>
            </HStack>

            {/* Modal Content */}
            <VStack className="flex-1 items-center justify-center px-6">
              <VStack className="items-center gap-4">
                <MaterialIcons name="camera-alt" size={64} color="#ef4444" />
                <Text className="text-lg font-semibold text-gray-900 text-center">
                  Camera Permission Required
                </Text>
                <Text className="text-base text-gray-600 text-center">
                  Please enable camera access in your device settings to scan QR
                  codes.
                </Text>
              </VStack>
            </VStack>

            {/* Modal Footer */}
            <Box className="px-6 py-4 border-t border-gray-200">
              <VStack className="gap-4">
                <Button
                  className="w-full bg-blue-600"
                  onPress={requestPermission}
                >
                  <Text className="text-white font-semibold text-base">
                    Grant Permission
                  </Text>
                </Button>
                <Button className="w-full bg-gray-600" onPress={onClose}>
                  <Text className="text-white font-semibold text-base">
                    Close
                  </Text>
                </Button>
              </VStack>
            </Box>
          </VStack>
        </SafeAreaView>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView className="flex-1 bg-black">
        <VStack className="flex-1">
          {/* Scanner Header */}
          <HStack className="items-center justify-between px-6 py-4 bg-black/80">
            <Text className="text-lg font-semibold text-white">
              Scan QR Code
            </Text>
            <Pressable onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#ffffff" />
            </Pressable>
          </HStack>

          {/* Camera View */}
          <Box className="flex-1">
            <CameraView
              onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
              style={StyleSheet.absoluteFillObject}
              barcodeScannerSettings={{
                barcodeTypes: ["qr"],
              }}
            />

            {/* Scanning Overlay */}
            <Box className="absolute inset-0 items-center justify-center">
              <Box className="w-64 h-64 border-2 border-white rounded-lg opacity-50" />
            </Box>
          </Box>

          {/* Scanner Footer */}
          <Box className="px-6 py-4 bg-black/80">
            <VStack className="gap-4">
              <Text className="text-white text-center text-base">
                Position the QR code within the frame
              </Text>

              {scanned && (
                <Button className="w-full bg-blue-600" onPress={resetScanner}>
                  <Text className="text-white font-semibold text-base">
                    Scan Again
                  </Text>
                </Button>
              )}
            </VStack>
          </Box>
        </VStack>
      </SafeAreaView>
    </Modal>
  );
}
