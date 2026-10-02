import * as Clipboard from 'expo-clipboard';
import { ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

import { StellarDisbursements } from '@/components/StellarDisbursements';
import { AppHeader } from '@/components/AppHeader';
import { NotConnectedState } from '@/components/NotConnectedState';
import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { toError, useDemoMode } from '@/contexts/DemoContext';
import { useNativeStellarWallet } from '@/hooks/useNativeStellarWallet';
import { useToast } from '@/hooks/useToast';

export default function NativeStellarWalletScreen() {
  const { account } = useDemoMode();
  const wallet = useNativeStellarWallet();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const busy = wallet.busy !== null;
  const testnet = wallet.network === 'TESTNET';

  const copy = async (value: string, label: string) => {
    try {
      await Clipboard.setStringAsync(value);
      toast.show({ title: `${label} copied`, action: 'success' });
    } catch (error) {
      toast.show({ title: 'Unable to copy', description: toError(error).message, action: 'error' });
    }
  };

  if (!account) {
    return <NotConnectedState
      icon="account-balance-wallet"
      title="Your native Stellar wallet"
      description="Sign in to see your Stellar address, check your XLM balance, and redeem disbursements."
      isLogin
    />;
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <AppHeader />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 64 }}>
        <VStack className="px-5 py-5 gap-6">
          <HStack className="items-center justify-between">
            <VStack className="gap-1 flex-1">
              <Heading className="text-xl font-bold text-gray-900">Stellar</Heading>
              <Text className="text-sm text-gray-500">Your Stellar account, secured by WaaP.</Text>
            </VStack>
            <Box className={`px-3 py-1 rounded-full ${testnet ? 'bg-amber-100' : 'bg-blue-100'}`}>
              <Text className={`text-xs font-semibold ${testnet ? 'text-amber-800' : 'text-blue-800'}`}>
                {testnet ? 'Testnet' : 'Mainnet'}
              </Text>
            </Box>
          </HStack>

          {wallet.error && (
            <Box className="rounded-xl p-4 border border-red-200 bg-red-50">
              <Text accessibilityRole="alert" className="text-sm text-red-800">{wallet.error}</Text>
            </Box>
          )}

          {!wallet.address ? (
            <VStack className="rounded-xl border border-gray-200 bg-gray-50 p-6 items-center gap-3">
              <MaterialIcons name="account-balance-wallet" size={36} color="#2563eb" />
              {busy ? <ActivityIndicator color="#2563eb" /> : null}
              <Text className="text-center text-gray-600">
                {busy ? 'Connecting your Stellar wallet…' : 'Connect your native Stellar account to get started.'}
              </Text>
              {!busy && <Button onPress={() => void wallet.connect()}>
                <ButtonText>Connect Stellar wallet</ButtonText>
              </Button>}
            </VStack>
          ) : (
            <>
              <VStack className="gap-3">
                <Heading className="text-lg font-semibold text-gray-900">Stellar account</Heading>
                <Box className="rounded-xl border border-green-200 bg-green-50 p-4">
                  <Text className="text-xs font-medium text-green-700 mb-2">Your address</Text>
                  <HStack className="items-center gap-3">
                    <Text selectable className="text-xs font-mono text-green-900 flex-1">{wallet.address}</Text>
                    <Button size="xs" variant="outline" accessibilityLabel="Copy Stellar address"
                      onPress={() => void copy(wallet.address!, 'Stellar address')}>
                      <MaterialIcons name="content-copy" size={16} color="#15803d" />
                    </Button>
                  </HStack>
                </Box>
                <Box className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <HStack className="items-center justify-between mb-2">
                    <Text className="text-xs font-medium text-blue-700">XLM balance</Text>
                    <Button size="xs" variant="link" isDisabled={busy}
                      accessibilityLabel="Refresh Stellar balance" onPress={() => void wallet.refresh()}>
                      <MaterialIcons name="refresh" size={20} color="#2563eb" />
                    </Button>
                  </HStack>
                  {wallet.balance?.exists ? (
                    <Text className="text-2xl font-bold text-blue-800">{wallet.balance.balance} XLM</Text>
                  ) : wallet.balance?.exists === false ? (
                    <Text className="text-sm text-blue-800">Your account needs its first funding to be created on this network.</Text>
                  ) : (
                    <Text className="text-sm text-blue-800">{busy ? 'Reading balance…' : 'Balance unavailable. Tap refresh to try again.'}</Text>
                  )}
                  {testnet && <Text className="text-xs text-blue-700 mt-2">Test XLM has no monetary value.</Text>}
                </Box>
                {testnet && wallet.balance?.exists === false && (
                  <Button isDisabled={busy} onPress={() => void wallet.fund()}>
                    <ButtonText>{wallet.busy === 'fund' ? 'Getting test XLM…' : 'Get test XLM'}</ButtonText>
                  </Button>
                )}
              </VStack>

              <StellarDisbursements />
            </>
          )}
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
}
