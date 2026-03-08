"use client";

import { WalletContextProvider } from "@/components/WalletContext";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return <WalletContextProvider>{children}</WalletContextProvider>;
}
