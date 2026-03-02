import * as Clipboard from "expo-clipboard";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

import { Box } from "@/components/ui/box";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

import { AppHeader } from "@/components/AppHeader";
import { useDemoMode } from "@/contexts/DemoContext";
import { useToast } from "@/hooks/useToast";
import { STELLAR_API_URL } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Disbursement {
  id: string;
  amount: string;
  createdAt: string;
  txHash: string | null;
}

// ---------------------------------------------------------------------------
// Helper: sign a message via the WaaP provider (personal_sign)
// ---------------------------------------------------------------------------
async function signMessageWithProvider(
  provider: any,
  account: string,
  message: string,
): Promise<string> {
  // personal_sign expects: params[0] = hex-encoded message, params[1] = address
  const msgHex = "0x" + Buffer.from(message).toString("hex");
  const sig = (await provider.request({
    method: "personal_sign",
    params: [msgHex, account],
  })) as string;
  return sig;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StellarWalletScreen() {
  const { account, provider, isConnected } = useDemoMode();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const scrollPaddingBottom = insets.bottom + 64;

  // --- wallet / balance ---
  const [contractAddress, setContractAddress] = useState<string>("");
  const [pendingContractAddress, setPendingContractAddress] = useState<string>("");
  const [hasChecked, setHasChecked] = useState(false);
  const [isCheckingWallet, setIsCheckingWallet] = useState(false);
  const [xlmBalance, setXlmBalance] = useState<string>("0");
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  // --- disbursements ---
  const [disbursements, setDisbursements] = useState<Disbursement[]>([]);
  const [isLoadingDisbursements, setIsLoadingDisbursements] = useState(false);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);

  // --- vote ---
  const [voteChoice, setVoteChoice] = useState<"chicken" | "egg" | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [lastVoteTxHash, setLastVoteTxHash] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Wallet: check + fetch balance
  // ---------------------------------------------------------------------------
  const checkWallet = useCallback(async () => {
    if (!account) return;
    setIsCheckingWallet(true);
    try {
      const res = await fetch(
        `${STELLAR_API_URL}/api/wallet/check?ethAddress=${encodeURIComponent(account)}`,
      );
      const data = await res.json();
      if (data.success && data.exists && data.contractAddress) {
        setContractAddress(data.contractAddress);
        setPendingContractAddress("");
      } else {
        setContractAddress("");
        // Backend always returns the derived address even when not deployed
        if (data.contractAddress) setPendingContractAddress(data.contractAddress);
      }
    } catch (e) {
      console.error("checkWallet error:", e);
    } finally {
      setIsCheckingWallet(false);
      setHasChecked(true);
    }
  }, [account]);

  const fetchBalance = useCallback(async (addr: string) => {
    if (!addr) return;
    setIsLoadingBalance(true);
    try {
      const res = await fetch(
        `${STELLAR_API_URL}/api/wallet/balance?contractAddress=${encodeURIComponent(addr)}`,
      );
      const data = await res.json();
      if (data.success) setXlmBalance(data.xlmBalance ?? "0");
    } catch (e) {
      console.error("fetchBalance error:", e);
    } finally {
      setIsLoadingBalance(false);
    }
  }, []);

  const fetchDisbursements = useCallback(async () => {
    if (!account) return;
    setIsLoadingDisbursements(true);
    try {
      const res = await fetch(
        `${STELLAR_API_URL}/api/user/disbursements?ethAddress=${encodeURIComponent(account)}`,
      );
      const data = await res.json();
      setDisbursements(data.disbursements || []);
    } catch (e) {
      console.error("fetchDisbursements error:", e);
    } finally {
      setIsLoadingDisbursements(false);
    }
  }, [account]);

  // Load everything on connect
  useEffect(() => {
    if (isConnected && account && !hasChecked) {
      checkWallet();
    }
  }, [isConnected, account, hasChecked, checkWallet]);

  useEffect(() => {
    if (contractAddress) {
      fetchBalance(contractAddress);
      fetchDisbursements();
    }
  }, [contractAddress, fetchBalance, fetchDisbursements]);

  // ---------------------------------------------------------------------------
  // Two-phase execute helper: prepare → sign → submit
  // ---------------------------------------------------------------------------
  const executeContract = async (
    contractId: string,
    functionName: string,
    encodedArgs: string[],
    description: string,
    setLoading: (v: boolean) => void,
  ): Promise<string | null> => {
    if (!account || !provider) {
      toast.show({ title: "Not connected", action: "error" });
      return null;
    }

    setLoading(true);
    try {
      // Phase 1: prepare
      const prepRes = await fetch(`${STELLAR_API_URL}/api/wallet/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "prepare",
          contractId,
          functionName,
          encodedArgs,
        }),
      });
      const prepData = await prepRes.json();
      if (!prepRes.ok || !prepData.authHash) {
        throw new Error(prepData.error || "Prepare phase failed");
      }

      const { authHash, encodedAuthEntry, encodedTx, validUntilLedger } = prepData;

      // Phase 2: sign auth hash with WaaP
      setIsSigning(true);
      const messageToSign = "auth hash: " + authHash;
      const signature = await signMessageWithProvider(provider, account, messageToSign);
      setIsSigning(false);

      // Phase 3: submit
      const submitRes = await fetch(`${STELLAR_API_URL}/api/wallet/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit",
          encodedAuthEntry,
          encodedTx,
          validUntilLedger,
          signature,
          contractAddress,
        }),
      });
      const submitData = await submitRes.json();
      if (!submitRes.ok || !submitData.txHash) {
        throw new Error(submitData.error || "Submit phase failed");
      }

      toast.show({
        title: `${description} successful!`,
        description: `Tx: ${submitData.txHash.slice(0, 10)}...`,
        action: "success",
      });
      return submitData.txHash;
    } catch (e: any) {
      console.error(`${description} error:`, e);
      toast.show({
        title: `${description} failed`,
        description: e?.message || String(e),
        action: "error",
      });
      return null;
    } finally {
      setLoading(false);
      setIsSigning(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Vote action
  // ---------------------------------------------------------------------------
  const handleVote = async () => {
    if (!voteChoice) {
      toast.show({ title: "Pick Chicken or Egg first", action: "error" });
      return;
    }
    if (!contractAddress) {
      toast.show({ title: "No Stellar wallet found", action: "error" });
      return;
    }

    // ScVal args: [voter address (ScAddress), isChicken (bool)]
    // We encode them as base64 XDR here – the backend decodes them.
    // Since we can't use the Stellar SDK in React Native, we call a helper
    // endpoint /api/wallet/vote/prepare-args to convert address + bool to XDR.
    setIsVoting(true);
    try {
      const argsRes = await fetch(`${STELLAR_API_URL}/api/wallet/vote-args`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractAddress,
          isChicken: voteChoice === "chicken",
        }),
      });
      const argsData = await argsRes.json();
      if (!argsRes.ok || !argsData.encodedArgs) {
        throw new Error(argsData.error || "Failed to prepare vote args");
      }

      const voteContractId = argsData.voteContractId;
      const txHash = await executeContract(
        voteContractId,
        "vote",
        argsData.encodedArgs,
        "Vote",
        () => {}, // loading managed by isVoting above
      );
      if (txHash) setLastVoteTxHash(txHash);
      setVoteChoice(null);
    } catch (e: any) {
      toast.show({
        title: "Vote failed",
        description: e?.message || String(e),
        action: "error",
      });
    } finally {
      setIsVoting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Redeem disbursement
  // ---------------------------------------------------------------------------
  const handleRedeem = async (d: Disbursement) => {
    if (!account || !provider) return;
    if (!contractAddress) {
      toast.show({ title: "No Stellar wallet found", action: "error" });
      return;
    }

    setRedeemingId(d.id);
    try {
      // Sign a human-readable message to prove ownership
      const message = `Redeem disbursement ${d.id} for amount ${d.amount} XLM`;
      const sig = await signMessageWithProvider(provider, account, message);

      const res = await fetch(`${STELLAR_API_URL}/api/wallet/redeem`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disbursementId: d.id, signature: sig }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Redemption failed");

      toast.show({
        title: `Redeemed ${d.amount} XLM!`,
        action: "success",
      });
      fetchDisbursements();
      fetchBalance(contractAddress);
    } catch (e: any) {
      toast.show({
        title: "Redeem failed",
        description: e?.message || String(e),
        action: "error",
      });
    } finally {
      setRedeemingId(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Copy helper
  // ---------------------------------------------------------------------------
  const copyToClipboard = async (text: string, label: string) => {
    await Clipboard.setStringAsync(text);
    toast.show({ title: `${label} copied`, action: "success" });
  };

  // ---------------------------------------------------------------------------
  // Not connected view
  // ---------------------------------------------------------------------------
  if (!isConnected || !account) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <AppHeader />
        <Box className="flex-1 items-center justify-center px-6">
          <VStack className="items-center gap-4">
            <Box className="w-20 h-20 bg-blue-100 rounded-full items-center justify-center">
              <MaterialIcons name="account-balance-wallet" size={36} color="#2563eb" />
            </Box>
            <Heading className="text-xl font-bold text-gray-900 text-center">
              Stellar Wallet
            </Heading>
            <Text className="text-base text-gray-500 text-center">
              Sign in to view your Stellar smart-contract wallet balance, disbursements, and vote.
            </Text>
          </VStack>
        </Box>
      </SafeAreaView>
    );
  }

  // ---------------------------------------------------------------------------
  // Connected — derive summary stats
  // ---------------------------------------------------------------------------
  const pendingTotal = disbursements
    .filter((d) => !d.txHash)
    .reduce((acc, d) => acc + Number(d.amount), 0);
  const redeemedTotal = disbursements
    .filter((d) => !!d.txHash)
    .reduce((acc, d) => acc + Number(d.amount), 0);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <AppHeader />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: scrollPaddingBottom, flexGrow: 1 }}
      >
        <Box className="px-5 py-5">
          <VStack className="gap-6">

            {/* ------------------------------------------------------------------ */}
            {/* Section 1: Stellar Contract Wallet                                  */}
            {/* ------------------------------------------------------------------ */}
            <VStack className="gap-3">
              <Heading className="text-lg font-semibold text-gray-900">
                Stellar Contract Wallet
              </Heading>

              {isCheckingWallet ? (
                <Box className="bg-gray-50 rounded-xl p-4 border border-gray-200 items-center">
                  <ActivityIndicator size="small" color="#3b82f6" />
                  <Text className="text-sm text-gray-500 mt-2">Checking for wallet…</Text>
                </Box>
              ) : contractAddress ? (
                <VStack className="gap-3">
                  {/* Contract address */}
                  <Box className="bg-green-50 rounded-xl p-4 border border-green-200">
                    <Text className="text-xs font-medium text-green-700 mb-1">Contract Address</Text>
                    <HStack className="items-center justify-between">
                      <Text className="text-xs font-mono text-green-800 flex-1 mr-2" numberOfLines={2}>
                        {contractAddress}
                      </Text>
                      <Button
                        size="xs"
                        variant="outline"
                        className="border-green-300"
                        onPress={() => copyToClipboard(contractAddress, "Contract address")}
                      >
                        <MaterialIcons name="content-copy" size={14} color="#16a34a" />
                      </Button>
                    </HStack>
                  </Box>

                  {/* XLM Balance */}
                  <Box className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                    <HStack className="items-center justify-between mb-1">
                      <Text className="text-xs font-medium text-blue-700">XLM Balance</Text>
                      <Button
                        size="xs"
                        variant="link"
                        onPress={() => fetchBalance(contractAddress)}
                        isDisabled={isLoadingBalance}
                      >
                        <MaterialIcons
                          name="refresh"
                          size={16}
                          color="#3b82f6"
                          style={isLoadingBalance ? { opacity: 0.4 } : {}}
                        />
                      </Button>
                    </HStack>
                    {isLoadingBalance ? (
                      <ActivityIndicator size="small" color="#3b82f6" />
                    ) : (
                      <Text className="text-2xl font-bold text-blue-700">
                        {Number(xlmBalance).toFixed(7)} XLM
                      </Text>
                    )}
                  </Box>
                </VStack>
              ) : hasChecked ? (
                <Box className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                  <VStack className="gap-3">
                    <HStack className="items-start gap-2">
                      <MaterialIcons name="info-outline" size={16} color="#a16207" style={{ marginTop: 2 }} />
                      <Text className="text-sm text-yellow-800 flex-1 leading-5">
                        Upon first disbursement, the wallet on Stellar will be auto deployed.
                      </Text>
                    </HStack>

                    {pendingContractAddress ? (
                      <Box className="bg-yellow-100 rounded-lg p-3 border border-yellow-300">
                        <Text className="text-xs font-medium text-yellow-700 mb-1">Future Contract Address</Text>
                        <HStack className="items-center justify-between">
                          <Text className="text-xs font-mono text-yellow-900 flex-1 mr-2" numberOfLines={2}>
                            {pendingContractAddress}
                          </Text>
                          <Pressable
                            onPress={() => copyToClipboard(pendingContractAddress, "Contract address")}
                            className="p-1"
                          >
                            <MaterialIcons name="content-copy" size={14} color="#a16207" />
                          </Pressable>
                        </HStack>
                      </Box>
                    ) : null}
                  </VStack>
                </Box>
              ) : null}
            </VStack>

            {/* ------------------------------------------------------------------ */}
            {/* Section 2: Disbursements                                            */}
            {/* ------------------------------------------------------------------ */}
            {contractAddress ? (
              <VStack className="gap-3">
                <HStack className="items-center justify-between">
                  <Heading className="text-lg font-semibold text-gray-900">
                    Disbursements
                  </Heading>
                  <Button
                    size="xs"
                    variant="link"
                    onPress={fetchDisbursements}
                    isDisabled={isLoadingDisbursements}
                  >
                    <MaterialIcons
                      name="refresh"
                      size={18}
                      color="#3b82f6"
                      style={isLoadingDisbursements ? { opacity: 0.4 } : {}}
                    />
                  </Button>
                </HStack>

                {isLoadingDisbursements ? (
                  <Box className="bg-gray-50 rounded-xl p-6 border border-gray-200 items-center">
                    <ActivityIndicator size="small" color="#3b82f6" />
                  </Box>
                ) : disbursements.length === 0 ? (
                  <Box className="bg-gray-50 rounded-xl p-6 border border-gray-200 items-center">
                    <MaterialIcons name="inbox" size={32} color="#9ca3af" />
                    <Text className="text-sm text-gray-400 mt-2">No disbursements yet</Text>
                  </Box>
                ) : (
                  <VStack className="gap-3">
                    {/* Summary bar */}
                    <HStack className="gap-3">
                      <Box className="flex-1 bg-orange-50 rounded-xl p-3 border border-orange-200 items-center">
                        <Text className="text-xs text-orange-500 font-semibold uppercase">Pending</Text>
                        <Text className="text-base font-bold text-orange-600 mt-1">
                          {pendingTotal.toFixed(2)} XLM
                        </Text>
                      </Box>
                      <Box className="flex-1 bg-green-50 rounded-xl p-3 border border-green-200 items-center">
                        <Text className="text-xs text-green-500 font-semibold uppercase">Redeemed</Text>
                        <Text className="text-base font-bold text-green-600 mt-1">
                          {redeemedTotal.toFixed(2)} XLM
                        </Text>
                      </Box>
                    </HStack>

                    {/* List */}
                    {disbursements.map((d) => (
                      <HStack
                        key={d.id}
                        className="items-center justify-between bg-white rounded-xl p-4 border border-gray-200 shadow-sm"
                      >
                        <VStack>
                          <Text className="text-sm font-semibold text-gray-900">
                            {Number(d.amount).toFixed(2)} XLM
                          </Text>
                          <Text className="text-xs text-gray-400">
                            {new Date(d.createdAt).toLocaleDateString()}
                          </Text>
                        </VStack>
                        {d.txHash ? (
                          <Box className="px-3 py-1 bg-green-100 rounded-full">
                            <Text className="text-xs font-medium text-green-700">Redeemed</Text>
                          </Box>
                        ) : (
                          <Button
                            size="sm"
                            className="bg-orange-500"
                            onPress={() => handleRedeem(d)}
                            isDisabled={redeemingId === d.id}
                          >
                            <Text className="text-white font-semibold text-xs">
                              {redeemingId === d.id ? "Claiming…" : "Claim"}
                            </Text>
                          </Button>
                        )}
                      </HStack>
                    ))}
                  </VStack>
                )}
              </VStack>
            ) : null}

            {/* ------------------------------------------------------------------ */}
            {/* Section 3: Vote                                                     */}
            {/* ------------------------------------------------------------------ */}
            {contractAddress ? (
              <VStack className="gap-3">
                <Heading className="text-lg font-semibold text-gray-900">
                  Vote: Chicken or Egg?
                </Heading>

                <HStack className="gap-3">
                  {/* Chicken */}
                  <Button
                    className={`flex-1 rounded-xl border-2 h-auto py-4 ${
                      voteChoice === "chicken"
                        ? "bg-yellow-50 border-yellow-400"
                        : "bg-white border-gray-200"
                    }`}
                    variant="outline"
                    onPress={() => setVoteChoice("chicken")}
                    isDisabled={isVoting}
                  >
                    <VStack className="items-center gap-1">
                      <Text className="text-2xl">🐔</Text>
                      <Text
                        className={`text-sm font-semibold ${
                          voteChoice === "chicken" ? "text-yellow-700" : "text-gray-700"
                        }`}
                      >
                        Chicken
                      </Text>
                    </VStack>
                  </Button>

                  {/* Egg */}
                  <Button
                    className={`flex-1 rounded-xl border-2 h-auto py-4 ${
                      voteChoice === "egg"
                        ? "bg-blue-50 border-blue-400"
                        : "bg-white border-gray-200"
                    }`}
                    variant="outline"
                    onPress={() => setVoteChoice("egg")}
                    isDisabled={isVoting}
                  >
                    <VStack className="items-center gap-1">
                      <Text className="text-2xl">🥚</Text>
                      <Text
                        className={`text-sm font-semibold ${
                          voteChoice === "egg" ? "text-blue-700" : "text-gray-700"
                        }`}
                      >
                        Egg
                      </Text>
                    </VStack>
                  </Button>
                </HStack>

                <Button
                  size="lg"
                  className={`w-full rounded-xl ${voteChoice ? "bg-green-600" : "bg-gray-300"}`}
                  onPress={handleVote}
                  isDisabled={!voteChoice || isVoting || isSigning}
                >
                  {isVoting || isSigning ? (
                    <HStack className="items-center gap-2">
                      <ActivityIndicator size="small" color="#ffffff" />
                      <Text className="text-white font-semibold">
                        {isSigning ? "Awaiting signature…" : "Submitting…"}
                      </Text>
                    </HStack>
                  ) : (
                    <Text className="text-white font-semibold text-base">
                      Submit Vote
                    </Text>
                  )}
                </Button>

                {lastVoteTxHash ? (
                  <Box className="bg-green-50 rounded-xl p-3 border border-green-200">
                    <Text className="text-xs font-medium text-green-700 mb-1">✅ Vote submitted</Text>
                    <Pressable onPress={() => copyToClipboard(lastVoteTxHash, "Transaction hash")}>
                      <Text className="text-xs font-mono text-green-800 break-all">
                        {lastVoteTxHash}
                      </Text>
                    </Pressable>
                  </Box>
                ) : null}
              </VStack>
            ) : null}

          </VStack>
        </Box>
      </ScrollView>
    </SafeAreaView>
  );
}
