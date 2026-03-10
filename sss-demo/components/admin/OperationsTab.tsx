"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Panel, Field, Btn, TxResult, Spinner } from "@/components/ui";

export function OperationsTab({
  mint,
  isPaused,
}: {
  mint: string;
  isPaused: boolean;
}) {
  const [paused, setPaused] = useState(isPaused);
  const [pauseLoading, setPauseLoading] = useState(false);
  const [pauseSig, setPauseSig] = useState("");
  const [pauseError, setPauseError] = useState("");

  const [tokenAccount, setTokenAccount] = useState("");
  const [freezeLoading, setFreezeLoading] = useState<"freeze" | "thaw" | null>(
    null,
  );
  const [freezeResult, setFreezeResult] = useState<any>(null);
  const [freezeError, setFreezeError] = useState("");

  const togglePause = async () => {
    setPauseLoading(true);
    setPauseSig("");
    setPauseError("");
    try {
      const data = paused
        ? await api.operations.unpause(mint)
        : await api.operations.pause(mint);
      setPauseSig(data.signature);
      setPaused(!paused);
    } catch (e: any) {
      setPauseError(e.message);
    } finally {
      setPauseLoading(false);
    }
  };

  const freeze = async () => {
    if (!tokenAccount) return;
    setFreezeLoading("freeze");
    setFreezeResult(null);
    setFreezeError("");
    try {
      setFreezeResult(await api.operations.freeze(mint, tokenAccount));
    } catch (e: any) {
      setFreezeError(e.message);
    } finally {
      setFreezeLoading(null);
    }
  };

  const thaw = async () => {
    if (!tokenAccount) return;
    setFreezeLoading("thaw");
    setFreezeResult(null);
    setFreezeError("");
    try {
      setFreezeResult(await api.operations.thaw(mint, tokenAccount));
    } catch (e: any) {
      setFreezeError(e.message);
    } finally {
      setFreezeLoading(null);
    }
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Pause */}
      <Panel title="Global Pause" tag="EMERGENCY">
        <div
          style={{
            marginBottom: 16,
            padding: "12px 14px",
            background: paused ? "var(--red-dim)" : "var(--green-dim)",
            border: `1px solid ${paused ? "var(--red)" : "var(--green)"}`,
            borderRadius: 4,
            fontFamily: "var(--mono)",
            fontSize: 12,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: paused ? "var(--red)" : "var(--green)",
              boxShadow: `0 0 6px ${paused ? "var(--red)" : "var(--green)"}`,
              flexShrink: 0,
            }}
          />
          <span style={{ color: paused ? "var(--red)" : "var(--green)" }}>
            {paused
              ? "PAUSED — all mints, burns and transfers blocked"
              : "ACTIVE — operations running normally"}
          </span>
        </div>

        <Btn
          onClick={togglePause}
          disabled={pauseLoading}
          variant={paused ? "success" : "danger"}
          full
        >
          {pauseLoading ? (
            <>
              <Spinner />
              {paused ? "unpausing…" : "pausing…"}
            </>
          ) : paused ? (
            "$ unpause mint"
          ) : (
            "$ pause mint"
          )}
        </Btn>
        <TxResult sig={pauseSig} error={pauseError} />
      </Panel>

      {/* Freeze / Thaw */}
      <Panel title="Freeze / Thaw Account" tag="AUTHORITY">
        <Field label="Token Account Address">
          <input
            value={tokenAccount}
            onChange={(e) => {
              setTokenAccount(e.target.value);
              setFreezeResult(null);
              setFreezeError("");
            }}
            placeholder="associated token account"
          />
        </Field>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn
            onClick={freeze}
            disabled={!tokenAccount || freezeLoading !== null}
            variant="primary"
          >
            {freezeLoading === "freeze" ? (
              <>
                <Spinner />
                freezing…
              </>
            ) : (
              "$ freeze"
            )}
          </Btn>
          <Btn
            onClick={thaw}
            disabled={!tokenAccount || freezeLoading !== null}
            variant="ghost"
          >
            {freezeLoading === "thaw" ? (
              <>
                <Spinner />
                thawing…
              </>
            ) : (
              "$ thaw"
            )}
          </Btn>
        </div>
        <TxResult sig={freezeResult?.signature} error={freezeError} />
      </Panel>
    </div>
  );
}
