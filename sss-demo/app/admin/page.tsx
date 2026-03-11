"use client";

import { useState, useEffect } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useRouter } from "next/navigation";
import { SolanaStablecoin } from "@stbr/sss-token";
import { createSolanaClient } from "gill";
import type { Address } from "gill";

export default function AdminPage() {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [mint, setMint] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => setMounted(true), []);

  const enter = async () => {
    if (!mint.trim() || !publicKey) return;
    setLoading(true);
    setError("");

    try {
      const { rpc } = createSolanaClient({ urlOrMoniker: connection.rpcEndpoint as any });
      const stablecoin = new SolanaStablecoin({ rpc: rpc as any }, mint.trim() as Address);
      const rawConfig = await stablecoin.getConfig();
      const authority = (rawConfig as any).masterAuthority ?? (rawConfig as any).master_authority ?? (rawConfig as any).authority;
      if (authority !== publicKey.toBase58()) {
        setError(`Not authorized. Mint authority is ${authority.slice(0, 8)}…`);
        return;
      }
      router.push(`/admin/${mint.trim()}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 48, textAlign: "center" }}>
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 11,
            color: "var(--text-muted)",
            letterSpacing: "0.15em",
            marginBottom: 12,
          }}
        >
          SOLANA STABLECOIN STANDARD
        </div>
        <h1
          style={{
            fontFamily: "var(--mono)",
            fontSize: 28,
            fontWeight: 600,
            color: "var(--text)",
            letterSpacing: "-0.5px",
          }}
        >
          Admin Console
        </h1>
        <p
          style={{
            fontFamily: "var(--sans)",
            color: "var(--text-muted)",
            marginTop: 8,
            fontSize: 13,
          }}
        >
          Connect the authority wallet to manage a deployed mint
        </p>
      </div>

      {/* Card */}
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: 28,
        }}
      >
        {/* Wallet */}
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: 11,
              color: "var(--text-muted)",
              letterSpacing: "0.08em",
              marginBottom: 10,
            }}
          >
            01 / CONNECT WALLET
          </div>
          {mounted ? (
            <WalletMultiButton />
          ) : (
            <div
              style={{
                height: 36,
                background: "var(--surface2)",
                borderRadius: 4,
                border: "1px solid var(--border)",
              }}
            />
          )}
          {mounted && publicKey && (
            <div
              style={{
                marginTop: 8,
                fontFamily: "var(--mono)",
                fontSize: 11,
                color: "var(--green)",
              }}
            >
              ✓ {publicKey.toBase58().slice(0, 16)}…
              {publicKey.toBase58().slice(-8)}
            </div>
          )}
        </div>

        {/* Mint input */}
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: 11,
              color: "var(--text-muted)",
              letterSpacing: "0.08em",
              marginBottom: 10,
            }}
          >
            02 / ENTER MINT ADDRESS
          </div>
          <input
            value={mint}
            onChange={(e) => {
              setMint(e.target.value);
              setError("");
            }}
            placeholder="mint address…"
            onKeyDown={(e) => e.key === "Enter" && enter()}
            style={{ fontFamily: "var(--mono)", fontSize: 12 }}
          />
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              marginBottom: 16,
              padding: "8px 12px",
              background: "var(--red-dim)",
              border: "1px solid var(--red)",
              borderRadius: 4,
              fontFamily: "var(--mono)",
              fontSize: 11,
              color: "var(--red)",
            }}
          >
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={enter}
          disabled={!mounted || !publicKey || !mint.trim() || loading}
          style={{
            width: "100%",
            padding: "10px",
            background: "var(--primary-dim)",
            border: "1px solid var(--primary)",
            color: "var(--primary)",
            borderRadius: 4,
            fontFamily: "var(--mono)",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.08em",
            cursor: "pointer",
            opacity: !publicKey || !mint.trim() ? 0.4 : 1,
          }}
        >
          {loading ? "verifying authority…" : "$ enter console →"}
        </button>
      </div>

      {/* Back */}
      <a
        href="/"
        style={{
          marginTop: 24,
          fontFamily: "var(--mono)",
          fontSize: 11,
          color: "var(--text-muted)",
        }}
      >
        ← back to app
      </a>
    </div>
  );
}
