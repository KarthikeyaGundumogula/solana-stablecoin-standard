"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Panel, Field, Btn, TxResult, Spinner, Tag } from "@/components/ui";

export function ComplianceTab({ mint }: { mint: string }) {
  // Blacklist state
  const [blAddress, setBlAddress] = useState("");
  const [blLoading, setBlLoading] = useState<"add" | "remove" | "check" | null>(
    null,
  );
  const [blResult, setBlResult] = useState<any>(null);
  const [blError, setBlError] = useState("");

  // Seize state
  const [seizeSource, setSeizeSource] = useState("");
  const [seizeDest, setSeizeDest] = useState("");
  const [seizeAmount, setSeizeAmount] = useState("");
  const [seizeLoading, setSeizeLoading] = useState(false);
  const [seizeResult, setSeizeResult] = useState<any>(null);
  const [seizeError, setSeizeError] = useState("");

  const blCheck = async () => {
    if (!blAddress) return;
    setBlLoading("check");
    setBlResult(null);
    setBlError("");
    try {
      setBlResult(await api.compliance.check(mint, blAddress));
    } catch (e: any) {
      setBlError(e.message);
    } finally {
      setBlLoading(null);
    }
  };

  const blAdd = async () => {
    if (!blAddress) return;
    setBlLoading("add");
    setBlResult(null);
    setBlError("");
    try {
      setBlResult(await api.compliance.blacklist(mint, blAddress));
    } catch (e: any) {
      setBlError(e.message);
    } finally {
      setBlLoading(null);
    }
  };

  const blRemove = async () => {
    if (!blAddress) return;
    setBlLoading("remove");
    setBlResult(null);
    setBlError("");
    try {
      setBlResult(await api.compliance.unblacklist(mint, blAddress));
    } catch (e: any) {
      setBlError(e.message);
    } finally {
      setBlLoading(null);
    }
  };

  const doSeize = async () => {
    if (!seizeSource || !seizeDest || !seizeAmount) return;
    setSeizeLoading(true);
    setSeizeResult(null);
    setSeizeError("");
    try {
      setSeizeResult(
        await api.compliance.seize(mint, seizeSource, seizeDest, seizeAmount),
      );
    } catch (e: any) {
      setSeizeError(e.message);
    } finally {
      setSeizeLoading(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Blacklist */}
      <Panel title="Blacklist" tag="SSS-2">
        <Field label="Wallet Address">
          <input
            value={blAddress}
            onChange={(e) => {
              setBlAddress(e.target.value);
              setBlResult(null);
              setBlError("");
            }}
            placeholder="address to blacklist / check"
          />
        </Field>

        <div style={{ display: "flex", gap: 8 }}>
          <Btn
            onClick={blCheck}
            disabled={!blAddress || blLoading !== null}
            variant="ghost"
          >
            {blLoading === "check" ? (
              <>
                <Spinner />
                checking…
              </>
            ) : (
              "$ check"
            )}
          </Btn>
          <Btn
            onClick={blAdd}
            disabled={!blAddress || blLoading !== null}
            variant="danger"
          >
            {blLoading === "add" ? (
              <>
                <Spinner />
                blacklisting…
              </>
            ) : (
              "$ blacklist"
            )}
          </Btn>
          <Btn
            onClick={blRemove}
            disabled={!blAddress || blLoading !== null}
            variant="success"
          >
            {blLoading === "remove" ? (
              <>
                <Spinner />
                removing…
              </>
            ) : (
              "$ unblacklist"
            )}
          </Btn>
        </div>

        {blResult && !blResult.signature && (
          <div
            style={{
              marginTop: 12,
              padding: "8px 12px",
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              borderRadius: 4,
              fontFamily: "var(--mono)",
              fontSize: 11,
            }}
          >
            {blResult.isBlacklisted ? (
              <>
                <Tag color="red">blacklisted</Tag>
                <span style={{ marginLeft: 8, color: "var(--text-muted)" }}>
                  {blAddress.slice(0, 16)}…
                </span>
              </>
            ) : (
              <>
                <Tag color="green">clean</Tag>
                <span style={{ marginLeft: 8, color: "var(--text-muted)" }}>
                  not on blacklist
                </span>
              </>
            )}
          </div>
        )}
        <TxResult sig={blResult?.signature} error={blError} />
      </Panel>

      {/* Seize */}
      <Panel title="Seize Tokens" tag="SSS-2 · PERMANENT DELEGATE">
        <Field label="Source Token Account">
          <input
            value={seizeSource}
            onChange={(e) => setSeizeSource(e.target.value)}
            placeholder="ATA to seize from"
          />
        </Field>
        <Field label="Destination Token Account">
          <input
            value={seizeDest}
            onChange={(e) => setSeizeDest(e.target.value)}
            placeholder="treasury ATA"
          />
        </Field>
        <Field label="Amount (raw)">
          <input
            type="number"
            value={seizeAmount}
            onChange={(e) => setSeizeAmount(e.target.value)}
            placeholder="raw token units"
            style={{ width: 160 }}
          />
        </Field>

        <Btn
          onClick={doSeize}
          disabled={!seizeSource || !seizeDest || !seizeAmount || seizeLoading}
          variant="danger"
          full
        >
          {seizeLoading ? (
            <>
              <Spinner />
              seizing…
            </>
          ) : (
            "$ seize tokens"
          )}
        </Btn>
        <TxResult sig={seizeResult?.signature} error={seizeError} />
      </Panel>
    </div>
  );
}
