"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useNetwork, type Network } from "@/components/WalletContext";
import { InitMint } from "@/components/InitMint";
import { MintBurn } from "@/components/MintBurn";
import { FreezeThaw } from "@/components/FreezeThaw";
import { Blacklist } from "@/components/Blacklist";

export default function Home() {
  const { publicKey } = useWallet();
  const { network, setNetwork } = useNetwork();
  const [mintAddress, setMintAddress] = useState("");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      {/* Top bar */}
      <header
        style={{
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
          padding: "0 24px",
          height: 48,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--primary)",
              letterSpacing: "0.05em",
            }}
          >
            SSS<span style={{ color: "var(--text-muted)" }}>/</span>console
          </span>
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: 10,
              color: "var(--text-dim)",
              letterSpacing: "0.08em",
            }}
          >
            SOLANA STABLECOIN STANDARD
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Network switcher */}
          <div
            style={{
              display: "flex",
              border: "1px solid var(--border)",
              borderRadius: 4,
              overflow: "hidden",
            }}
          >
            {(["localnet", "devnet"] as Network[]).map((n) => (
              <button
                key={n}
                onClick={() => setNetwork(n)}
                style={{
                  padding: "4px 12px",
                  fontFamily: "var(--mono)",
                  fontSize: 10,
                  letterSpacing: "0.08em",
                  background:
                    network === n ? "var(--primary-dim)" : "transparent",
                  color: network === n ? "var(--primary)" : "var(--text-muted)",
                  border: "none",
                  cursor: "pointer",
                  borderRight:
                    n === "localnet" ? "1px solid var(--border)" : "none",
                }}
              >
                {n}
              </button>
            ))}
          </div>

          {/* Status dot */}
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontFamily: "var(--mono)",
              fontSize: 10,
              color: "var(--text-muted)",
            }}
          >
            {mounted && (
              <>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: publicKey ? "var(--green)" : "var(--red)",
                    boxShadow: publicKey ? "0 0 6px var(--green)" : "none",
                    animation: publicKey ? "pulse 2s infinite" : "none",
                  }}
                />
                {publicKey
                  ? `${publicKey.toBase58().slice(0, 4)}…${publicKey
                      .toBase58()
                      .slice(-4)}`
                  : "disconnected"}
              </>
            )}
          </span>

          {mounted && <WalletMultiButton />}
        </div>
      </header>

      {/* Body */}
      <main
        style={{
          flex: 1,
          padding: "24px",
          maxWidth: 1100,
          margin: "0 auto",
          width: "100%",
        }}
      >
        {/* Active mint bar */}
        <div
          style={{
            marginBottom: 20,
            padding: "8px 14px",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 4,
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontFamily: "var(--mono)",
            fontSize: 11,
          }}
        >
          <span style={{ color: "var(--text-muted)", flexShrink: 0 }}>
            active mint
          </span>
          {mintAddress ? (
            <>
              <span style={{ color: "var(--green)", wordBreak: "break-all" }}>
                {mintAddress}
              </span>
              <button
                onClick={() => setMintAddress("")}
                style={{
                  marginLeft: "auto",
                  flexShrink: 0,
                  background: "transparent",
                  border: "1px solid var(--border)",
                  color: "var(--text-muted)",
                  padding: "2px 8px",
                  fontFamily: "var(--mono)",
                  fontSize: 10,
                  cursor: "pointer",
                  borderRadius: 3,
                }}
              >
                clear
              </button>
            </>
          ) : (
            <span style={{ color: "var(--text-dim)" }}>
              none — deploy a mint below or paste an address
            </span>
          )}
          {!mintAddress && (
            <input
              placeholder="paste existing mint address…"
              style={{ marginLeft: "auto", width: 360, fontSize: 11 }}
              onBlur={(e) => {
                if (e.target.value.length > 30)
                  setMintAddress(e.target.value.trim());
              }}
            />
          )}
        </div>

        {/* Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(480px, 1fr))",
            gap: 16,
          }}
        >
          <InitMint onMintCreated={setMintAddress} />
          <MintBurn mintAddress={mintAddress} />
          <FreezeThaw mintAddress={mintAddress} />
          <Blacklist mintAddress={mintAddress} />
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: 32,
            textAlign: "center",
            fontFamily: "var(--mono)",
            fontSize: 10,
            color: "var(--text-dim)",
            letterSpacing: "0.08em",
          }}
        >
          @stbr/sss-token · {network} ·{" "}
          {publicKey ? "wallet connected" : "wallet not connected"}
        </div>
      </main>
    </div>
  );
}
