"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Panel, Field, Btn, TxResult, Spinner, Tag } from "@/components/ui";

export function ConfigTab({ mint, config }: { mint: string; config: any }) {
  const [newAuthority, setNewAuthority] = useState("");
  const [loading, setLoading] = useState(false);
  const [sig, setSig] = useState("");
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const transfer = async () => {
    if (!newAuthority || !confirmed) return;
    setLoading(true);
    setSig("");
    setError("");
    try {
      const data = await api.mint.transferAuthority(mint, newAuthority);
      setSig(data.signature);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Mint info */}
      <Panel title="Mint Config" tag="ON-CHAIN">
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 12,
            display: "grid",
            gap: 10,
          }}
        >
          {[
            ["mint", mint],
            ["authority", config.authority],
            ["status", config.isPaused ? "PAUSED" : "ACTIVE"],
            ["preset", config.preset ?? "unknown"],
          ].map(([label, value]) => (
            <div
              key={label}
              style={{ display: "flex", gap: 16, alignItems: "baseline" }}
            >
              <span
                style={{ color: "var(--text-muted)", width: 80, flexShrink: 0 }}
              >
                {label}
              </span>
              <span
                style={{
                  color:
                    label === "status"
                      ? value === "PAUSED"
                        ? "var(--red)"
                        : "var(--green)"
                      : "var(--text)",
                  wordBreak: "break-all",
                }}
              >
                {value}
              </span>
            </div>
          ))}
        </div>
      </Panel>

      {/* Transfer authority */}
      <Panel title="Transfer Authority" tag="DANGER ZONE">
        <div
          style={{
            marginBottom: 16,
            padding: "10px 12px",
            background: "var(--red-dim)",
            border: "1px solid var(--red)",
            borderRadius: 4,
            fontFamily: "var(--mono)",
            fontSize: 11,
            color: "var(--red)",
          }}
        >
          ⚠ This is irreversible. The new authority will have full control over
          this mint.
        </div>

        <Field label="New Authority Address">
          <input
            value={newAuthority}
            onChange={(e) => {
              setNewAuthority(e.target.value);
              setSig("");
              setError("");
            }}
            placeholder="new authority wallet"
          />
        </Field>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 14,
            fontFamily: "var(--mono)",
            fontSize: 11,
            color: "var(--text-muted)",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            style={{ width: "auto" }}
          />
          I understand this action is irreversible
        </label>

        <Btn
          onClick={transfer}
          disabled={!newAuthority || !confirmed || loading}
          variant="danger"
          full
        >
          {loading ? (
            <>
              <Spinner />
              transferring…
            </>
          ) : (
            "$ transfer authority"
          )}
        </Btn>
        <TxResult sig={sig} error={error} />
      </Panel>
    </div>
  );
}
