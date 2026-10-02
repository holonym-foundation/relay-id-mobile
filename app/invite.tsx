import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

import { AppHeader } from "@/components/AppHeader";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import { Box } from "@/components/ui/box";
import { Button, ButtonText } from "@/components/ui/button";
import { Center } from "@/components/ui/center";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { useDemoMode } from "@/contexts/DemoContext";
import { verifyInvite } from "@/lib/relayId/api";

interface VerifyInviteResult {
  success: boolean;
  error?: string;
  expiresAt?: string;
  typedData?: any;
  signature?: string;
}

export default function InviteDeepLinkPage() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const { isDemoMode, isConnected, signIn, cancelSignIn, isSigningIn } = useDemoMode();
  const router = useRouter();
  const [verificationResult, setVerificationResult] =
    useState<VerifyInviteResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const scrollContentStyle = React.useMemo(
    () => ({
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingVertical: 24,
      gap: 24,
    }),
    []
  );

  // Use demo data when in demo mode
  const displayIsConnected = isDemoMode ? true : isConnected;

  // Verify invite code on mount
  useEffect(() => {
    const verifyInviteCode = async () => {
      if (!code) {
        // In demo mode, allow viewing the page without an invite code
        if (isDemoMode) {
          // Simulate a valid invite with mock typed data
          setVerificationResult({
            success: true,
            typedData: {
              domain: { name: "Demo", version: "1" },
              types: { Demo: [] },
              primaryType: "Demo",
              message: {},
            },
          });
          setIsLoading(false);
          return;
        }

        setVerificationResult({
          success: false,
          error: "No invite code provided",
        });
        setIsLoading(false);
        return;
      }

      // Demo mode: always return a valid invite
      if (isDemoMode) {
        await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate network delay
        setVerificationResult({
          success: true,
          typedData: {
            domain: { name: "Demo", version: "1" },
            types: { Demo: [] },
            primaryType: "Demo",
            message: {},
          },
        });
        setIsLoading(false);
        return;
      }

      try {
        const result = await verifyInvite({ code });

        if ("error" in result) {
          setVerificationResult({
            success: false,
            error: result.error,
          });
        } else {
          setVerificationResult({
            success: result.valid,
            error: result.valid ? undefined : "Invalid invite code",
            typedData: result.typedData,
          });
        }
      } catch (err) {
        setVerificationResult({
          success: false,
          error: `Failed to verify invite: ${err instanceof Error ? err.message : "Unknown error"
            }`,
        });
      } finally {
        setIsLoading(false);
      }
    };

    verifyInviteCode();
  }, [code, isDemoMode]);

  const handleGoToApp = () => {
    router.push("/(tabs)/(home)");
  };

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <AppHeader />
        <ScrollView
          className="flex-1"
          contentContainerStyle={scrollContentStyle}
          showsVerticalScrollIndicator={false}
        >
          <Center className="flex-1">
            <VStack className="items-center gap-4">
              <Spinner size="large" />
              <Text className="text-gray-600 text-center">
                Verifying invite code...
              </Text>
            </VStack>
          </Center>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Invalid invite or error state
  if (!verificationResult?.success) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <AppHeader />
        <ScrollView
          className="flex-1"
          contentContainerStyle={scrollContentStyle}
          showsVerticalScrollIndicator={false}
        >
          <VStack className="items-center gap-6">
            <Box className="w-24 h-24 bg-red-100 rounded-full items-center justify-center">
              <MaterialIcons name="close" size={40} color="#dc2626" />
            </Box>
            <VStack className="items-center gap-3">
              <Heading className="text-2xl font-bold text-red-600 text-center">
                Invalid Invite
              </Heading>
              <Text className="text-base text-gray-600 text-center max-w-sm">
                {verificationResult?.error || "Invalid invite code"}
              </Text>
            </VStack>

            <Button
              className="bg-blue-600 w-full"
              size="xl"
              onPress={handleGoToApp}
            >
              <ButtonText>Go to App</ButtonText>
            </Button>

            <Button
              size="lg"
              variant="outline"
              onPress={() => setShowHowItWorks(true)}
            >
              <HStack className="items-center justify-center gap-3">
                <MaterialIcons name="help-outline" size={20} color="#374151" />
                <ButtonText>How do invites work?</ButtonText>
              </HStack>
            </Button>
          </VStack>
        </ScrollView>

        {/* How It Works Modal */}
        <Modal
          visible={showHowItWorks}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <SafeAreaView className="flex-1 bg-white">
            <VStack className="flex-1">
              {/* Modal Header */}
              <HStack className="items-center justify-between px-6 py-4 border-b border-gray-200">
                <Text className="text-lg font-semibold text-gray-900">
                  How do invites work?
                </Text>
                <Pressable
                  onPress={() => setShowHowItWorks(false)}
                  className="p-2 rounded-lg"
                  style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                >
                  <MaterialIcons name="close" size={24} color="#374151" />
                </Pressable>
              </HStack>

              {/* Modal Content */}
              <ScrollView className="flex-1 px-6 py-6">
                <VStack className="gap-6">
                  <VStack className="gap-4">
                    <HStack className="items-center gap-3">
                      <Box className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center">
                        <MaterialIcons
                          name="person-add"
                          size={20}
                          color="#3b82f6"
                        />
                      </Box>
                      <Text className="text-lg font-semibold text-gray-900">
                        Getting Invited
                      </Text>
                    </HStack>
                    <Text className="text-gray-600 leading-relaxed">
                      Leaders in the RelayID network can invite you to become a
                      leader yourself. When they share an invite link with you,
                      it contains a secure code that verifies you&apos;re
                      authorized to join.
                    </Text>
                  </VStack>

                  <VStack className="gap-4">
                    <HStack className="items-center gap-3">
                      <Box className="w-10 h-10 bg-green-100 rounded-full items-center justify-center">
                        <MaterialIcons
                          name="verified-user"
                          size={20}
                          color="#059669"
                        />
                      </Box>
                      <Text className="text-lg font-semibold text-gray-900">
                        Accepting Invites
                      </Text>
                    </HStack>
                    <Text className="text-gray-600 leading-relaxed">
                      To accept an invite, you need to create your RelayID
                      account. This grants you leader permissions to help
                      refugees access critical resources and services.
                    </Text>
                  </VStack>

                  <VStack className="gap-4">
                    <HStack className="items-center gap-3">
                      <Box className="w-10 h-10 bg-purple-100 rounded-full items-center justify-center">
                        <MaterialIcons
                          name="security"
                          size={20}
                          color="#7c3aed"
                        />
                      </Box>
                      <Text className="text-lg font-semibold text-gray-900">
                        Security & Privacy
                      </Text>
                    </HStack>
                    <Text className="text-gray-600 leading-relaxed">
                      All invites are cryptographically signed and expire after
                      a set time. Your identity and actions are secured by
                      advanced encryption, giving you full control over your
                      data.
                    </Text>
                  </VStack>
                </VStack>
              </ScrollView>
            </VStack>
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    );
  }

  // Valid invite - check if user is signed in
  if (verificationResult.success && !displayIsConnected) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <AppHeader />
        <ScrollView
          className="flex-1"
          contentContainerStyle={scrollContentStyle}
          showsVerticalScrollIndicator={false}
        >
          <VStack className="items-center gap-6">
            <Box className="w-24 h-24 bg-green-100 rounded-full items-center justify-center">
              <MaterialIcons name="check-circle" size={40} color="#059669" />
            </Box>
            <VStack className="items-center gap-3">
              <Heading className="text-2xl font-bold text-gray-900 text-center">
                Valid Invite!
              </Heading>
              <Text className="text-base text-gray-600 text-center max-w-sm">
                Create your RelayID to accept this invite and join as a leader
              </Text>
            </VStack>

            <VStack className="w-full gap-3">
              {!isConnected && (
                <Button
                  size="lg"
                  variant="outline"
                  isDisabled={isSigningIn}
                  onPress={() => void signIn()}
                >
                  {isSigningIn && <Spinner size="small" />}
                  <ButtonText>
                    {isSigningIn ? "Finishing sign-in…" : "Sign in to RelayID"}
                  </ButtonText>
                </Button>
              )}
              {!isConnected && isSigningIn && (
                <Button size="lg" variant="outline" onPress={cancelSignIn}>
                  <ButtonText>Cancel</ButtonText>
                </Button>
              )}
              <Button size="lg" variant="outline" onPress={handleGoToApp}>
                <ButtonText>Go to App Instead</ButtonText>
              </Button>
            </VStack>

            <Button
              size="lg"
              variant="outline"
              onPress={() => setShowHowItWorks(true)}
            >
              <HStack className="items-center justify-center gap-3">
                <MaterialIcons name="help-outline" size={20} color="#374151" />
                <ButtonText>How do invites work?</ButtonText>
              </HStack>
            </Button>
          </VStack>
        </ScrollView>

        {/* How It Works Modal */}
        <Modal
          visible={showHowItWorks}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <SafeAreaView className="flex-1 bg-white">
            <VStack className="flex-1">
              {/* Modal Header */}
              <HStack className="items-center justify-between px-6 py-4 border-b border-gray-200">
                <Text className="text-lg font-semibold text-gray-900">
                  How do invites work?
                </Text>
                <Pressable
                  onPress={() => setShowHowItWorks(false)}
                  className="p-2 rounded-lg"
                  style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                >
                  <MaterialIcons name="close" size={24} color="#374151" />
                </Pressable>
              </HStack>

              {/* Modal Content */}
              <ScrollView className="flex-1 px-6 py-6">
                <VStack className="gap-6">
                  <VStack className="gap-4">
                    <HStack className="items-center gap-3">
                      <Box className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center">
                        <MaterialIcons
                          name="person-add"
                          size={20}
                          color="#3b82f6"
                        />
                      </Box>
                      <Text className="text-lg font-semibold text-gray-900">
                        Getting Invited
                      </Text>
                    </HStack>
                    <Text className="text-gray-600 leading-relaxed">
                      Leaders in the RelayID network can invite you to become a
                      leader yourself. When they share an invite link with you,
                      it contains a secure code that verifies you&apos;re
                      authorized to join.
                    </Text>
                  </VStack>

                  <VStack className="gap-4">
                    <HStack className="items-center gap-3">
                      <Box className="w-10 h-10 bg-green-100 rounded-full items-center justify-center">
                        <MaterialIcons
                          name="verified-user"
                          size={20}
                          color="#059669"
                        />
                      </Box>
                      <Text className="text-lg font-semibold text-gray-900">
                        Accepting Invites
                      </Text>
                    </HStack>
                    <Text className="text-gray-600 leading-relaxed">
                      To accept an invite, you need to create your RelayID
                      account. This grants you leader permissions to help
                      refugees access critical resources and services.
                    </Text>
                  </VStack>

                  <VStack className="gap-4">
                    <HStack className="items-center gap-3">
                      <Box className="w-10 h-10 bg-purple-100 rounded-full items-center justify-center">
                        <MaterialIcons
                          name="security"
                          size={20}
                          color="#7c3aed"
                        />
                      </Box>
                      <Text className="text-lg font-semibold text-gray-900">
                        Security & Privacy
                      </Text>
                    </HStack>
                    <Text className="text-gray-600 leading-relaxed">
                      All invites are cryptographically signed and expire after
                      a set time. Your identity and actions are secured by
                      advanced encryption, giving you full control over your
                      data.
                    </Text>
                  </VStack>
                </VStack>
              </ScrollView>
            </VStack>
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    );
  }

  // Valid invite and user is signed in - show onboarding flow
  if (verificationResult.success && displayIsConnected) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <AppHeader />
        <OnboardingFlow verificationResult={verificationResult} />
      </SafeAreaView>
    );
  }

  // Fallback
  return (
    <SafeAreaView className="flex-1 bg-white">
      <AppHeader />
      <ScrollView
        className="flex-1"
        contentContainerStyle={scrollContentStyle}
        showsVerticalScrollIndicator={false}
      >
        <Center className="flex-1">
          <Text className="text-gray-600">Loading...</Text>
        </Center>
      </ScrollView>
    </SafeAreaView>
  );
}
