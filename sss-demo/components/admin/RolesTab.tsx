"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Panel, Field, Btn, TxResult, Spinner } from "@/components/ui";

const ROLES = ["minter", "blacklister", "pauser", "seizer"] as const;
type Role = (typeof ROLES)[number];

export function RolesTab({ mint }: { mint: string }) {
  const [role, setRole] = useState<Role>("minter");
  const [address, setAddress] = useState("");
  const [quotaLimit, setQuotaLimit] = useState("1000000000");
  const [loading, setLoading] = useState<"grant" | "revoke" | "check" | null>(
    null,
  );
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const reset = () => {
    setResult(null);
    setError("");
  };

  const check = async () => {
    if (!address) return;
    setLoading("check");
    reset();
    try {
      const data = await api.roles.check(mint, address, role);
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  };

  const grant = async () => {
    if (!address) return;
    setLoading("grant");
    reset();
    try {
      const data = await api.roles.grant(
        mint,
        address,
        role,
        role === "minter" ? quotaLimit : undefined,
      );
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  };

  const revoke = async () => {
    if (!address) return;
    setLoading("revoke");
    reset();
    try {
      const data = await api.roles.revoke(mint, address, role);
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Panel title="Manage Roles" tag="RBAC">
        {/* Role selector */}
        <div
          style={{
            display: "flex",
            gap: 6,
            marginBottom: 16,
            flexWrap: "wrap",
          }}
        >
          {ROLES.map((r) => (
            <button
              key={r}
              onClick={() => {
                setRole(r);
                reset();
              }}
              style={{
                padding: "5px 14px",
                background: role === r ? "var(--primary-dim)" : "transparent",
                border: `1px solid ${
                  role === r ? "var(--primary)" : "var(--border)"
                }`,
                color: role === r ? "var(--primary)" : "var(--text-muted)",
                borderRadius: 4,
                cursor: "pointer",
                fontFamily: "var(--mono)",
                fontSize: 11,
                letterSpacing: "0.06em",
              }}
            >
              {r}
            </button>
          ))}
        </div>

        <Field label="Wallet Address">
          <input
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              reset();
            }}
            placeholder="address to grant/revoke"
          />
        </Field>

        {role === "minter" && (
          <Field label="Quota Limit (raw token units)">
            <input
              type="number"
              value={quotaLimit}
              onChange={(e) => setQuotaLimit(e.target.value)}
              placeholder="1000000000"
            />
          </Field>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <Btn
            onClick={check}
            disabled={!address || loading !== null}
            variant="ghost"
          >
            {loading === "check" ? (
              <>
                <Spinner />
                checking…
              </>
            ) : (
              "$ check"
            )}
          </Btn>
          <Btn
            onClick={grant}
            disabled={!address || loading !== null}
            variant="primary"
          >
            {loading === "grant" ? (
              <>
                <Spinner />
                granting…
              </>
            ) : (
              "$ grant"
            )}
          </Btn>
          <Btn
            onClick={revoke}
            disabled={!address || loading !== null}
            variant="danger"
          >
            {loading === "revoke" ? (
              <>
                <Spinner />
                revoking…
              </>
            ) : (
              "$ revoke"
            )}
          </Btn>
        </div>

        {/* Check result */}
        {result && !result.signature && (
          <div
            style={{
              marginTop: 12,
              padding: "10px 12px",
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              borderRadius: 4,
              fontFamily: "var(--mono)",
              fontSize: 11,
            }}
          >
            <span
              style={{
                color: result.hasRole ? "var(--green)" : "var(--text-muted)",
              }}
            >
              {result.hasRole ? "✓ has role" : "✗ no role"}
            </span>
            {result.quota && (
              <div style={{ marginTop: 6, color: "var(--text-muted)" }}>
                quota: {result.quota.limit} · used: {result.quota.used} ·
                active: {String(result.quota.isActive)}
              </div>
            )}
          </div>
        )}

        <TxResult sig={result?.signature} error={error} />
      </Panel>
    </div>
  );
}
