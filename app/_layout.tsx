import "@walletconnect/react-native-compat";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as React from "react";

import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { DemoProvider } from "@/contexts/DemoContext";
import "@/global.css";
import { useDeepLink } from "@/hooks/useDeepLink";
import { WaaPWalletModule } from "@/components/WaaPWalletModule";
import { StellarDisbursementsProvider } from "@/hooks/useStellarDisbursements";
import { StellarWalletProvider } from "@/hooks/useNativeStellarWallet";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Toast, {
  BaseToast,
  ErrorToast,
  InfoToast,
} from "react-native-toast-message";

// Make React globally available for libraries that use React.createElement without importing
if (typeof window !== "undefined") {
  (window as any).React = React;
}

const queryClient = new QueryClient();

const toastConfig = {
  success: (props: any) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: "#16a34a",
        minHeight: 60,
      }}
      contentContainerStyle={{
        paddingHorizontal: 15,
        paddingVertical: 10,
      }}
      text1Style={{
        fontSize: 15,
        fontWeight: "600",
      }}
      text2Style={{
        fontSize: 13,
        lineHeight: 18,
      }}
      text1NumberOfLines={0}
      text2NumberOfLines={0}
    />
  ),
  error: (props: any) => (
    <ErrorToast
      {...props}
      style={{
        borderLeftColor: "#dc2626",
        minHeight: 60,
      }}
      contentContainerStyle={{
        paddingHorizontal: 15,
        paddingVertical: 10,
      }}
      text1Style={{
        fontSize: 15,
        fontWeight: "600",
      }}
      text2Style={{
        fontSize: 13,
        lineHeight: 18,
      }}
      text1NumberOfLines={0}
      text2NumberOfLines={0}
    />
  ),
  info: (props: any) => (
    <InfoToast
      {...props}
      style={{
        borderLeftColor: "#2563eb",
        minHeight: 60,
      }}
      contentContainerStyle={{
        paddingHorizontal: 15,
        paddingVertical: 10,
      }}
      text1Style={{
        fontSize: 15,
        fontWeight: "600",
      }}
      text2Style={{
        fontSize: 13,
        lineHeight: 18,
      }}
      text1NumberOfLines={0}
      text2NumberOfLines={0}
    />
  ),
  warning: (props: any) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: "#ea580c",
        minHeight: 60,
      }}
      contentContainerStyle={{
        paddingHorizontal: 15,
        paddingVertical: 10,
      }}
      text1Style={{
        fontSize: 15,
        fontWeight: "600",
      }}
      text2Style={{
        fontSize: 13,
        lineHeight: 18,
      }}
      text1NumberOfLines={0}
      text2NumberOfLines={0}
    />
  ),
};

export default function RootLayout() {
  // Initialize deep link handling
  useDeepLink();
  // const appOwnership = Constants.appOwnership;
  // const isAppKitSupported = appOwnership !== "expo";

  return (
    <SafeAreaProvider>
      <GluestackUIProvider mode="light">
        <DemoProvider>
          <StellarWalletProvider>
            <StellarDisbursementsProvider>
              <QueryClientProvider client={queryClient}>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(tabs)" />
                </Stack>
                <WaaPWalletModule />
                {/* <StatusBar style="auto" /> */}
                <Toast config={toastConfig} />
              </QueryClientProvider>
            </StellarDisbursementsProvider>
          </StellarWalletProvider>
        </DemoProvider>
      </GluestackUIProvider>
    </SafeAreaProvider>
  );
}
