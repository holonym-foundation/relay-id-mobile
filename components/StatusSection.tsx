import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import React, { useState } from "react";
import { Modal, Pressable, TouchableOpacity } from "react-native";
import Feather from "react-native-vector-icons/Feather";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

import en from "@/content/en";

interface StatusSectionProps {
  hasHat?: boolean;
  isHatLoading?: boolean;
  isHatError?: boolean | null;
}

export function StatusSection({
  hasHat,
  isHatLoading,
  isHatError,
}: StatusSectionProps) {
  const [showPopover, setShowPopover] = useState(false);

  const renderStatusBadge = () => {
    if (isHatLoading) {
      return (
        <Box className="flex-row items-center bg-gray-200 px-4 py-2 sm:px-3 sm:py-2 rounded-lg shadow-sm">
          <Spinner size="small" />
          <Text className="ml-2 text-gray-600 text-base sm:text-sm font-medium">
            Loading...
          </Text>
        </Box>
      );
    }

    if (isHatError) {
      return (
        <Box className="bg-red-200 px-4 py-3 sm:px-3 sm:py-2 rounded-lg shadow-sm">
          <Text className="text-red-700 font-semibold tracking-wide text-base sm:text-sm">
            {en.status.errorLoadingStatus}
          </Text>
        </Box>
      );
    }

    if (hasHat) {
      return (
        <Box className="bg-green-200 px-4 py-3 sm:px-3 sm:py-2 rounded-lg shadow-sm flex-row items-center">
          <Feather name="check" size={20} color="#15803d" />
          <Text className="text-green-700 font-semibold tracking-wide text-base sm:text-sm ml-2">
            {en.status.youAreALeader}
          </Text>
        </Box>
      );
    }

    return (
      <Box className="bg-red-200 px-4 py-3 sm:px-3 sm:py-2 rounded-lg shadow-sm flex-row items-center">
        <Feather name="x" size={20} color="#dc2626" />
        <Text className="text-red-700 font-semibold tracking-wide text-base sm:text-sm ml-2">
          {en.status.notALeader}
        </Text>
      </Box>
    );
  };

  return (
    <Box>
      {/* Compact Header Section */}
      <Box className="flex-row items-center justify-between">
        <HStack className="items-center gap-2">
          <Text className="text-base font-semibold text-gray-900">
            {en.status.status}
          </Text>
          <TouchableOpacity
            onPress={() => setShowPopover(true)}
            className="p-1"
          >
            <MaterialIcons name="info-outline" size={16} color="#6b7280" />
          </TouchableOpacity>
        </HStack>

        {renderStatusBadge()}
      </Box>

      {/* Compact Onboarding Instructions */}
      {!isHatLoading && !hasHat && (
        <Box className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg ml-5">
          <Text className="font-medium mb-2 text-sm text-gray-900">
            {en.status.onboardingTitle}
          </Text>

          <Box className="gap-1">
            {en.status.onboardingSteps.map((step, idx) => (
              <Box key={idx} className="flex-row">
                <Text className="text-slate-600 mr-2 text-xs">{idx + 1}.</Text>
                <Text className="text-slate-600 flex-1 text-xs leading-relaxed">
                  {step}
                </Text>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* Compact Popover Modal */}
      <Modal
        visible={showPopover}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPopover(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-center items-center px-4"
          onPress={() => setShowPopover(false)}
        >
          <Pressable
            className="bg-white rounded-lg p-4 w-full max-w-sm shadow-lg"
            onPress={(e) => e.stopPropagation()}
          >
            <Text className="font-medium mb-2 text-base text-gray-900">
              {en.status.networkStatus}
            </Text>
            <Text className="text-sm text-gray-600 leading-relaxed mb-3">
              {en.status.networkStatusDescription}
            </Text>

            <TouchableOpacity
              className="bg-blue-500 px-3 py-2 rounded-lg self-end flex-row items-center"
              onPress={() => setShowPopover(false)}
            >
              <MaterialIcons name="close" size={14} color="#ffffff" />
              <Text className="text-white font-medium ml-1 text-sm">Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </Box>
  );
}
