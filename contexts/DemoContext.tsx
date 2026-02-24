import { supportedChains } from "@/config/chains";
import {
  createExpoNativeBrowser,
  initWaapNative,
  NativeEthereumProvider,
} from "@human.tech/waap-sdk-react-native";
import * as WebBrowser from 'expo-web-browser';
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Chain, createPublicClient, http, PublicClient } from "viem";

interface DemoContextType {
  isDemoMode: boolean;
  toggleDemoMode: () => void;
  isConnected: boolean;
  provider: NativeEthereumProvider | null;
  account: `0x${string}` | null;
  chainId: number | null;
  setChainId: (chainId: number) => void;
  publicClient: PublicClient | null;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [provider, setProvider] = useState<NativeEthereumProvider | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [account, setAccount] = useState<`0x${string}` | null>(null);

  // Create public client that updates when chainId changes
  const publicClient = useMemo(() => {
    if (!chainId) return null;

    const chain = supportedChains.find((c) => c.id === chainId);
    if (!chain) {
      console.warn(`Chain with ID ${chainId} not found in supported chains`);
      return null;
    }

    return createPublicClient({
      chain: chain as Chain,
      transport: http(),
    });
  }, [chainId]);

  // Initialize SDK
  useEffect(() => {
    try {
      const provider = initWaapNative({
        customConfig: {
          styles: {
            darkMode: true,
          },
          showSecured: false,
          authenticationMethods: ["email", "phone", "social", "wallet"],
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

  const autoConnect = async (provider: NativeEthereumProvider) => {
    try {
      const accounts = (await provider.request({
        method: "eth_requestAccounts",
      })) as string[];

      console.log("accounts", accounts);
      if (accounts && accounts.length > 0) {
        setAccount(accounts[0] as `0x${string}`);

        // TODO: This will all be provided by the events, just to test
        const chainId = (await provider.request({
          method: "eth_chainId",
          params: [],
        })) as string;

        console.log("chainId", chainId);
        setChainId(parseInt(chainId, 16));
      }
    } catch {
      console.log("Auto-connect failed (user not logged in)");
    }
  };

  useEffect(() => {
    if (!provider) return;
    // Listen to events
    provider.on("accountsChanged", (accounts: string[]) => {
      console.log("Accounts changed:", accounts);
      setAccount((accounts[0] as `0x${string}`) || null);
    });

    provider.on("chainChanged", (newChainId: string) => {
      console.log("Chain changed to:", newChainId);
      setChainId(parseInt(newChainId, 16));
    });

    provider.on("connect", (connectInfo: { chainId: string }) => {
      console.log("Connected to chain:", connectInfo.chainId);
      setChainId(parseInt(connectInfo.chainId, 16));
    });

    provider.on("disconnect", (_error: any) => {
      console.log("Disconnected");
      setAccount(null);
    });


    provider.login();

    // Try auto-connect
    autoConnect(provider);
  }, [provider]);

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
