"use client";

import { useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import {
  VersionedTransaction,
  TransactionMessage,
  PublicKey,
} from "@solana/web3.js";
import {
  getPauseInstruction,
  getUnpauseInstruction,
  getFreezeAccountInstruction,
  getThawAccountInstruction,
  getStablecoinConfigPda,
} from "@stbr/sss-token";
import type { Address } from "gill";
import { Panel, Field, Btn, TxResult, Spinner } from "@/components/ui";
import { useNetwork } from "@/components/WalletContext";

export function OperationsTab({
  mint,
  isPaused,
}: {
  mint: string;
  isPaused: boolean;
}) {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const { network } = useNetwork();

  const [paused, setPaused] = useState(isPaused);
  const [pauseLoading, setPauseLoading] = useState(false);
  const [pauseSig, setPauseSig] = useState("");
  const [pauseError, setPauseError] = useState("");

  const [tokenAccount, setTokenAccount] = useState("");
  const [freezeLoading, setFreezeLoading] = useState<"freeze" | "thaw" | null>(
    null,
  );
  const [freezeSig, setFreezeSig] = useState("");
  const [freezeError, setFreezeError] = useState("");

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

  const togglePause = async () => {
    if (!publicKey) return;
    setPauseLoading(true);
    setPauseSig("");
    setPauseError("");
    try {
      const authorityAddress = publicKey.toBase58() as Address;
      const configPda = await getStablecoinConfigPda(mint as Address);

      const inx = paused
        ? getUnpauseInstruction({
            authority: authorityAddress,
            config: configPda,
          })
        : getPauseInstruction({
            authority: authorityAddress,
            config: configPda,
          });

      const sig = await sendInx(inx);
      setPauseSig(sig);
      setPaused(!paused);
    } catch (e: any) {
      setPauseError(e.message);
    } finally {
      setPauseLoading(false);
    }
  };

  const freeze = async () => {
    if (!tokenAccount || !publicKey) return;
    setFreezeLoading("freeze");
    setFreezeSig("");
    setFreezeError("");
    try {
      const authorityAddress = publicKey.toBase58() as Address;
      const configPda = await getStablecoinConfigPda(mint as Address);

      const inx = getFreezeAccountInstruction({
        authority: authorityAddress,
        config: configPda,
        tokenAccount: tokenAccount as Address,
        mint: mint as Address,
        tokenProgram: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb" as Address,
      });

      const sig = await sendInx(inx);
      setFreezeSig(sig);
    } catch (e: any) {
      setFreezeError(e.message);
    } finally {
      setFreezeLoading(null);
    }
  };

  const thaw = async () => {
    if (!tokenAccount || !publicKey) return;
    setFreezeLoading("thaw");
    setFreezeSig("");
    setFreezeError("");
    try {
      const authorityAddress = publicKey.toBase58() as Address;
      const configPda = await getStablecoinConfigPda(mint as Address);

      const inx = getThawAccountInstruction({
        authority: authorityAddress,
        config: configPda,
        tokenAccount: tokenAccount as Address,
        mint: mint as Address,
        tokenProgram: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb" as Address,
      });

      const sig = await sendInx(inx);
      setFreezeSig(sig);
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
        <TxResult sig={pauseSig} error={pauseError} network={network} />
      </Panel>

      {/* Freeze / Thaw */}
      <Panel title="Freeze / Thaw Account" tag="AUTHORITY">
        <Field label="Token Account Address">
          <input
            value={tokenAccount}
            onChange={(e) => {
              setTokenAccount(e.target.value);
              setFreezeSig("");
              setFreezeError("");
            }}
            placeholder="associated token account (ATA)"
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
        <TxResult sig={freezeSig} error={freezeError} network={network} />
      </Panel>
    </div>
  );
}
