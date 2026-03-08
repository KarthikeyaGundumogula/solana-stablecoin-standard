"use client";

import { useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import {
  Keypair,
  VersionedTransaction,
  TransactionMessage,
  PublicKey,
} from "@solana/web3.js";
import {
  getInitializeSss2Instruction,
  getInitializeInstruction,
  getStablecoinConfigPda,
} from "@stbr/sss-token";
import { Panel, Field, Btn, TxResult, Spinner } from "./ui";
import { useNetwork } from "./WalletContext";

type Preset = "sss-1" | "sss-2";

export function InitMint({
  onMintCreated,
}: {
  onMintCreated: (addr: string) => void;
}) {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const { network } = useNetwork();

  const [preset, setPreset] = useState<Preset>("sss-2");
  const [form, setForm] = useState({
    name: "",
    symbol: "",
    uri: "https://example.com/metadata.json",
    decimals: "6",
  });
  const [loading, setLoading] = useState(false);
  const [sig, setSig] = useState("");
  const [mintAddr, setMintAddr] = useState("");
  const [error, setError] = useState("");

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!publicKey || !signTransaction) return;
    setLoading(true);
    setSig("");
    setError("");
    setMintAddr("");

    try {
      const mintKeypair = Keypair.generate();
      const mintAddress = mintKeypair.publicKey.toBase58();
      const mintAsGill = mintAddress as any;
      const authorityAddress = publicKey.toBase58() as any;
      const mintSigner = {
        address: mintAsGill,
        signTransactions: async (txs: any[]) => txs,
      };

      const configPda = await getStablecoinConfigPda(mintAsGill);

      const inx =
        preset === "sss-2"
          ? getInitializeSss2Instruction({
              authority: authorityAddress,
              config: configPda,
              mint: mintSigner as any,
              tokenProgram:
                "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb" as any,
              transferHookProgram:
                "FtPdSNiQ8ieM4yE1V8FekUk7WDbgZrx9ehb3CyaXzHtG" as any,
              name: form.name,
              symbol: form.symbol,
              uri: form.uri,
              decimals: parseInt(form.decimals),
            })
          : getInitializeInstruction({
              authority: authorityAddress,
              config: configPda,
              mint: mintSigner as any,
              tokenProgram:
                "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb" as any,
              name: form.name,
              symbol: form.symbol,
              uri: form.uri,
              decimals: parseInt(form.decimals),
            });

      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash("confirmed");

      console.log("DEBUG", {
        authorityAddress,
        mintAsGill,
        configPda,
        inx,
        blockhash,
        name: form.name,
        symbol: form.symbol,
        uri: form.uri,
        decimals: parseInt(form.decimals),
      });
      // Convert Gill instruction to web3.js instruction format
      const web3Inx = {
        programId: new PublicKey(inx.programAddress),
        keys: inx.accounts.map((a: any) => ({
          pubkey: new PublicKey(a.address),
          isSigner: a.role === 3 || a.role === 2, // writable+signer or readonly+signer
          isWritable: a.role === 1 || a.role === 3, // writable or writable+signer
        })),
        data: Buffer.from(inx.data),
      };

      const message = new TransactionMessage({
        payerKey: publicKey,
        recentBlockhash: blockhash,
        instructions: [web3Inx],
      }).compileToLegacyMessage();

      const vTx = new VersionedTransaction(message);
      vTx.sign([mintKeypair]);
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
      setMintAddr(mintAddress);
      onMintCreated(mintAddress);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Panel title="Init Mint" tag={preset.toUpperCase()}>
      {/* Preset toggle */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          marginBottom: 16,
        }}
      >
        {(["sss-1", "sss-2"] as Preset[]).map((p) => (
          <button
            key={p}
            onClick={() => setPreset(p)}
            style={{
              background:
                preset === p ? "var(--primary-dim)" : "var(--surface2)",
              border: `1px solid ${
                preset === p ? "var(--primary)" : "var(--border)"
              }`,
              color: preset === p ? "var(--primary)" : "var(--text-muted)",
              padding: "10px",
              borderRadius: 4,
              cursor: "pointer",
              fontFamily: "var(--mono)",
              fontSize: 11,
              letterSpacing: "0.08em",
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 3 }}>
              {p.toUpperCase()}
            </div>
            <div style={{ fontSize: 10, opacity: 0.7 }}>
              {p === "sss-1" ? "Mint + Freeze only" : "Full compliance"}
            </div>
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Field label="Name">
          <input
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Compliant USD"
          />
        </Field>
        <Field label="Symbol">
          <input
            value={form.symbol}
            onChange={(e) => set("symbol", e.target.value)}
            placeholder="CUSD"
          />
        </Field>
      </div>
      <Field label="Metadata URI">
        <input value={form.uri} onChange={(e) => set("uri", e.target.value)} />
      </Field>
      <Field label="Decimals">
        <input
          type="number"
          min={0}
          max={9}
          value={form.decimals}
          onChange={(e) => set("decimals", e.target.value)}
          style={{ width: 80 }}
        />
      </Field>

      <Btn
        full
        onClick={submit}
        disabled={loading || !publicKey || !form.name || !form.symbol}
      >
        {loading ? (
          <>
            <Spinner />
            deploying…
          </>
        ) : (
          "$ deploy mint"
        )}
      </Btn>

      {mintAddr && (
        <div
          style={{
            marginTop: 10,
            fontFamily: "var(--mono)",
            fontSize: 11,
            color: "var(--text-muted)",
          }}
        >
          <span style={{ color: "var(--green)" }}>mint </span>
          <span style={{ wordBreak: "break-all" }}>{mintAddr}</span>
        </div>
      )}
      <TxResult sig={sig} error={error} network={network} />
    </Panel>
  );
}
