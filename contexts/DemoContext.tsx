import { appChain } from "@/config/chains";
import { WAAP_ENVIRONMENT, WAAP_WALLET_ORIGIN } from "@/lib/constants";
import { marshalTypedData } from "@/lib/utils/serialize";
import {
  createExpoNativeBrowser,
  initWaapNative,
  NativeEthereumProvider,
} from "@human.tech/waap-sdk-react-native";
import * as WebBrowser from 'expo-web-browser';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Chain,
  createPublicClient,
  http,
  numberToHex,
  PublicClient,
  TypedDataDefinition,
} from "viem";

interface DemoContextType {
  isDemoMode: boolean;
  toggleDemoMode: () => void;
  isConnected: boolean;
  provider: NativeEthereumProvider | null;
  account: `0x${string}` | null;
  chainId: number | null;
  setChainId: (chainId: number) => void;
  publicClient: PublicClient;
  signTypedData: (typedData: TypedDataDefinition) => Promise<`0x${string}`>;
  signIn: () => Promise<void>;
  /** Cancels the current attempt and resets the SDK so login can be retried. */
  cancelSignIn: () => void;
  /** From the sign-in tap until the account and its chain are both known. */
  isSigningIn: boolean;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

/**
 * The SDK rejects with plain objects (`{ error }` or `{ code, message }`), which
 * `instanceof Error` checks at the call sites would reduce to a generic message.
 */
export function toError(error: unknown): Error {
  if (error instanceof Error) return error;
  const { message, error: detail } = (error ?? {}) as {
    message?: unknown;
    error?: unknown;
  };
  if (typeof message === "string") return new Error(message);
  if (typeof detail === "string") return new Error(detail);
  return new Error(String(error));
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [provider, setProvider] = useState<NativeEthereumProvider | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [account, setAccount] = useState<`0x${string}` | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const loginPending = useRef(false);
  const sessionGeneration = useRef(0);
  const acceptWalletEvents = useRef(true);
  const loginTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionReset = useRef<Promise<void> | null>(null);

  const finishSignIn = useCallback(() => {
    if (loginTimer.current !== null) clearTimeout(loginTimer.current);
    loginTimer.current = null;
    loginPending.current = false;
    setIsSigningIn(false);
  }, []);

  const cancelSignIn = useCallback(() => {
    sessionGeneration.current += 1;
    acceptWalletEvents.current = false;
    finishSignIn();
    setAccount(null);
    setChainId(null);
    // Native logout settles the SDK's in-flight login and closes its browser.
    // A retry must wait for logout so it cannot erase the new session.
    if (provider && !sessionReset.current) {
      sessionReset.current = provider.logout().catch((error) => {
        console.error("Failed to reset sign-in:", error);
      }).finally(() => {
        sessionReset.current = null;
      });
    }
  }, [provider, finishSignIn]);

  const syncChainId = useCallback(async () => {
    if (!provider || !acceptWalletEvents.current) return;
    const generation = sessionGeneration.current;
    try {
      const hex = (await provider.request({
        method: "eth_chainId",
        params: [],
      })) as string;
      const nextChainId = parseInt(hex, 16);
      if (!Number.isSafeInteger(nextChainId) || nextChainId <= 0) {
        throw new Error("Wallet returned an invalid chain id");
      }
      if (generation === sessionGeneration.current && acceptWalletEvents.current) {
        setChainId(nextChainId);
      }
    } catch (error) {
      console.error("Failed to read chain id:", error);
    }
  }, [provider]);

  useEffect(() => {
    if (account && chainId) finishSignIn();
  }, [account, chainId, finishSignIn]);

  useEffect(() => () => {
    sessionGeneration.current += 1;
    if (loginTimer.current !== null) clearTimeout(loginTimer.current);
  }, []);

  // Leadership lives on the app chain, so read it there rather than on
  // whichever chain the wallet reports.
  const publicClient = useMemo(
    () =>
      createPublicClient({
        chain: appChain as Chain,
        transport: http(),
      }) as PublicClient,
    []
  );

  // Initialize SDK
  useEffect(() => {
    try {
      const provider = initWaapNative({
        environment: WAAP_ENVIRONMENT,
        walletOrigin: WAAP_WALLET_ORIGIN,
        customConfig: {
          styles: {
            darkMode: true,
          },
          showSecured: false,
          // Email's magic link cannot return to the app and phone sign-in is
          // disabled, so neither can complete on mobile.
          authenticationMethods: ["social", "wallet"],
          allowedSocials: ["google", "twitter", "discord", "github", "bluesky"],
        },
        project: {
          appId: "org.refunite.relayid.app",
          nativeRedirect: "relayidmobile://",
          universalRedirect: "https://relayid.app",
        },
        walletConnectProjectId: "e24feb8bc79d4998e172b2270450b0d4",
        nativeBrowser: createExpoNativeBrowser(WebBrowser),
      });

      setProvider(provider);
    } catch (error) {
      console.error("Failed to initialize SDK:", error);
    }
  }, []);

  const toggleDemoMode = () => {
    setIsDemoMode((prev) => !prev);
  };

  useEffect(() => {
    if (!provider) return;

    const onAccountsChanged = (accounts: string[]) => {
      if (!acceptWalletEvents.current) return;
      const next = (accounts[0] as `0x${string}` | undefined) || null;
      setAccount(next);
    };
    const onChainChanged = (newChainId: string) => {
      if (!acceptWalletEvents.current) return;
      setChainId(parseInt(newChainId, 16));
    };
    // The SDK's connect event can announce 0x1 whatever the wallet's chain.
    const onConnect = () => {
      syncChainId();
    };
    const onDisconnect = () => {
      if (!acceptWalletEvents.current) return;
      sessionGeneration.current += 1;
      setAccount(null);
      setChainId(null);
      finishSignIn();
    };

    provider.on("accountsChanged", onAccountsChanged);
    provider.on("chainChanged", onChainChanged);
    provider.on("connect", onConnect);
    provider.on("disconnect", onDisconnect);

    // Restore an existing session without prompting. `eth_accounts` answers
    // `[]` when there is none; signing in is left to the user's tap.
    (async () => {
      const generation = sessionGeneration.current;
      try {
        const accounts = (await provider.request({
          method: "eth_accounts",
        })) as string[];
        const restored = accounts?.[0] as `0x${string}` | undefined;
        if (restored && generation === sessionGeneration.current && acceptWalletEvents.current) {
          setAccount(restored);
          await syncChainId();
        }
      } catch (error) {
        console.log("No session to restore:", error);
      }
    })();

    return () => {
      provider.removeListener("accountsChanged", onAccountsChanged);
      provider.removeListener("chainChanged", onChainChanged);
      provider.removeListener("connect", onConnect);
      provider.removeListener("disconnect", onDisconnect);
    };
  }, [provider, syncChainId, finishSignIn]);

  const signIn = useCallback(async () => {
    if (!provider || loginPending.current) return;
    const generation = ++sessionGeneration.current;
    loginPending.current = true;
    setIsSigningIn(true);
    // Bound even an SDK login that never settles. Allow time for the user to
    // authenticate in the browser, then a shorter window for wallet events.
    loginTimer.current = setTimeout(cancelSignIn, 120_000);
    try {
      await sessionReset.current;
      if (generation !== sessionGeneration.current) return;
      acceptWalletEvents.current = true;
      await provider.login();
      if (generation !== sessionGeneration.current || !loginPending.current) return;
      if (loginTimer.current !== null) clearTimeout(loginTimer.current);
      // A null result means the browser closed, not necessarily cancellation.
      // Keep waiting until BOTH the account and chain are available.
      loginTimer.current = setTimeout(cancelSignIn, 45_000);
      // Retrying an existing SDK session need not emit another connect event.
      await syncChainId();
    } catch (error) {
      if (generation !== sessionGeneration.current || !loginPending.current) return;
      console.error("Sign-in failed:", error);
      cancelSignIn();
    }
  }, [provider, cancelSignIn, syncChainId]);

  const signTypedData = useCallback(
    async (typedData: TypedDataDefinition) => {
      if (!provider || !account) throw new Error("Please connect your wallet first");
      try {
        if (chainId !== appChain!.id) {
          await provider.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: numberToHex(appChain!.id) }],
          });
        }
        return (await provider.request({
          method: "eth_signTypedData_v4",
          // uint256 fields are BigInt, which JSON.stringify cannot encode.
          params: [account, JSON.stringify(marshalTypedData(typedData))],
        })) as `0x${string}`;
      } catch (error) {
        throw toError(error);
      }
    },
    [provider, account, chainId]
  );

  return (
    <DemoContext.Provider
      value={{
        isDemoMode,
        toggleDemoMode,
        isConnected: !!account && !!chainId,
        provider,
        account,
        chainId,
        setChainId,
        publicClient,
        signTypedData,
        signIn,
        cancelSignIn,
        isSigningIn,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
}

export function useDemoMode() {
  const context = useContext(DemoContext);
  if (context === undefined) {
    throw new Error("useDemoMode must be used within a DemoProvider");
  }
  return context;
}
