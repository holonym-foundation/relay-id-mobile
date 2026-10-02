import Feather from "@expo/vector-icons/Feather";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import React from "react";
import { Image, Modal, Pressable } from "react-native";

import { Box } from "@/components/ui/box";
import { Button } from "@/components/ui/button";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { useDemoMode } from "@/contexts/DemoContext";
import { useLogout } from "@/hooks/useLogout";
import { useNativeStellarWallet } from "@/hooks/useNativeStellarWallet";
import { useToast } from "@/hooks/useToast";

export function AppHeader() {
  const router = useRouter();
  const { isDemoMode, account, isConnected } = useDemoMode();
  const toast = useToast();
  const { address: stellarAddress, busy } = useNativeStellarWallet();
  const [showSettingsMenu, setShowSettingsMenu] = React.useState(false);
  const { handleLogout } = useLogout();

  const handleCopyStellarAddress = async () => {
    if (!stellarAddress) return;
    try {
      await Clipboard.setStringAsync(stellarAddress);
      toast.show({
        title: "Copied!",
        description: "Stellar address copied to clipboard",
        action: "success",
      });
    } catch {
      toast.show({ title: "Unable to copy Stellar address", action: "error" });
    }
  };

  const handleFeedbackPress = () => {
    setShowSettingsMenu(false);
    router.push("/(tabs)/feedback");
  };

  const handleDisconnect = () => {
    setShowSettingsMenu(false);
    handleLogout();
  };

  return (
    <>
      <Box className="bg-white border-b border-gray-200 px-4 py-2 sticky top-0 z-10">
        <VStack className="gap-2">
          <HStack className="items-center justify-between">
            {/* Left section - Logo */}
            <Box className="flex-1">
              <Image
                source={require("@/assets/images/relay-id-logo-splash.png")}
                className="w-20 h-12"
                resizeMode="contain"
              />
            </Box>

            {/* Right section - Settings menu button */}
            {isConnected && account && (
              <Box className="flex-1 items-end">
                <Pressable
                  onPress={() => setShowSettingsMenu(true)}
                  className="p-2 rounded-lg bg-gray-100"
                >
                  <MaterialIcons name="settings" size={20} color="#374151" />
                </Pressable>
              </Box>
            )}
          </HStack>

          {/* Demo Mode Indicator */}
          {isDemoMode && (
            <Box className="bg-gradient-to-r from-orange-500 to-purple-600 px-2 py-1 rounded-md">
              <HStack className="items-center justify-center gap-2">
                <MaterialIcons name="visibility" size={16} color="#ffffff" />
                <Text className="text-white font-bold text-sm">
                  DEMO MODE - All data is simulated
                </Text>
              </HStack>
            </Box>
          )}
        </VStack>
      </Box>

      {/* Settings Menu Modal */}
      <Modal
        visible={showSettingsMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSettingsMenu(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-end"
          onPress={() => setShowSettingsMenu(false)}
        >
          <Box className="bg-white rounded-t-3xl p-6">
            <VStack className="gap-4">
              {/* Account Section */}
              <VStack className="gap-3">
                <Text className="text-lg font-semibold text-gray-900">
                  Account
                </Text>
                <HStack className="items-center justify-between bg-gray-50 px-4 py-3 rounded-lg">
                  <VStack className="flex-1">
                    <Text className="text-sm font-medium text-gray-700">
                      Your Stellar address
                    </Text>
                    <Text className="text-sm font-mono text-gray-600">
                      {stellarAddress
                        ? `${stellarAddress.slice(0, 10)}...${stellarAddress.slice(-8)}`
                        : busy ? "Loading Stellar address…" : "Stellar address not available"}
                    </Text>
                  </VStack>
                  <Pressable
                    onPress={handleCopyStellarAddress}
                    disabled={!stellarAddress}
                    accessibilityLabel="Copy Stellar address"
                    accessibilityState={{ disabled: !stellarAddress }}
                    className="p-2 rounded-lg bg-white border border-gray-200"
                  >
                    <Feather name="copy" size={16} color="#6b7280" />
                  </Pressable>
                </HStack>
              </VStack>

              {/* Actions Section */}
              <VStack className="gap-3">
                <Text className="text-lg font-semibold text-gray-900">
                  Actions
                </Text>

                <Button
                  variant="outline"
                  className="w-full border-gray-300"
                  onPress={handleFeedbackPress}
                >
                  <HStack className="items-center justify-center gap-3">
                    <MaterialIcons name="feedback" size={20} color="#374151" />
                    <Text className="text-gray-700 font-medium">
                      Give Feedback
                    </Text>
                  </HStack>
                </Button>

                <Button
                  variant="outline"
                  className="w-full border-red-300"
                  onPress={handleDisconnect}
                >
                  <HStack className="items-center justify-center gap-3">
                    <MaterialIcons name="logout" size={20} color="#dc2626" />
                    <Text className="text-red-600 font-medium">Disconnect</Text>
                  </HStack>
                </Button>
              </VStack>

              {/* Close Button */}
              <Button
                variant="outline"
                className="w-full border-gray-300 mt-4"
                onPress={() => setShowSettingsMenu(false)}
              >
                <Text className="text-gray-700 font-medium">Close</Text>
              </Button>
            </VStack>
          </Box>
        </Pressable>
      </Modal>
    </>
  );
}
