import { useRouter } from "expo-router";
import React, { useState } from "react";

import { VerifyInviteResult } from "@/components/InviteVerification";
import { Box } from "@/components/ui/box";
import { Button } from "@/components/ui/button";
import { Center } from "@/components/ui/center";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
// import { wagmiConfig } from "@/config/wagmi";
import { useDemoMode } from "@/contexts/DemoContext";
import { useToast } from "@/hooks/useToast";
import { DEMO_DATA } from "@/lib/demo-data";
import { getDeviceInfo } from "@/lib/device-info";
import { onboardViaInvite } from "@/lib/relayId/api";
import { unmarshalTypedData } from "@/lib/utils/serialize";

interface OnboardingFlowProps {
  verificationResult: VerifyInviteResult;
}

export function OnboardingFlow({ verificationResult }: OnboardingFlowProps) {
  const { isDemoMode, account, signTypedData } = useDemoMode();
  const toast = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [onboardingStage, setOnboardingStage] = useState<number>(0);
  const [isSuccess, setIsSuccess] = useState(false);

  // Use demo data when in demo mode
  const displayAddress = isDemoMode ? DEMO_DATA.userAddress : account;

  const handleAcceptInvite = async () => {
    if (
      !displayAddress ||
      !verificationResult?.success ||
      !verificationResult.typedData
    ) {
      toast.show({
        title: "Error",
        description: "Missing required data for onboarding",
        action: "error",
      });
      return;
    }

    // Demo mode: simulate onboarding flow
    if (isDemoMode) {
      setIsLoading(true);
      setOnboardingStage(0);

      try {
        setOnboardingStage(1);
        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 1500));
        setOnboardingStage(2);
        await new Promise((resolve) => setTimeout(resolve, 500));
        setIsSuccess(true);
        toast.show({
          title: "Demo: Invite Accepted!",
          description: "In real mode, this would sign a transaction and onboard you to the network.",
          action: "success",
          duration: 4000,
        });
      } catch (error) {
        console.error("Demo onboarding error:", error);
        toast.show({
          title: "Demo Error",
          description: "Something went wrong in demo mode",
          action: "error",
        });
        setOnboardingStage(0);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(true);
    setOnboardingStage(0);

    try {
      setOnboardingStage(1); // Awaiting confirmation

      const signature = await signTypedData(
        unmarshalTypedData(verificationResult.typedData)
      );

      // Get device info
      const deviceInfo = getDeviceInfo();

      // Call onboardViaInvite API
      const result = await onboardViaInvite({
        recipient: displayAddress,
        typedData: verificationResult.typedData,
        signature,
        deviceInfo,
      });

      if ("error" in result) {
        throw new Error(result.error);
      }

      setOnboardingStage(2); // Completed
      setIsSuccess(true);
    } catch (error) {
      console.error("Error accepting invite:", error);
      toast.show({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to accept invite",
        action: "error",
      });
      setOnboardingStage(0); // Reset to starting on error
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <Center className="flex-1 px-6">
        <VStack className="items-center gap-6">
          <VStack className="items-center gap-4">
            <Box className="w-16 h-16 bg-green-100 rounded-full items-center justify-center">
              <Text className="text-2xl">✓</Text>
            </Box>
            <VStack className="items-center gap-2">
              <Heading className="text-2xl font-bold text-gray-900 text-center">
                Welcome to RelayID!
              </Heading>
              <Text className="text-base text-gray-600 text-center">
                You&apos;ve successfully joined the RelayID network as a leader.
              </Text>
            </VStack>
          </VStack>
          <Button
            size="lg"
            className="w-full bg-blue-600"
            onPress={() => router.push("/(tabs)/(home)")}
          >
            <Text className="text-white font-semibold text-base">
              Go to Dashboard
            </Text>
          </Button>
        </VStack>
      </Center>
    );
  }

  return (
    <Box className="flex-1 px-6 py-6">
      <VStack className="gap-6">
        <VStack className="gap-4">
          <Heading className="text-2xl font-bold text-gray-900">
            Accept Invite
          </Heading>

          {/* Onboarding progress */}
          {(isLoading || onboardingStage > 0) && (
            <VStack className="gap-3">
              <HStack className="items-center gap-3">
                <Spinner size="small" />
                <Text className="text-base font-medium text-gray-700">
                  {onboardingStage === 0 && "Starting onboarding..."}
                  {onboardingStage === 1 &&
                    "Awaiting confirmation from the network..."}
                  {onboardingStage === 2 && "Onboarding completed!"}
                </Text>
              </HStack>
            </VStack>
          )}

          {/* Info text for accept prompt */}
          {!(isLoading || onboardingStage > 0) && (
            <VStack className="gap-4">
              <Text className="text-base text-gray-600">
                You&apos;ve been invited to join the RelayID network as a
                leader. Click below to accept the invitation and complete your
                onboarding.
              </Text>
              {verificationResult.expiresAt && (
                <Box className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <Text className="text-sm text-blue-800">
                    <Text className="font-semibold">Expires:</Text>{" "}
                    {new Date(verificationResult.expiresAt).toLocaleString()}
                  </Text>
                </Box>
              )}
            </VStack>
          )}
        </VStack>

        <Button
          size="lg"
          className="w-full bg-blue-600"
          onPress={handleAcceptInvite}
          disabled={isLoading}
        >
          <HStack className="items-center justify-center gap-3">
            {isLoading ? (
              <>
                <Spinner size="small" color="white" />
                <Text className="text-white font-semibold text-base">
                  Processing...
                </Text>
              </>
            ) : (
              <Text className="text-white font-semibold text-base">
                Accept Invite
              </Text>
            )}
          </HStack>
        </Button>
      </VStack>
    </Box>
  );
}
