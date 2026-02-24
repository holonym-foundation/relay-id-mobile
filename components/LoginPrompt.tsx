import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

import { Box } from "@/components/ui/box";
import { Center } from "@/components/ui/center";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import en from "@/content/en";
import { useDemoMode } from "@/contexts/DemoContext";
import { Button } from "./ui/button";

/**
 * A reusable login prompt screen that displays when a user needs to authenticate.
 * Shows an icon, heading, subtitle, and sign in button in a centered layout.
 * All text is localized from content/en.ts
 */
export function LoginPrompt() {
  const { provider } = useDemoMode();

  const handleLogin = async () => {
    if (!provider) return;

    provider.login().then(() => {
      provider.request({
        method: "eth_requestAccounts",
      })
    });

  };
  return (
    <SafeAreaView className="flex-1 bg-white">
      <Center className="flex-1 px-6">
        <VStack className="items-center gap-6">
          <VStack className="items-center gap-4">
            <Box className="w-20 h-20 bg-gray-100 rounded-full items-center justify-center">
              <MaterialIcons name="account-circle" size={40} color="#9ca3af" />
            </Box>
            <VStack className="items-center gap-2">
              <Heading className="text-xl font-bold text-gray-900 text-center">
                {en.page.loginScreen.heading}
              </Heading>
              <Text className="text-base text-gray-600 text-center">
                {en.page.loginScreen.subtitle}
              </Text>
            </VStack>
          </VStack>

          <Button onPress={handleLogin}>
            <Text className="text-white">{en.page.loginScreen.buttonLabel}</Text>
          </Button>
        </VStack>
      </Center>
    </SafeAreaView>
  );
}
