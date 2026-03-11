"use client";

import { useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import {
  VersionedTransaction,
  TransactionMessage,
  PublicKey,
} from "@solana/web3.js";
import {
  getMintInstruction,
  getBurnInstruction,
  getStablecoinConfigPda,
  getRolePda,
  getMinterQuotaPda,
  RoleType,
} from "@stbr/sss-token";
import type { Address } from "gill";
import { Panel, Field, Btn, TxResult, Spinner, Tag } from "./ui";
import { useNetwork } from "./WalletContext";

// Token-2022 program (used by SSS mints)
const TOKEN_2022 = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb" as Address;

export function MintBurn({ mintAddress }: { mintAddress: string }) {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const { network } = useNetwork();

  const [tab, setTab] = useState<"mint" | "burn">("mint");
  const [recipient, setRecipient] = useState(""); // ATA for mint target
  const [burnAccount, setBurnAccount] = useState(""); // ATA to burn from
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [sig, setSig] = useState("");
  const [error, setError] = useState("");

  const sendInx = async (inx: any): Promise<string> => {
    if (!publicKey || !signTransaction) throw new Error("Wallet not connected");

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

    const sig = await connection.sendRawTransaction(signed.serialize(), {
      preflightCommitment: "confirmed",
    });
    await connection.confirmTransaction(
      { signature: sig, blockhash, lastValidBlockHeight },
      "confirmed",
    );
    return sig;
  };

  const submit = async () => {
    if (!publicKey || !signTransaction || !mintAddress || !amount) return;
    setLoading(true);
    setSig("");
    setError("");

    try {
      const minterAddress = publicKey.toBase58() as Address;
      const configPda = await getStablecoinConfigPda(mintAddress as Address);
      const rolePda = await getRolePda(
        mintAddress as Address,
        minterAddress,
        RoleType.Minter,
      );
      const minterQuotaPda = await getMinterQuotaPda(
        mintAddress as Address,
        minterAddress,
      );

      // Dummy signer shape — wallet signs via signTransaction below
      const minterSigner = {
        address: minterAddress,
        signTransactions: async (txs: any[]) => txs,
      } as any;

      let inx: any;

      if (tab === "mint") {
        if (!recipient) throw new Error("Recipient token account is required");

        inx = getMintInstruction({
          minter: minterSigner,
          config: configPda,
          roleAccount: rolePda,
          minterQuota: minterQuotaPda,
          mint: mintAddress as Address,
          recipientTokenAccount: recipient as Address,
          tokenProgram: TOKEN_2022,
          amount: BigInt(amount),
        });
      } else {
        const source = burnAccount || recipient;
        if (!source) throw new Error("Token account to burn from is required");

        inx = getBurnInstruction({
          burner: minterSigner,
          config: configPda,
          roleAccount: rolePda,
          mint: mintAddress as Address,
          tokenAccount: source as Address,
          tokenAccountOwner: minterSigner,
          tokenProgram: TOKEN_2022,
          amount: BigInt(amount),
        });
      }

      const signature = await sendInx(inx);
      setSig(signature);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const disabled =
    !publicKey ||
    !mintAddress ||
    !amount ||
    (tab === "mint" && !recipient) ||
    (tab === "burn" && !burnAccount);

  return (
    <Panel title="Mint / Burn" tag="TOKEN-OPS">
      {/* Tab toggle */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {(["mint", "burn"] as const).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              setSig("");
              setError("");
            }}
            style={{
              background:
                tab === t
                  ? t === "mint"
                    ? "var(--green-dim)"
                    : "var(--red-dim)"
                  : "transparent",
              border: `1px solid ${
                tab === t
                  ? t === "mint"
                    ? "var(--green)"
                    : "var(--red)"
                  : "var(--border)"
              }`,
              color:
                tab === t
                  ? t === "mint"
                    ? "var(--green)"
                    : "var(--red)"
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
          <Tag color="yellow">no mint — init first</Tag>
        )}
      </div>

      {tab === "mint" && (
        <Field label="Recipient Token Account (ATA)">
          <input
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="recipient's associated token account"
          />
        </Field>
      )}

      {tab === "burn" && (
        <Field label="Token Account to Burn From (ATA)">
          <input
            value={burnAccount}
            onChange={(e) => setBurnAccount(e.target.value)}
            placeholder="your associated token account"
          />
        </Field>
      )}

      <Field label={`Amount (raw — ${tab === "mint" ? "to mint" : "to burn"})`}>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="e.g. 1000000 = 1 token (6 decimals)"
        />
      </Field>

      <div
        style={{
          marginBottom: 12,
          padding: "8px 12px",
          background: "var(--surface2)",
          border: "1px solid var(--border)",
          borderRadius: 4,
          fontFamily: "var(--mono)",
          fontSize: 10,
          color: "var(--text-dim)",
          lineHeight: 1.6,
        }}
      >
        ℹ connected wallet must have an active{" "}
        <strong style={{ color: "var(--text-muted)" }}>minter role</strong> on
        this mint. Grant it via Admin → Roles tab first.
      </div>

      <Btn
        full
        onClick={submit}
        disabled={loading || disabled}
        variant={tab === "mint" ? "success" : "danger"}
      >
        {loading ? (
          <>
            <Spinner />
            {tab}ing…
          </>
        ) : (
          `$ ${tab} tokens`
        )}
      </Btn>

      <TxResult sig={sig} error={error} network={network} />
    </Panel>
  );
}
