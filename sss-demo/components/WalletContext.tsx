"use client";

import {
  createContext,
  useContext,
  useState,
  useMemo,
  type ReactNode,
} from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import "@solana/wallet-adapter-react-ui/styles.css";

export type Network = "localnet" | "devnet";

const ENDPOINTS: Record<Network, string> = {
  localnet: "http://localhost:8899",
  devnet: "https://api.devnet.solana.com",
};

const NetworkContext = createContext<{
  network: Network;
  setNetwork: (n: Network) => void;
  endpoint: string;
}>({ network: "localnet", setNetwork: () => {}, endpoint: ENDPOINTS.localnet });

export function useNetwork() {
  return useContext(NetworkContext);
}

export function WalletContextProvider({ children }: { children: ReactNode }) {
  const [network, setNetwork] = useState<Network>("localnet");
  const endpoint = ENDPOINTS[network];
  const wallets = useMemo(() => [], []);

  return (
    <NetworkContext.Provider value={{ network, setNetwork, endpoint }}>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>{children}</WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </NetworkContext.Provider>
  );
}
