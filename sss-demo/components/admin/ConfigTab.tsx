"use client";

import { useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import {
  VersionedTransaction,
  TransactionMessage,
  PublicKey,
} from "@solana/web3.js";
import {
  getTransferAuthorityInstruction,
  getStablecoinConfigPda,
} from "@stbr/sss-token";
import type { Address } from "gill";
import { Panel, Field, Btn, TxResult, Spinner } from "@/components/ui";
import { useNetwork } from "@/components/WalletContext";

export function ConfigTab({ mint, config }: { mint: string; config: any }) {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const { network } = useNetwork();

  const [newAuthority, setNewAuthority] = useState("");
  const [loading, setLoading] = useState(false);
  const [sig, setSig] = useState("");
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const transfer = async () => {
    if (!newAuthority || !confirmed || !publicKey || !signTransaction) return;
    setLoading(true);
    setSig("");
    setError("");
    try {
      const authorityAddress = publicKey.toBase58() as Address;
      const configPda = await getStablecoinConfigPda(mint as Address);

      const inx = getTransferAuthorityInstruction({
        authority: authorityAddress,
        config: configPda,
        newAuthority: newAuthority as Address,
      });

      // Convert Gill instruction to web3.js format (same as InitMint.tsx)
      const web3Inx = {
        programId: new PublicKey(inx.programAddress),
        keys: inx.accounts.map((a: any) => ({
          pubkey: new PublicKey(a.address),
          isSigner: a.role === 3 || a.role === 2,
          isWritable: a.role === 1 || a.role === 3,
        })),
        data: Buffer.from(inx.data),
      };

      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash("confirmed");

      const message = new TransactionMessage({
        payerKey: publicKey,
        recentBlockhash: blockhash,
        instructions: [web3Inx],
      }).compileToLegacyMessage();

      const vTx = new VersionedTransaction(message);
      const signed = await signTransaction(vTx);

      const signature = await connection.sendRawTransaction(
        signed.serialize(),
        {
          preflightCommitment: "confirmed",
        },
      );
      await connection.confirmTransaction(
        { signature, blockhash, lastValidBlockHeight },
        "confirmed",
      );

      setSig(signature);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
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
        <TxResult sig={sig} error={error} network={network} />
      </Panel>
    </div>
  );
}
