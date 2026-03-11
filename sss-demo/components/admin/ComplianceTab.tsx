"use client";

import { useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import {
  VersionedTransaction,
  TransactionMessage,
  PublicKey,
} from "@solana/web3.js";
import {
  getAddToBlacklistInstruction,
  getSeizeInstruction,
  getBlacklistPda,
  getStablecoinConfigPda,
} from "@stbr/sss-token";
import type { Address } from "gill";
import { Panel, Field, Btn, TxResult, Spinner, Tag } from "@/components/ui";
import { useNetwork } from "@/components/WalletContext";

const TRANSFER_HOOK_PROGRAM =
  (process.env.NEXT_PUBLIC_TRANSFER_HOOK_PROGRAM_ID as Address) ??
  ("FtPdSNiQ8ieM4yE1V8FekUk7WDbgZrx9ehb3CyaXzHtG" as Address);

export function ComplianceTab({ mint }: { mint: string }) {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const { network } = useNetwork();

  const [blAddress, setBlAddress] = useState("");
  const [blLoading, setBlLoading] = useState<"add" | "remove" | "check" | null>(
    null,
  );
  const [blResult, setBlResult] = useState<any>(null);
  const [blError, setBlError] = useState("");

  const [seizeSource, setSeizeSource] = useState("");
  const [seizeDest, setSeizeDest] = useState("");
  const [seizeAmount, setSeizeAmount] = useState("");
  const [seizeLoading, setSeizeLoading] = useState(false);
  const [seizeSig, setSeizeSig] = useState("");
  const [seizeError, setSeizeError] = useState("");

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

  const blCheck = async () => {
    if (!blAddress) return;
    setBlLoading("check");
    setBlResult(null);
    setBlError("");
    try {
      const blacklistPda = await getBlacklistPda(
        mint as Address,
        blAddress as Address,
        TRANSFER_HOOK_PROGRAM,
      );
      const info = await connection.getAccountInfo(new PublicKey(blacklistPda));
      setBlResult({ isBlacklisted: info !== null && info.data.length > 0 });
    } catch (e: any) {
      setBlError(e.message);
    } finally {
      setBlLoading(null);
    }
  };

  const blAdd = async () => {
    if (!blAddress || !publicKey) return;
    setBlLoading("add");
    setBlResult(null);
    setBlError("");
    try {
      const authorityAddress = publicKey.toBase58() as Address;
      const configPda = await getStablecoinConfigPda(mint as Address);
      const blacklistPda = await getBlacklistPda(
        mint as Address,
        blAddress as Address,
        TRANSFER_HOOK_PROGRAM,
      );

      const inx = getAddToBlacklistInstruction({
        authority: authorityAddress,
        config: configPda,
        blacklistEntry: blacklistPda,
        wallet: blAddress as Address,
        hookProgram: TRANSFER_HOOK_PROGRAM,
      });

      const sig = await sendInx(inx);
      setBlResult({ signature: sig });
    } catch (e: any) {
      setBlError(e.message);
    } finally {
      setBlLoading(null);
    }
  };

  const blRemove = async () => {
    if (!blAddress || !publicKey) return;
    setBlLoading("remove");
    setBlResult(null);
    setBlError("");
    try {
      const authorityAddress = publicKey.toBase58() as Address;
      const configPda = await getStablecoinConfigPda(mint as Address);
      const blacklistPda = await getBlacklistPda(
        mint as Address,
        blAddress as Address,
        TRANSFER_HOOK_PROGRAM,
      );

      // // const inx = getUnblacklistInstruction({
      // //   authority: authorityAddress,
      // //   config: configPda,
      // //   blacklistEntry: blacklistPda,
      // //   wallet: blAddress as Address,
      // //   hookProgram: TRANSFER_HOOK_PROGRAM,
      // // });

      // const sig = await sendInx(inx);
      // setBlResult({ signature: sig });
    } catch (e: any) {
      setBlError(e.message);
    } finally {
      setBlLoading(null);
    }
  };

  const doSeize = async () => {
    if (!seizeSource || !seizeDest || !seizeAmount || !publicKey) return;
    setSeizeLoading(true);
    setSeizeSig("");
    setSeizeError("");
    try {
      const authorityAddress = publicKey.toBase58() as Address;
      const configPda = await getStablecoinConfigPda(mint as Address);

      const inx = getSeizeInstruction({
        authority: authorityAddress,
        config: configPda,
        source: seizeSource as Address,
        destination: seizeDest as Address,
        mint: mint as Address,
        tokenProgram: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb" as Address,
        amount: BigInt(seizeAmount),
      });

      const sig = await sendInx(inx);
      setSeizeSig(sig);
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
        <TxResult sig={blResult?.signature} error={blError} network={network} />
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
        <TxResult sig={seizeSig} error={seizeError} network={network} />
      </Panel>
    </div>
  );
}
