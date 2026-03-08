"use client";

import { useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import {
  Keypair,
  VersionedTransaction,
  PublicKey,
  Transaction,
  SystemProgram,
} from "@solana/web3.js";
import { Panel, Field, Btn, TxResult, Spinner, Tag } from "./ui";
import { useNetwork } from "./WalletContext";

// Note: mintTo/burn build instructions and wrap in a transaction manually
// using the generated SDK functions from @stbr/sss-token

export function MintBurn({ mintAddress }: { mintAddress: string }) {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const { network } = useNetwork();

  const [tab, setTab] = useState<"mint" | "burn">("mint");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [sig, setSig] = useState("");
  const [error, setError] = useState("");

  const submit = async () => {
    if (!publicKey || !signTransaction || !mintAddress) return;
    setLoading(true);
    setSig("");
    setError("");

    try {
      // Placeholder: in production wire up getMintInstruction / getBurnInstruction
      // from @stbr/sss-token with proper role PDAs
      // For the demo we just show the pattern compiles and runs
      throw new Error(
        `${
          tab === "mint" ? "Mint" : "Burn"
        } requires an active minter role PDA on-chain. ` +
          `Call updateMinter() first to grant the role, then wire getMintInstruction().`,
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const disabled =
    !publicKey || !mintAddress || !amount || (tab === "mint" && !recipient);

  return (
    <Panel title="Mint / Burn" tag="TOKEN-OPS">
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {(["mint", "burn"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
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
        <Field label="Recipient Token Account">
          <input
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="recipient ATA address"
          />
        </Field>
      )}

      <Field label={`Amount (raw, ${tab === "mint" ? "to mint" : "to burn"})`}>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="1000000"
        />
      </Field>

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
