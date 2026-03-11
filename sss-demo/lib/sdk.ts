"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useCallback, useMemo } from "react";
import { SolanaStablecoin } from "@stbr/sss-token";
import type { Address, TransactionSigner } from "gill";
import { createSolanaClient, createNoopSigner } from "gill";
import {
  VersionedMessage,
  VersionedTransaction,
  PublicKey,
  TransactionMessage,
  TransactionInstruction,
} from "@solana/web3.js";

const TRANSFER_HOOK_PROGRAM_ID =
  (process.env.NEXT_PUBLIC_TRANSFER_HOOK_PROGRAM_ID as Address) ??
  ("3nqtxhZZdpV5W2TPaa1hbWbeM3bhhsMg3Fy9oLdAHKfH" as Address);

/**
 * Creates a noop signer for the wallet address.
 * createNoopSigner satisfies Gill's signTransactionMessageWithSigners
 * by placing zeroed placeholder signatures — the real signature
 * is applied by the wallet adapter in useSendAndConfirm.
 */
function useWalletSigner(): TransactionSigner | null {
  const { publicKey } = useWallet();

  return useMemo(() => {
    if (!publicKey) return null;
    return createNoopSigner(publicKey.toBase58() as Address);
  }, [publicKey]);
}

/**
 * Intercepts the Gill FullySignedTransaction (which has noop/zeroed sigs),
 * extracts the raw instructions from the compiled message,
 * rebuilds a fresh web3.js VersionedTransaction, gets the wallet to sign it,
 * and sends it.
 */
function useSendAndConfirm() {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();

  return useCallback(
    async (tx: any, _opts?: any): Promise<string> => {
      if (!signTransaction || !publicKey) {
        throw new Error("Wallet not connected");
      }

      // Gill's FullySignedTransaction has messageBytes on it
      const messageBytes = Buffer.from(tx.messageBytes as Uint8Array);
      const gillMessage = VersionedMessage.deserialize(messageBytes);

      const accounts = gillMessage.staticAccountKeys;

      // Rebuild as web3.js instructions
      const web3Instructions = gillMessage.compiledInstructions.map(
        (ix) =>
          new TransactionInstruction({
            programId: accounts[ix.programIdIndex],
            data: Buffer.from(ix.data),
            keys: ix.accountKeyIndexes.map((idx) => ({
              pubkey: accounts[idx],
              isSigner: gillMessage.isAccountSigner(idx),
              isWritable: gillMessage.isAccountWritable(idx),
            })),
          }),
      );

      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash("confirmed");

      const messageV0 = new TransactionMessage({
        payerKey: publicKey,
        recentBlockhash: blockhash,
        instructions: web3Instructions,
      }).compileToV0Message();

      const vTx = new VersionedTransaction(messageV0);

      // Wallet signs (authority + fee payer)
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

      return signature;
    },
    [connection, publicKey, signTransaction],
  );
}

/**
 * Main hook — returns a SolanaStablecoin instance wired to the connected wallet.
 */
export function useSdk(mint: string) {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const signer = useWalletSigner();
  const sendAndConfirm = useSendAndConfirm();

  const stablecoin = useMemo(() => {
    if (!publicKey || !signer) return null;

    const { rpc } = createSolanaClient({
      urlOrMoniker: connection.rpcEndpoint as any,
    });

    return new SolanaStablecoin(
      { rpc: rpc as any, sendAndConfirmTransaction: sendAndConfirm as any },
      mint as Address,
      TRANSFER_HOOK_PROGRAM_ID,
    );
  }, [publicKey, mint, connection.rpcEndpoint, sendAndConfirm, signer]);

  return { stablecoin, signer, connected: !!publicKey };
}
