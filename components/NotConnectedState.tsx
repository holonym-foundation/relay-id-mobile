import React, { useCallback } from "react";
import { Platform, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

import { Box } from "@/components/ui/box";
import { Center } from "@/components/ui/center";
import { Heading } from "@/components/ui/heading";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { useDemoMode } from "@/contexts/DemoContext";
import { useRouter } from "expo-router";
import { AppHeader } from "./AppHeader";
import { Button } from "./ui/button";

interface NotConnectedStateProps {
  icon: string;
  title: string;
  description: string;
  buttonLabel?: string;
  isLogin?: boolean;
}

export function NotConnectedState({
  icon,
  title,
  description,
  buttonLabel = "Sign in to RelayID",
  isLogin = false,
}: NotConnectedStateProps) {
  const { provider, signIn, cancelSignIn, isSigningIn } = useDemoMode();
  const router = useRouter();

  const handleClick = useCallback(() => {
    if (!provider) return;

    if (isLogin) void signIn();
    else router.push("/(tabs)/(home)");
  }, [isLogin, provider, router, signIn]);



  return (
    <SafeAreaView className="flex-1 bg-white">
      <AppHeader />
      <Center className="flex-1 px-6">
        <VStack className="items-center gap-6">
          <VStack className="items-center gap-4">
            <Box className="w-20 h-20 bg-gray-100 rounded-full items-center justify-center">
              <MaterialIcons name={icon} size={40} color="#9ca3af" />
            </Box>
            <VStack className="items-center gap-2">
              <Heading className="text-xl font-bold text-gray-900 text-center">
                {title}
              </Heading>
              <Text className="text-base text-gray-600 text-center">
                {description}
              </Text>
            </VStack>
          </VStack>
          {isLogin && isSigningIn ? (
            <VStack className="items-center gap-3">
              <Spinner size="large" />
              <Text className="text-base text-gray-600 text-center">
                Finishing sign-in…
              </Text>
              {Platform.OS === "android" && (
                <Text className="text-sm text-gray-500 text-center">
                  If the browser is still open, close it to return here.
                </Text>
              )}
              <Pressable onPress={cancelSignIn} accessibilityRole="button">
                <Text className="text-sm text-blue-600">Cancel</Text>
              </Pressable>
            </VStack>
          ) : (
            <Button onPress={handleClick}>
              <Text className="text-white">{buttonLabel}</Text>
            </Button>
          )}
        </VStack>
      </Center>
    </SafeAreaView>
  );
}
