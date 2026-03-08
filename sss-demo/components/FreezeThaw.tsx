"use client";

import { useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { Keypair, VersionedTransaction } from "@solana/web3.js";
import { getTransactionEncoder, createTransaction } from "gill";
import {
  getFreezeAccountInstruction,
  getThawAccountInstruction,
  getStablecoinConfigPda,
} from "@stbr/sss-token";
import { Panel, Field, Btn, TxResult, Spinner, Tag } from "./ui";
import { useNetwork } from "./WalletContext";

export function FreezeThaw({ mintAddress }: { mintAddress: string }) {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const { network } = useNetwork();

  const [tab, setTab] = useState<"freeze" | "thaw">("freeze");
  const [tokenAccount, setTokenAccount] = useState("");
  const [loading, setLoading] = useState(false);
  const [sig, setSig] = useState("");
  const [error, setError] = useState("");

  const submit = async () => {
    if (!publicKey || !signTransaction || !mintAddress || !tokenAccount) return;
    setLoading(true);
    setSig("");
    setError("");

    try {
      const authorityAddress = publicKey.toBase58() as any;
      const configPda = await getStablecoinConfigPda(mintAddress as any);

      const inx =
        tab === "freeze"
          ? getFreezeAccountInstruction({
              authority: authorityAddress,
              config: configPda,
              mint: mintAddress as any,
              tokenAccount: tokenAccount as any,
            })
          : getThawAccountInstruction({
              authority: authorityAddress,
              config: configPda,
              mint: mintAddress as any,
              tokenAccount: tokenAccount as any,
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
    <Panel title="Freeze / Thaw" tag="AUTHORITY">
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {(["freeze", "thaw"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background:
                tab === t
                  ? t === "freeze"
                    ? "var(--primary-dim)"
                    : "var(--yellow-dim)"
                  : "transparent",
              border: `1px solid ${
                tab === t
                  ? t === "freeze"
                    ? "var(--primary)"
                    : "var(--yellow)"
                  : "var(--border)"
              }`,
              color:
                tab === t
                  ? t === "freeze"
                    ? "var(--primary)"
                    : "var(--yellow)"
                  : "var(--text-muted)",
              padding: "6px 14px",
              borderRadius: 4,
              cursor: "pointer",
              fontFamily: "var(--mono)",
              fontSize: 11,
              letterSpacing: "0.06em",
            }}
          >
            {t}
          </button>
        ))}
        {mintAddress ? (
          <Tag color="green">mint set</Tag>
        ) : (
          <Tag color="yellow">init mint first</Tag>
        )}
      </div>

      <Field label="Token Account Address">
        <input
          value={tokenAccount}
          onChange={(e) => setTokenAccount(e.target.value)}
          placeholder="associated token account"
        />
      </Field>

      <Btn
        full
        onClick={submit}
        disabled={loading || !publicKey || !mintAddress || !tokenAccount}
        variant={tab === "freeze" ? "primary" : "ghost"}
      >
        {loading ? (
          <>
            <Spinner />
            {tab}ing…
          </>
        ) : (
          `$ ${tab} account`
        )}
      </Btn>
      <TxResult sig={sig} error={error} network={network} />
    </Panel>
  );
}
