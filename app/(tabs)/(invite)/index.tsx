import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, TouchableOpacity } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

import { AppHeader } from "@/components/AppHeader";
import { DirectOnboardingSection } from "@/components/DirectOnboardingSection";
import { InviteLinkSection } from "@/components/InviteLinkSection";
import { UserStatusGuard } from "@/components/UserStatusGuard";
import { Box } from "@/components/ui/box";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

export default function InvitePage() {
  const { address, tab } = useLocalSearchParams<{
    address?: string;
    tab?: "link" | "direct";
  }>();
  const [showHowToAdd, setShowHowToAdd] = useState(false);
  const [activeTab, setActiveTab] = useState<"link" | "direct">(
    tab === "direct" ? "direct" : "link"
  );
  const insets = useSafeAreaInsets();
  const scrollPaddingBottom = insets.bottom + 64;

  // Handle address parameter from deeplink
  useEffect(() => {
    if (address) {
      setActiveTab("direct");
    }
  }, [address]);

  return (
    <UserStatusGuard
      requireLeader
      notConnectedMessage={{
        icon: "person-add",
        title: "Sign in to invite leaders",
        description: "You need to be onboarded as a leader to invite others",
        buttonLabel: "Sign in to RelayID",
      }}
      notLeaderMessage={{
        icon: "verified",
        title: "Not a leader yet",
        description:
          "You need to be onboarded as a leader to invite others. Share your RelayID with an existing leader to get started.",
        buttonLabel: "Go to Home",
      }}
    >
      <SafeAreaView className="flex-1 bg-white">
        <AppHeader />
        <VStack className="flex-1">
          <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingBottom: scrollPaddingBottom,
              flexGrow: 1,
            }}
          >
            <Box className="px-6 py-6 flex-1">
              <VStack className="gap-8 flex-1">
                {/* Header */}
                <VStack className="gap-2">
                  <Heading className="text-2xl font-bold text-gray-900">
                    Invite New Leaders
                  </Heading>
                  <Text className="text-sm text-gray-500">
                    Add new leaders to the RelayID network
                  </Text>
                </VStack>

                {/* Tab Selector */}
                <VStack className="gap-6">
                  <HStack className="bg-gray-100 p-1 rounded-lg">
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        paddingVertical: 12,
                        paddingHorizontal: 16,
                        borderRadius: 6,
                        backgroundColor:
                          activeTab === "link" ? "white" : "transparent",
                        shadowOpacity: activeTab === "link" ? 0.1 : 0,
                        shadowRadius: activeTab === "link" ? 2 : 0,
                        elevation: activeTab === "link" ? 2 : 0,
                      }}
                      onPress={() => setActiveTab("link")}
                      activeOpacity={0.7}
                    >
                      <HStack className="items-center justify-center gap-2">
                        <MaterialIcons
                          name="link"
                          size={18}
                          color={activeTab === "link" ? "#2563eb" : "#6b7280"}
                        />
                        <Text
                          className={`font-semibold ${
                            activeTab === "link"
                              ? "text-blue-600"
                              : "text-gray-600"
                          }`}
                        >
                          Send Invite
                        </Text>
                      </HStack>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        paddingVertical: 12,
                        paddingHorizontal: 16,
                        borderRadius: 6,
                        backgroundColor:
                          activeTab === "direct" ? "white" : "transparent",
                        shadowOpacity: activeTab === "direct" ? 0.1 : 0,
                        shadowRadius: activeTab === "direct" ? 2 : 0,
                        elevation: activeTab === "direct" ? 2 : 0,
                      }}
                      onPress={() => setActiveTab("direct")}
                      activeOpacity={0.7}
                    >
                      <HStack className="items-center justify-center gap-2">
                        <MaterialIcons
                          name="person-add"
                          size={18}
                          color={activeTab === "direct" ? "#2563eb" : "#6b7280"}
                        />
                        <Text
                          className={`font-semibold ${
                            activeTab === "direct"
                              ? "text-blue-600"
                              : "text-gray-600"
                          }`}
                        >
                          Add Person
                        </Text>
                      </HStack>
                    </TouchableOpacity>
                  </HStack>
                </VStack>

                {/* Tab Content */}
                <VStack className="gap-4 flex-1">
                  {activeTab === "link" ? (
                    <InviteLinkSection />
                  ) : (
                    <DirectOnboardingSection initialAddress={address} />
                  )}
                </VStack>

                <Button
                  size="lg"
                  variant="outline"
                  onPress={() => setShowHowToAdd(true)}
                >
                  <HStack className="items-center justify-center gap-3">
                    <MaterialIcons
                      name="help-outline"
                      size={20}
                      color="#374151"
                    />
                    <Text className="text-gray-700 font-semibold text-base">
                      How to Add Someone
                    </Text>
                  </HStack>
                </Button>
              </VStack>
            </Box>
          </ScrollView>
        </VStack>

        {/* How to Add Someone Modal */}
        <Modal
          visible={showHowToAdd}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <SafeAreaView className="flex-1 bg-white">
            <VStack className="flex-1">
              {/* Modal Header */}
              <HStack className="items-center justify-between px-6 py-4 border-b border-gray-200">
                <Text className="text-lg font-semibold text-gray-900">
                  How to Add Someone
                </Text>
                <Pressable onPress={() => setShowHowToAdd(false)}>
                  <MaterialIcons name="close" size={24} color="#374151" />
                </Pressable>
              </HStack>

              {/* Modal Content */}
              <ScrollView className="flex-1 px-6 py-6">
                <VStack className="gap-6">
                  <Text className="text-base text-gray-600 text-center">
                    Choose how you want to add someone to your RelayID network
                  </Text>

                  {/* Method Selection */}
                  <VStack className="gap-6">
                    {/* Method 1: Direct Addition */}
                    <VStack className="gap-4">
                      <HStack className="items-center gap-3">
                        <Box className="w-8 h-8 bg-green-100 rounded-full items-center justify-center">
                          <Text className="text-sm font-bold text-green-600">
                            1
                          </Text>
                        </Box>
                        <MaterialIcons
                          name="person-add"
                          size={20}
                          color="#10b981"
                        />
                        <Text className="text-lg font-semibold text-gray-900">
                          Direct onboarding
                        </Text>
                      </HStack>

                      <VStack className="gap-3 ml-11">
                        <Text className="text-base font-medium text-gray-700">
                          When to use: You have their RelayID
                        </Text>
                        <VStack className="gap-2">
                          <Text className="text-sm text-gray-600">
                            • Ask them to share their RelayID with you
                          </Text>
                          <Text className="text-sm text-gray-600">
                            • Enter it manually or scan their QR code
                          </Text>
                          <Text className="text-sm text-gray-600">
                            • They&apos;re added immediately to your network
                          </Text>
                        </VStack>
                      </VStack>
                    </VStack>

                    {/* Method 2: Invite Links */}
                    <VStack className="gap-4">
                      <HStack className="items-center gap-3">
                        <Box className="w-8 h-8 bg-blue-100 rounded-full items-center justify-center">
                          <Text className="text-sm font-bold text-blue-600">
                            2
                          </Text>
                        </Box>
                        <MaterialIcons name="link" size={20} color="#3b82f6" />
                        <Text className="text-lg font-semibold text-gray-900">
                          Invite link
                        </Text>
                      </HStack>

                      <VStack className="gap-3 ml-11">
                        <Text className="text-base font-medium text-gray-700">
                          When to use: You want to share a link
                        </Text>
                        <VStack className="gap-2">
                          <Text className="text-sm text-gray-600">
                            • Generate a shareable invite link
                          </Text>
                          <Text className="text-sm text-gray-600">
                            • Share via WhatsApp or other methods
                          </Text>
                          <Text className="text-sm text-gray-600">
                            • They use the link to join the RelayID network as a
                            leader
                          </Text>
                        </VStack>
                      </VStack>
                    </VStack>
                  </VStack>

                  {/* Quick Tips */}
                  <VStack className="gap-4 mt-4 p-4 bg-gray-50 rounded-lg">
                    <Text className="text-base font-semibold text-gray-900">
                      💡 Quick Tips
                    </Text>
                    <VStack className="gap-2">
                      <Text className="text-sm text-gray-600">
                        • Direct onboarding is faster when you&apos;re in the
                        same space and can scan their QR code
                      </Text>
                      <Text className="text-sm text-gray-600">
                        • Use invite links for sharing via WhatsApp or other
                        methods or when you don&apos;t have their RelayID
                      </Text>
                    </VStack>
                  </VStack>
                </VStack>
              </ScrollView>

              {/* Modal Footer */}
              <Box className="px-6 py-4 border-t border-gray-200">
                <Button
                  className="w-full bg-blue-600"
                  onPress={() => setShowHowToAdd(false)}
                >
                  <Text className="text-white font-semibold text-base">
                    Got it
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
