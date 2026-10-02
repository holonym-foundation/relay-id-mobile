import { appChain } from "@/config/chains";
import { WAAP_ENVIRONMENT } from "@/lib/constants";
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
  /** Stops waiting for a login the user abandoned in the browser. */
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

    const syncChainId = async () => {
      try {
        const hex = (await provider.request({
          method: "eth_chainId",
          params: [],
        })) as string;
        setChainId(parseInt(hex, 16));
      } catch (error) {
        console.error("Failed to read chain id:", error);
      }
    };

    const onAccountsChanged = (accounts: string[]) => {
      const next = (accounts[0] as `0x${string}` | undefined) || null;
      setAccount(next);
    };
    const onChainChanged = (newChainId: string) => {
      setChainId(parseInt(newChainId, 16));
    };
    // The SDK's connect event can announce 0x1 whatever the wallet's chain.
    const onConnect = () => {
      syncChainId();
    };
    const onDisconnect = () => {
      setAccount(null);
      setChainId(null);
    };

    provider.on("accountsChanged", onAccountsChanged);
    provider.on("chainChanged", onChainChanged);
    provider.on("connect", onConnect);
    provider.on("disconnect", onDisconnect);

    // Restore an existing session without prompting. `eth_accounts` answers
    // `[]` when there is none; signing in is left to the user's tap.
    (async () => {
      try {
        const accounts = (await provider.request({
          method: "eth_accounts",
        })) as string[];
        const restored = accounts?.[0] as `0x${string}` | undefined;
        if (restored) {
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
  }, [provider]);

  const [loginPending, setLoginPending] = useState(false);
  // The SDK settles `login()` with null as soon as the login browser is
  // dismissed, and Android users always dismiss it by hand, so null does not
  // mean cancelled: the wallet may still confirm, and the account then arrives
  // through `accountsChanged`. Keep waiting for it, for a while.
  const [awaitingWallet, setAwaitingWallet] = useState(false);

  useEffect(() => {
    if (!awaitingWallet) return;
    if (account) {
      setAwaitingWallet(false);
      return;
    }
    const timer = setTimeout(() => setAwaitingWallet(false), 45_000);
    return () => clearTimeout(timer);
  }, [awaitingWallet, account]);

  const signIn = useCallback(async () => {
    if (!provider || loginPending) return;
    setLoginPending(true);
    try {
      const method = await provider.login();
      if (method === null) setAwaitingWallet(true);
    } catch (error) {
      console.error("Sign-in failed:", error);
    } finally {
      setLoginPending(false);
    }
  }, [provider, loginPending]);

  const cancelSignIn = useCallback(() => setAwaitingWallet(false), []);

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
        // The chain arrives just after the account; without this the sign-in
        // button would flash back in between.
        isSigningIn: loginPending || awaitingWallet || (!!account && !chainId),
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
