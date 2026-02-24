import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";

import { Center } from "@/components/ui/center";
import { Heading } from "@/components/ui/heading";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { verifyInvite } from "@/lib/relayId/api";

export interface VerifyInviteResult {
  success: boolean;
  error?: string;
  expiresAt?: string;
  typedData?: any;
  signature?: string;
}

interface InviteVerificationProps {
  onVerificationComplete: (result: VerifyInviteResult) => void;
}

export function InviteVerification({
  onVerificationComplete,
}: InviteVerificationProps) {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const [verificationResult, setVerificationResult] =
    useState<VerifyInviteResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const verifyInviteCode = async () => {
      if (!code) {
        const errorResult = {
          success: false,
          error: "No invite code provided",
        };
        setVerificationResult(errorResult);
        onVerificationComplete(errorResult);
        setIsLoading(false);
        return;
      }

      try {
        console.log("Verifying invite code", code);

        const result = await verifyInvite({
          code,
        });

        if ("error" in result) {
          const errorResult = {
            success: false,
            error: result.error,
          };
          setVerificationResult(errorResult);
          onVerificationComplete(errorResult);
        } else {
          const successResult = {
            success: result.valid,
            error: result.valid ? undefined : "Invalid invite code",
            expiresAt: undefined, // Add if available from API
            typedData: result.typedData,
            signature: undefined, // Will be generated during onboarding
          };
          setVerificationResult(successResult);
          onVerificationComplete(successResult);
        }
      } catch (err) {
        console.error("Error in invite verification:", err);
        const errorResult = {
          success: false,
          error: `Failed to verify invite: ${
            err instanceof Error ? err.message : "Unknown error"
          }`,
        };
        setVerificationResult(errorResult);
        onVerificationComplete(errorResult);
      } finally {
        setIsLoading(false);
      }
    };

    verifyInviteCode();
  }, [code, onVerificationComplete]);

  if (isLoading) {
    return (
      <Center className="flex-1 px-6">
        <VStack className="items-center gap-4">
          <Spinner size="large" />
          <Text className="text-gray-600">Verifying invite code...</Text>
        </VStack>
      </Center>
    );
  }

  if (!verificationResult?.success) {
    return (
      <Center className="flex-1 px-6">
        <VStack className="items-center gap-4">
          <VStack className="items-center gap-2">
            <Heading className="text-xl font-bold text-red-600 text-center">
              Invalid Invite
            </Heading>
            <Text className="text-base text-gray-600 text-center">
              {verificationResult?.error ||
                "This invite code is not valid or has expired."}
            </Text>
          </VStack>
        </VStack>
      </Center>
    );
  }

  return null; // Verification successful, let parent handle the next step
}
