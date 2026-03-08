"use client";

import { useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { VersionedTransaction } from "@solana/web3.js";
import { getTransactionEncoder, createTransaction } from "gill";
import {
  getAddToBlacklistInstruction,
  getRemoveFromBlacklistInstruction,
  getStablecoinConfigPda,
  getRolePda,
  getBlacklistPda,
  RoleType,
} from "@stbr/sss-token";
import { Panel, Field, Btn, TxResult, Spinner, Tag } from "./ui";
import { useNetwork } from "./WalletContext";

export function Blacklist({ mintAddress }: { mintAddress: string }) {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const { network } = useNetwork();

  const [tab, setTab] = useState<"add" | "remove">("add");
  const [target, setTarget] = useState("");
  const [hookProgram, setHookProgram] = useState(
    "3nqtxhZZdpV5W2TPaa1hbWbeM3bhhsMg3Fy9oLdAHKfH",
  );
  const [loading, setLoading] = useState(false);
  const [sig, setSig] = useState("");
  const [error, setError] = useState("");

  const submit = async () => {
    if (!publicKey || !signTransaction || !mintAddress || !target) return;
    setLoading(true);
    setSig("");
    setError("");

    try {
      const authorityAddress = publicKey.toBase58() as any;
      const configPda = await getStablecoinConfigPda(mintAddress as any);
      const rolePda = await getRolePda(
        mintAddress as any,
        authorityAddress,
        RoleType.Blacklister,
      );
      const blacklistPda = await getBlacklistPda(
        mintAddress as any,
        target as any,
        hookProgram as any,
      );

      const inx =
        tab === "add"
          ? getAddToBlacklistInstruction({
              blacklister: authorityAddress,
              config: configPda,
              roleAccount: rolePda,
              blacklistEntry: blacklistPda,
              addressToBlacklist: target as any,
              systemProgram: "11111111111111111111111111111111" as any,
            })
          : getRemoveFromBlacklistInstruction({
              blacklister: authorityAddress,
              config: configPda,
              roleAccount: rolePda,
              addressToRemove: target as any,
              blacklistEntry: blacklistPda,
            });

      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash("confirmed");
      const txMsg = createTransaction({
        feePayer: authorityAddress,
        version: "legacy",
        instructions: [inx],
        latestBlockhash: {
          blockhash: blockhash as any,
          lastValidBlockHeight: BigInt(lastValidBlockHeight),
        },
      });

      const txBytes = getTransactionEncoder().encode(txMsg as any);
      const vTx = VersionedTransaction.deserialize(new Uint8Array(txBytes));
      const signed = await signTransaction(vTx);
      const signature = await connection.sendRawTransaction(
        signed.serialize(),
        { preflightCommitment: "confirmed" },
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
    <Panel title="Blacklist" tag="SSS-2 COMPLIANCE">
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {(["add", "remove"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background:
                tab === t
                  ? t === "add"
                    ? "var(--red-dim)"
                    : "var(--green-dim)"
                  : "transparent",
              border: `1px solid ${
                tab === t
                  ? t === "add"
                    ? "var(--red)"
                    : "var(--green)"
                  : "var(--border)"
              }`,
              color:
                tab === t
                  ? t === "add"
                    ? "var(--red)"
                    : "var(--green)"
                  : "var(--text-muted)",
              padding: "6px 14px",
              borderRadius: 4,
              cursor: "pointer",
              fontFamily: "var(--mono)",
              fontSize: 11,
              letterSpacing: "0.06em",
            }}
          >
            {t === "add" ? "blacklist" : "unblacklist"}
          </button>
        ))}
        {mintAddress ? (
          <Tag color="green">mint set</Tag>
        ) : (
          <Tag color="yellow">SSS-2 only</Tag>
        )}
      </div>

      <Field label="Address to Target">
        <input
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="wallet or token account"
        />
      </Field>
      <Field label="Transfer Hook Program ID">
        <input
          value={hookProgram}
          onChange={(e) => setHookProgram(e.target.value)}
          style={{ fontFamily: "var(--mono)", fontSize: 11 }}
        />
      </Field>

      <Btn
        full
        onClick={submit}
        disabled={loading || !publicKey || !mintAddress || !target}
        variant={tab === "add" ? "danger" : "success"}
      >
        {loading ? (
          <>
            <Spinner />
            submitting…
          </>
        ) : (
          `$ ${tab === "add" ? "add to blacklist" : "remove from blacklist"}`
        )}
      </Btn>
      <TxResult sig={sig} error={error} network={network} />
    </Panel>
  );
}
