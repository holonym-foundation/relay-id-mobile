import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import React from "react";
import { Modal, Pressable, ScrollView } from "react-native";
import QRCode from "react-native-qrcode-svg";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Feather from "react-native-vector-icons/Feather";
import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

import { Box } from "@/components/ui/box";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

import { AppHeader } from "@/components/AppHeader";
import { UserStatusGuard } from "@/components/UserStatusGuard";
import en from "@/content/en";
import { useLogout } from "@/hooks/useLogout";
import { useNativeStellarWallet } from "@/hooks/useNativeStellarWallet";
import { useToast } from "@/hooks/useToast";
import { useUserStatus } from "@/hooks/useUserStatus";
import { shareViaWhatsApp } from "@/lib/utils/whatsapp-share";

export default function Index() {
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const scrollPaddingBottom = insets.bottom + 64;
  const [showOnboardingHelp, setShowOnboardingHelp] = React.useState(false);
  const [showShareModal, setShowShareModal] = React.useState(false);
  // Payments go to the Stellar account; Leader onboarding (Hats) needs the 0x RelayID.
  const [shareMode, setShareMode] = React.useState<"payment" | "leader">("payment");
  const { handleLogout } = useLogout();
  const stellarWallet = useNativeStellarWallet();

  const {
    displayAddress,
    displayHasHat,
    displayChainId,
    displayIsConnected,
    isDemoMode,
  } = useUserStatus();

  const handleCopyStellarAddress = async () => {
    if (!stellarWallet.address) return;
    try {
      await Clipboard.setStringAsync(stellarWallet.address);
      toast.show({ title: "Copied!", description: "Stellar address copied to clipboard", action: "success" });
    } catch {
      toast.show({ title: "Unable to copy Stellar address", action: "error" });
    }
  };

  const handleCopyRelayID = async () => {
    if (displayAddress) {
      await Clipboard.setStringAsync(displayAddress);
      toast.show({
        title: isDemoMode ? "Demo: Copied!" : "Copied!",
        description: isDemoMode
          ? "Demo RelayID copied to clipboard"
          : "RelayID copied to clipboard",
        action: "success",
      });
    }
  };

  const shareAddress = shareMode === "payment" ? stellarWallet.address : displayAddress;
  // The leader QR keeps the structured payload the onboarding scanners read.
  const shareQrValue = shareMode === "payment"
    ? stellarWallet.address
    : displayAddress && JSON.stringify({ address: displayAddress, chainId: displayChainId || 0, type: "relayId" });

  const handleWhatsAppShare = async () => {
    if (isDemoMode) {
      // Demo mode: Show fake share preview
      const message = shareMode === "payment"
        ? `${en.share.stellarAddressMessage}${stellarWallet.address}`
        : `${en.share.requestOnboardingMessage}${displayAddress}`;
      toast.show({
        title: "Demo: WhatsApp Share",
        description: `This would share via WhatsApp: ${message}. No actual message sent in demo mode.`,
        action: "info",
        duration: 4000,
      });
      return;
    }

    if (shareMode === "payment" && stellarWallet.address) {
      await shareViaWhatsApp({ type: "stellarAddress", address: stellarWallet.address });
    } else if (shareMode === "leader" && displayAddress) {
      await shareViaWhatsApp({ type: "requestOnboarding", address: displayAddress });
    }
  };

  const handleDisconnect = () => {
    handleLogout();
  };

  // Main authenticated view - UNIFIED MODERN DESIGN
  return (
    <UserStatusGuard
      notConnectedMessage={{
        icon: "account-circle",
        title: "Welcome to RelayID",
        description: "Sign in to get started",
        buttonLabel: "Sign in to RelayID",
      }}
    >
      <SafeAreaView className="flex-1 bg-white">
        <AppHeader />

        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: scrollPaddingBottom,
            flexGrow: 1,
          }}
        >
          <Box className="px-6 py-6 flex-1">
            <VStack className="gap-10 flex-1">
              {/* Status Section */}
              <VStack className="gap-6">
                {displayHasHat ? (
                  // Leader Status
                  <VStack className="gap-4">
                    <HStack className="items-center gap-4">
                      <Box className="w-16 h-16 bg-green-100 rounded-full items-center justify-center">
                        <MaterialIcons
                          name="verified"
                          size={28}
                          color="#16a34a"
                        />
                      </Box>
                      <VStack className="flex-1">
                        <Heading className="text-xl font-bold text-gray-900">
                          {en.page.youAreLeader}
                        </Heading>
                        <Text className="text-base text-gray-600">
                          {en.page.canInviteOthers}
                        </Text>
                      </VStack>
                    </HStack>
                  </VStack>
                ) : (
                  // Getting Started
                  <VStack className="gap-4">
                    <HStack className="items-center gap-4">
                      <Box className="w-16 h-16 bg-orange-100 rounded-full items-center justify-center">
                        <MaterialIcons
                          name="rocket-launch"
                          size={28}
                          color="#ea580c"
                        />
                      </Box>
                      <VStack className="flex-1">
                        <Heading className="text-xl font-bold text-gray-900">
                          {en.page.gettingStarted}
                        </Heading>
                        <Text className="text-base text-gray-600">
                          {en.page.notConnectedYet}
                        </Text>
                      </VStack>
                    </HStack>
                  </VStack>
                )}
              </VStack>

              {/* Status Fields */}
              <VStack className="gap-4">
                <Heading className="text-lg font-semibold text-gray-900">
                  Status
                </Heading>
                <VStack className="gap-3">
                  {/* Connected to RelayID */}
                  <HStack className="items-center justify-between py-3 px-4 bg-gray-50 rounded-lg border border-gray-200">
                    <HStack className="items-center gap-3 flex-1">
                      <MaterialIcons
                        name="link"
                        size={20}
                        color={displayIsConnected ? "#16a34a" : "#dc2626"}
                      />
                      <Text className="text-base font-medium text-gray-900">
                        Connected to RelayID
                      </Text>
                    </HStack>
                    <HStack className="items-center gap-2">
                      {displayIsConnected ? (
                        <>
                          <MaterialIcons
                            name="check-circle"
                            size={20}
                            color="#16a34a"
                          />
                          <Text className="text-sm font-medium text-green-600">
                            Connected
                          </Text>
                        </>
                      ) : (
                        <>
                          <MaterialIcons
                            name="cancel"
                            size={20}
                            color="#dc2626"
                          />
                          <Text className="text-sm font-medium text-red-600">
                            Not Connected
                          </Text>
                        </>
                      )}
                    </HStack>
                  </HStack>

                  {/* Native Stellar identity; onboarding shares below still use the RelayID account. */}
                  <Box className="py-3 px-4 bg-gray-50 rounded-lg border border-gray-200">
                    <VStack className="gap-2">
                      <Text className="text-sm font-medium text-gray-700">
                        Your Stellar address
                      </Text>
                      <HStack className="items-center justify-between">
                        <Text className="text-sm font-mono text-gray-800 flex-1 mr-3">
                          {stellarWallet.address || (stellarWallet.busy ? "Loading Stellar address…" : "Stellar address not available")}
                        </Text>
                        <Pressable
                          onPress={handleCopyStellarAddress}
                          disabled={!stellarWallet.address}
                          accessibilityLabel="Copy Stellar address"
                          accessibilityState={{ disabled: !stellarWallet.address }}
                          className="p-2 rounded-lg bg-white border border-gray-300 active:bg-gray-100"
                        >
                          <Feather name="copy" size={16} color="#6b7280" />
                        </Pressable>
                      </HStack>
                      {!stellarWallet.address && !stellarWallet.busy && (
                        <Pressable onPress={() => router.push("/(tabs)/(stellar-native)")}>
                          <Text className="text-sm text-blue-600">Connect Stellar wallet</Text>
                        </Pressable>
                      )}
                    </VStack>
                  </Box>
                </VStack>
              </VStack>

              {/* Action Buttons */}
              <VStack className="gap-8">
                {displayHasHat ? (
                  // Leader Actions
                  <>
                    <Button
                      size="xl"
                      className="w-full bg-blue-600"
                      onPress={() => router.push("/(tabs)/(invite)")}
                    >
                      <HStack className="items-center justify-center gap-4">
                        <MaterialIcons
                          name="person-add"
                          size={24}
                          color="#ffffff"
                        />
                        <Text className="text-white font-bold text-lg">
                          {en.page.inviteSomeone}
                        </Text>
                      </HStack>
                    </Button>
                  </>
                ) : (
                  // Getting Started Actions
                  <>
                    <Button
                      size="xl"
                      className="w-full bg-blue-600"
                      onPress={() => {
                        setShareMode("payment");
                        setShowShareModal(true);
                      }}
                    >
                      <HStack className="items-center justify-center gap-4">
                        <Feather name="share-2" size={24} color="#ffffff" />
                        <Text className="text-white font-bold text-lg">
                          {en.page.shareMyRelayID}
                        </Text>
                      </HStack>
                    </Button>

                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full border-2 border-gray-300"
                      onPress={() => setShowOnboardingHelp(true)}
                    >
                      <HStack className="items-center justify-center gap-4">
                        <MaterialIcons
                          name="help-outline"
                          size={24}
                          color="#374151"
                        />
                        <Text className="text-gray-700 font-bold text-lg">
                          {en.page.howToGetConnected}
                        </Text>
                      </HStack>
                    </Button>
                  </>
                )}

                {/* Logout Button */}
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full border-red-300"
                  onPress={handleDisconnect}
                >
                  <HStack className="items-center justify-center gap-3">
                    <MaterialIcons name="logout" size={20} color="#dc2626" />
                    <Text className="text-red-600 font-medium">
                      {en.page.disconnect}
                    </Text>
                  </HStack>
                </Button>
              </VStack>
            </VStack>
          </Box>
        </ScrollView>

        {/* Onboarding Help Modal */}
        <Modal
          visible={showOnboardingHelp}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <SafeAreaView className="flex-1 bg-white">
            <VStack className="flex-1">
              {/* Modal Header */}
              <HStack className="items-center justify-between px-6 py-4 border-b border-gray-200">
                <Text className="text-lg font-semibold text-gray-900">
                  {en.status.howToGetConnectedTitle}
                </Text>
                <Pressable onPress={() => setShowOnboardingHelp(false)}>
                  <MaterialIcons name="close" size={24} color="#374151" />
                </Pressable>
              </HStack>

              {/* Modal Content */}
              <ScrollView className="flex-1 px-6 py-6">
                <VStack className="gap-6">
                  <Text className="text-base text-gray-600 text-center">
                    {en.status.joinCommunitySteps}
                  </Text>

                  <VStack className="gap-6">
                    {/* Step 1 */}
                    <VStack className="gap-3">
                      <HStack className="items-center gap-3">
                        <Box className="w-8 h-8 bg-blue-100 rounded-full items-center justify-center">
                          <Text className="text-sm font-bold text-blue-600">
                            1
                          </Text>
                        </Box>
                        <MaterialIcons name="share" size={20} color="#3b82f6" />
                        <Text className="text-lg font-semibold text-gray-900">
                          {en.status.shareRelayIDTitle}
                        </Text>
                      </HStack>
                      <Text className="text-base text-gray-600 ml-11">
                        {en.status.shareRelayIDDescription}
                      </Text>
                    </VStack>

                    {/* Step 2 */}
                    <VStack className="gap-3">
                      <HStack className="items-center gap-3">
                        <Box className="w-8 h-8 bg-blue-100 rounded-full items-center justify-center">
                          <Text className="text-sm font-bold text-blue-600">
                            2
                          </Text>
                        </Box>
                        <MaterialIcons
                          name="hourglass-empty"
                          size={20}
                          color="#3b82f6"
                        />
                        <Text className="text-lg font-semibold text-gray-900">
                          {en.status.waitForAddTitle}
                        </Text>
                      </HStack>
                      <Text className="text-base text-gray-600 ml-11">
                        {en.status.waitForAddDescription}
                      </Text>
                    </VStack>

                    {/* Step 3 */}
                    <VStack className="gap-3">
                      <HStack className="items-center gap-3">
                        <Box className="w-8 h-8 bg-blue-100 rounded-full items-center justify-center">
                          <Text className="text-sm font-bold text-blue-600">
                            3
                          </Text>
                        </Box>
                        <MaterialIcons
                          name="notifications"
                          size={20}
                          color="#3b82f6"
                        />
                        <Text className="text-lg font-semibold text-gray-900">
                          {en.status.notifiedWhenReadyTitle}
                        </Text>
                      </HStack>
                      <Text className="text-base text-gray-600 ml-11">
                        {en.status.notifiedWhenReadyDescription}
                      </Text>
                    </VStack>
                  </VStack>
                </VStack>
              </ScrollView>

              {/* Modal Footer */}
              <Box className="px-6 py-4 border-t border-gray-200">
                <Button
                  className="w-full bg-blue-600"
                  onPress={() => setShowOnboardingHelp(false)}
                >
                  <Text className="text-white font-semibold text-base">
                    {en.status.gotIt}
                  </Text>
                </Button>
              </Box>
            </VStack>
          </SafeAreaView>
        </Modal>

        {/* Share Your ID Modal */}
        <Modal
          visible={showShareModal}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <SafeAreaView className="flex-1 bg-white">
            <VStack className="flex-1">
              {/* Modal Header */}
              <HStack className="items-center justify-between px-6 py-4 border-b border-gray-200">
                <Text className="text-lg font-semibold text-gray-900">
                  {en.share.shareSheetTitle}
                </Text>
                <Pressable onPress={() => setShowShareModal(false)}>
                  <MaterialIcons name="close" size={24} color="#374151" />
                </Pressable>
              </HStack>

              {/* Modal Content */}
              <ScrollView className="flex-1 px-6 py-6">
                <VStack className="gap-6">
                  {/* Purpose selector */}
                  <HStack className="bg-gray-100 rounded-lg p-1">
                    {([
                      ["payment", en.share.getPaidTab],
                      ["leader", en.share.becomeLeaderTab],
                    ] as const).map(([mode, label]) => (
                      <Pressable
                        key={mode}
                        onPress={() => setShareMode(mode)}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: shareMode === mode }}
                        className={`flex-1 py-3 rounded-md ${shareMode === mode ? "bg-white" : ""}`}
                      >
                        <Text className={`text-center font-semibold ${shareMode === mode ? "text-blue-600" : "text-gray-500"}`}>
                          {label}
                        </Text>
                      </Pressable>
                    ))}
                  </HStack>

                  <Text className="text-base text-gray-600 text-center">
                    {shareMode === "payment"
                      ? en.share.stellarAddressDescription
                      : en.share.shareWithMembersDescription}
                  </Text>

                  {shareQrValue ? (
                    <Box className="self-center bg-white p-4 rounded-lg border border-gray-200">
                      <QRCode
                        value={shareQrValue}
                        size={200}
                        color="#000000"
                        backgroundColor="#ffffff"
                        quietZone={10}
                      />
                    </Box>
                  ) : null}

                  <Box className="bg-gray-50 px-4 py-4 rounded-lg border border-gray-200">
                    <VStack className="gap-2">
                      <Text className="text-sm font-medium text-gray-700">
                        {shareMode === "payment" ? "Your Stellar address" : "Your RelayID"}
                      </Text>
                      <HStack className="items-center justify-between">
                        <Text className="text-sm font-mono text-gray-800 flex-1">
                          {shareAddress ||
                            (shareMode === "payment" && stellarWallet.busy
                              ? "Loading Stellar address…"
                              : shareMode === "payment" ? "Stellar address not available" : "RelayID not available")}
                        </Text>
                        <Pressable
                          onPress={shareMode === "payment" ? handleCopyStellarAddress : handleCopyRelayID}
                          disabled={!shareAddress}
                          accessibilityLabel={shareMode === "payment" ? "Copy Stellar address" : "Copy RelayID"}
                          accessibilityState={{ disabled: !shareAddress }}
                          className="p-2 rounded-lg bg-white border border-gray-200"
                        >
                          <Feather name="copy" size={16} color="#6b7280" />
                        </Pressable>
                      </HStack>
                    </VStack>
                  </Box>

                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full border-2 border-gray-300"
                    isDisabled={!shareAddress}
                    onPress={handleWhatsAppShare}
                  >
                    <HStack className="items-center justify-center gap-4">
                      <FontAwesome5 name="whatsapp" size={22} color="#25D366" />
                      <Text className="text-gray-700 font-bold">Share via WhatsApp</Text>
                    </HStack>
                  </Button>
                </VStack>
              </ScrollView>

              {/* Modal Footer */}
              <Box className="px-6 py-4 border-t border-gray-200">
                <Button
                  className="w-full bg-blue-600"
                  onPress={() => setShowShareModal(false)}
                >
                  <Text className="text-white font-semibold text-base">
                    Done
                  </Text>
                </Button>
              </Box>
            </VStack>
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </UserStatusGuard>
  );
}
