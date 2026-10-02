import { ActivityIndicator, Linking } from 'react-native';
import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useStellarDisbursements } from '@/hooks/useStellarDisbursements';
import { useNativeStellarWallet } from '@/hooks/useNativeStellarWallet';
import { useToast } from '@/hooks/useToast';
import { transactionUrl } from '@/lib/stellar-native';
import type { Disbursement } from '@/lib/stellar-disbursements';

const statusLabels: Record<Disbursement['status'], string> = {
  pending: 'Ready to redeem', redeeming: 'Processing…', redeemed: 'Received',
  needs_review: 'Being checked', cancelled: 'Cancelled',
};
export function StellarDisbursements() {
  const disbursements = useStellarDisbursements();
  const { network } = useNativeStellarWallet();
  const toast = useToast();
  const busy = !!disbursements.busy || disbursements.walletBusy;
  const openTransaction = async (hash: string) => {
    try { await Linking.openURL(transactionUrl(network, hash)); }
    catch { toast.show({ title: 'Unable to open transaction', action: 'error' }); }
  };
  return (
    <VStack className="gap-3">
      <HStack className="items-center justify-between">
        <Heading className="text-lg font-semibold text-gray-900">Disbursements</Heading>
        {disbursements.authenticated && <Button size="sm" variant="link" isDisabled={busy} onPress={() => void disbursements.refresh()}>
          <ButtonText>Refresh</ButtonText>
        </Button>}
      </HStack>
      <Text className="text-sm text-gray-600">Receive XLM assigned to your Stellar account. Approve a message in WaaP to redeem it. You pay no network fee.</Text>
      {!disbursements.configured ? (
        <Text className="text-sm text-gray-600">{disbursements.configurationError ?? 'Disbursements will be available when the RelayID server is configured.'}</Text>
      ) : <>
        {disbursements.error && <Box className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <Text accessibilityRole="alert" className="text-sm text-amber-900">{disbursements.error}</Text>
        </Box>}
        {disbursements.busy && <HStack className="gap-2 items-center">
          <ActivityIndicator color="#2563eb" />
          <Text accessibilityLiveRegion="polite" className="text-sm text-gray-600">
            {disbursements.busy === 'redeem' ? 'Redeeming… this can take a minute.' :
              disbursements.busy === 'signIn' ? 'Approve the signature in WaaP…' : 'Checking disbursements…'}
          </Text>
        </HStack>}
        {!disbursements.authenticated && disbursements.busy !== 'restore' && (
          <Button variant="outline" isDisabled={busy} onPress={() => void disbursements.signIn()}>
            <ButtonText>Sign to see disbursements</ButtonText>
          </Button>
        )}
        {disbursements.authenticated && disbursements.loaded && disbursements.items.length === 0 && (
          <Box className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <Text className="text-sm text-gray-600">No disbursements yet. When your community leader assigns XLM to this Stellar address, it will appear here.</Text>
          </Box>
        )}
        {disbursements.items.map((item) => <VStack key={item.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4 gap-2">
          <HStack className="items-center justify-between gap-2">
            <Text className="text-lg font-semibold text-gray-900 flex-1">{item.amount} XLM</Text>
            <Text className={`text-xs font-semibold ${item.status === 'redeemed' ? 'text-green-700' : 'text-gray-600'}`}>{statusLabels[item.status]}</Text>
          </HStack>
          <Text className="text-xs text-gray-500">Assigned {new Date(item.createdAt).toLocaleString()}</Text>
          {item.redeemedAt && <Text className="text-xs text-green-700">Received {new Date(item.redeemedAt).toLocaleString()}</Text>}
          {item.status === 'needs_review' && <Text className="text-xs text-gray-600">Payment sent, waiting for confirmation. This updates automatically.</Text>}
          {item.status === 'pending' && <Button isDisabled={busy || !disbursements.fresh} onPress={() => void disbursements.redeem(item.id)}>
            <ButtonText>{disbursements.redeemingId === item.id ? 'Redeeming…' : !disbursements.fresh ? 'Refresh status before redeeming' : 'Redeem'}</ButtonText>
          </Button>}
          {item.txHash && <Button size="sm" variant="link" onPress={() => void openTransaction(item.txHash!)}>
            <ButtonText>View transaction</ButtonText>
          </Button>}
        </VStack>)}
      </>}
    </VStack>
  );
}
