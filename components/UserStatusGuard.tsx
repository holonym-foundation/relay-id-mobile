import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

import { NotConnectedState } from "@/components/NotConnectedState";
import { Box } from "@/components/ui/box";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { useUserStatus } from "@/hooks/useUserStatus";

import { AppHeader } from "./AppHeader";

interface UserStatusGuardProps {
  children: React.ReactNode;
  /**
   * If true, requires user to have a hat (be a leader) to access content
   * If false, only requires user to be connected
   */
  requireLeader?: boolean;
  /**
   * Custom message to show when user is not connected
   */
  notConnectedMessage?: {
    title: string;
    description: string;
    buttonLabel: string;
    icon?: string;
  };
  /**
   * Custom message to show when user is not a leader
   */
  notLeaderMessage?: {
    title: string;
    description: string;
    buttonLabel: string;
    icon?: string;
  };
}

/**
 * Component that guards content based on user connection and leader status
 * Handles loading, error, and unauthorized states
 */
export function UserStatusGuard({
  children,
  requireLeader = false,
  notConnectedMessage,
  notLeaderMessage,
}: UserStatusGuardProps) {
  const {
    displayIsConnected,
    displayHasHat,
    isWaitingForHatStatus,
    isHatError,
    isDemoMode,
  } = useUserStatus();

  // Not connected state
  if (!displayIsConnected) {
    return (
      <NotConnectedState
        icon={notConnectedMessage?.icon || "account-circle"}
        title={notConnectedMessage?.title || "Welcome to RelayID"}
        description={
          notConnectedMessage?.description || "Sign in to get started"
        }
        buttonLabel={notConnectedMessage?.buttonLabel || "Sign in to RelayID"}
        isLogin={true}
      />
    );
  }

  // Loading state (skip if in demo mode)
  if (isWaitingForHatStatus) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={["bottom"]}>
        <AppHeader />
        <Box className="flex-1 items-center justify-center">
          <VStack className="items-center gap-4">
            <Spinner size="large" />
            <Text className="text-gray-600">Loading your status...</Text>
          </VStack>
        </Box>
      </SafeAreaView>
    );
  }

  // Error state (skip if in demo mode)
  if (isHatError && !isDemoMode) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <AppHeader />
        <Box className="flex-1 items-center justify-center px-6">
          <VStack className="items-center gap-4">
            <MaterialIcons name="error-outline" size={48} color="#ef4444" />
            <Text className="text-lg font-semibold text-gray-900 text-center">
              Something went wrong
            </Text>
            <Text className="text-gray-600 text-center">
              Please try again later
            </Text>
          </VStack>
        </Box>
      </SafeAreaView>
    );
  }

  // User is connected but not a leader (if leader is required)
  if (requireLeader && !displayHasHat && !isDemoMode) {
    return (
      <NotConnectedState
        icon={notLeaderMessage?.icon || "verified"}
        title={notLeaderMessage?.title || "Not a leader yet"}
        description={
          notLeaderMessage?.description ||
          "You need to be onboarded as a leader to access this content."
        }
        buttonLabel={notLeaderMessage?.buttonLabel || "Go to Home"}
      />
    );
  }

  return <>{children}</>;
}
