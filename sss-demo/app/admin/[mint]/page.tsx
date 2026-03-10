"use client";

import { useState, useEffect, use } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useRouter } from "next/navigation";
import { api } from "../../../lib/api";
import { useNetwork } from "@/components/WalletContext";
import { RolesTab } from "@/components/admin/RolesTab";
import { ComplianceTab } from "@/components/admin/ComplianceTab";
import { OperationsTab } from "@/components/admin/OperationsTab";
import { ConfigTab } from "@/components/admin/ConfigTab";
import { Spinner } from "@/components/ui";

type Tab = "roles" | "compliance" | "operations" | "config";

const TABS: { id: Tab; label: string; desc: string }[] = [
  { id: "roles", label: "Roles", desc: "grant / revoke · minter quotas" },
  { id: "compliance", label: "Compliance", desc: "blacklist · seize (SSS-2)" },
  { id: "operations", label: "Operations", desc: "pause · freeze / thaw" },
  { id: "config", label: "Config", desc: "mint info · transfer authority" },
];

export default function AdminConsolePage({
  params,
}: {
  params: Promise<{ mint: string }>;
}) {
  const { mint } = use(params);
  const { publicKey } = useWallet();
  const { network } = useNetwork();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<Tab>("roles");
  const [config, setConfig] = useState<any>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [configError, setConfigError] = useState("");
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => setMounted(true), []);

  // Fetch config + check authority
  useEffect(() => {
    if (!mounted || !publicKey) return;

    const check = async () => {
      setLoadingConfig(true);
      setConfigError("");
      try {
        const { config: c } = await api.mint.config(mint);
        setConfig(c);
        if (c.authority === publicKey.toBase58()) {
          setAuthorized(true);
        } else {
          setAuthorized(false);
          setConfigError(
            `Not authorized. Authority: ${c.authority.slice(0, 8)}…`,
          );
        }
      } catch (e: any) {
        setConfigError(e.message);
      } finally {
        setLoadingConfig(false);
      }
    };

    check();
  }, [mounted, publicKey, mint]);

  // ── Loading ──────────────────────────────────────────
  if (!mounted || loadingConfig) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 12,
            color: "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Spinner /> loading…
        </div>
      </div>
    );
  }

  // ── Not connected ────────────────────────────────────
  if (!publicKey) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 12,
            color: "var(--text-muted)",
          }}
        >
          connect wallet to continue
        </div>
        <WalletMultiButton />
      </div>
    );
  }

  // ── Unauthorized ─────────────────────────────────────
  if (!authorized || configError) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 16,
          padding: 24,
        }}
      >
        <div
          style={{
            maxWidth: 420,
            width: "100%",
            padding: "20px 24px",
            background: "var(--surface)",
            border: "1px solid var(--red)",
            borderRadius: 8,
            fontFamily: "var(--mono)",
            fontSize: 12,
          }}
        >
          <div style={{ color: "var(--red)", marginBottom: 12, fontSize: 14 }}>
            ⛔ Access Denied
          </div>
          <div style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>
            {configError}
          </div>
          <div
            style={{ marginTop: 16, color: "var(--text-dim)", fontSize: 11 }}
          >
            connected: {publicKey.toBase58().slice(0, 16)}…
          </div>
        </div>
        <a
          href="/admin"
          style={{
            fontFamily: "var(--mono)",
            fontSize: 11,
            color: "var(--text-muted)",
          }}
        >
          ← back
        </a>
      </div>
    );
  }

  // ── Console ──────────────────────────────────────────
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
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <a
            href="/admin"
            style={{
              fontFamily: "var(--mono)",
              fontSize: 11,
              color: "var(--text-muted)",
              textDecoration: "none",
            }}
          >
            ← admin
          </a>
          <span style={{ color: "var(--border)" }}>|</span>
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: 11,
              color: "var(--primary)",
            }}
          >
            {mint.slice(0, 8)}…{mint.slice(-6)}
          </span>
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: 10,
              background: config.isPaused
                ? "var(--red-dim)"
                : "var(--green-dim)",
              color: config.isPaused ? "var(--red)" : "var(--green)",
              padding: "2px 8px",
              borderRadius: 3,
            }}
          >
            {config.isPaused ? "PAUSED" : "ACTIVE"}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: 10,
              color: "var(--text-muted)",
            }}
          >
            {network}
          </span>
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: 10,
              color: "var(--green)",
            }}
          >
            ✓ authority
          </span>
          {mounted && <WalletMultiButton />}
        </div>
      </header>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Sidebar tabs */}
        <nav
          style={{
            width: 200,
            borderRight: "1px solid var(--border)",
            background: "var(--surface)",
            padding: "16px 0",
            flexShrink: 0,
          }}
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                width: "100%",
                padding: "12px 20px",
                textAlign: "left",
                background: tab === t.id ? "var(--primary-dim)" : "transparent",
                borderLeft: `2px solid ${
                  tab === t.id ? "var(--primary)" : "transparent"
                }`,
                border: "none",
                borderLeftStyle: "solid",
                borderLeftWidth: 2,
                borderLeftColor:
                  tab === t.id ? "var(--primary)" : "transparent",
                cursor: "pointer",
                transition: "all 0.1s",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 12,
                  fontWeight: 600,
                  color: tab === t.id ? "var(--primary)" : "var(--text-muted)",
                  marginBottom: 2,
                }}
              >
                {t.label}
              </div>
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 10,
                  color: "var(--text-dim)",
                }}
              >
                {t.desc}
              </div>
            </button>
          ))}

          <div
            style={{
              margin: "16px 20px 0",
              borderTop: "1px solid var(--border)",
              paddingTop: 16,
            }}
          >
            <a
              href="/"
              style={{
                fontFamily: "var(--mono)",
                fontSize: 10,
                color: "var(--text-dim)",
                textDecoration: "none",
                display: "block",
              }}
            >
              → user app
            </a>
          </div>
        </nav>

        {/* Content */}
        <main style={{ flex: 1, padding: 24, overflowY: "auto" }}>
          <div style={{ maxWidth: 720 }}>
            {tab === "roles" && <RolesTab mint={mint} />}
            {tab === "compliance" && <ComplianceTab mint={mint} />}
            {tab === "operations" && (
              <OperationsTab mint={mint} isPaused={config.isPaused} />
            )}
            {tab === "config" && <ConfigTab mint={mint} config={config} />}
          </div>
        </main>
      </div>
    </div>
  );
}
