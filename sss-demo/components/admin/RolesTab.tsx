"use client";

import { useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import {
  VersionedTransaction,
  TransactionMessage,
  PublicKey,
} from "@solana/web3.js";
import {
  getUpdateRolesInstruction,
  getUpdateMinterInstruction,
  getMinterQuotaPda,
  getStablecoinConfigPda,
  getRolePda,
  RoleType,
} from "@stbr/sss-token";
import type { Address } from "gill";
import { Panel, Field, Btn, TxResult, Spinner } from "@/components/ui";
import { useNetwork } from "@/components/WalletContext";

const ROLES = ["minter", "blacklister", "pauser", "seizer"] as const;
type Role = (typeof ROLES)[number];

const ROLE_TYPE_MAP: Record<Role, RoleType> = {
  minter: RoleType.Minter,
  blacklister: RoleType.Blacklister,
  pauser: RoleType.Pauser,
  seizer: RoleType.Seizer,
};

export function RolesTab({ mint }: { mint: string }) {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const { network } = useNetwork();

  const [role, setRole] = useState<Role>("minter");
  const [address, setAddress] = useState("");
  const [quotaLimit, setQuotaLimit] = useState("1000000000");
  const [loading, setLoading] = useState<"grant" | "revoke" | "check" | null>(
    null,
  );
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const reset = () => {
    setResult(null);
    setError("");
  };

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

  const check = async () => {
    if (!address || !publicKey) return;
    setLoading("check");
    reset();
    try {
      const rolePda = await getRolePda(
        mint as Address,
        address as Address,
        ROLE_TYPE_MAP[role],
      );
      const info = await connection.getAccountInfo(new PublicKey(rolePda));
      const hasRole = info !== null && info.data.length > 0;

      let quota: any = undefined;
      if (hasRole && role === "minter") {
        try {
          const quotaPda = await getMinterQuotaPda(
            mint as Address,
            address as Address,
          );
          const quotaInfo = await connection.getAccountInfo(
            new PublicKey(quotaPda),
          );
          if (quotaInfo) quota = { raw: quotaInfo.data.length + " bytes" };
        } catch {}
      }
      setResult({ hasRole, quota });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  };

  const grant = async () => {
    if (!address || !publicKey) return;
    setLoading("grant");
    reset();
    try {
      const authorityAddress = publicKey.toBase58() as Address;
      const configPda = await getStablecoinConfigPda(mint as Address);
      const rolePda = await getRolePda(
        mint as Address,
        address as Address,
        ROLE_TYPE_MAP[role],
      );

      let inx: any;
      if (role === "minter") {
        const minterQuotaPda = await getMinterQuotaPda(
          mint as Address,
          address as Address,
        );
        inx = getUpdateMinterInstruction({
          authority: authorityAddress,
          config: configPda,
          minter: address as Address,
          roleAccount: rolePda,
          minterQuota: minterQuotaPda,
          isActive: true,
          quotaLimit: BigInt(quotaLimit),
        });
      } else {
        inx = getUpdateRolesInstruction({
          authority: authorityAddress,
          config: configPda,
          assignee: address as Address,
          roleAccount: rolePda,
          roleType: ROLE_TYPE_MAP[role],
          isActive: true,
        });
      }

      const sig = await sendInx(inx);
      setResult({ signature: sig });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  };

  const revoke = async () => {
    if (!address || !publicKey) return;
    setLoading("revoke");
    reset();
    try {
      const authorityAddress = publicKey.toBase58() as Address;
      const configPda = await getStablecoinConfigPda(mint as Address);
      const rolePda = await getRolePda(
        mint as Address,
        address as Address,
        ROLE_TYPE_MAP[role],
      );

      let inx: any;
      if (role === "minter") {
        const minterQuotaPda = await getMinterQuotaPda(
          mint as Address,
          address as Address,
        );
        inx = getUpdateMinterInstruction({
          authority: authorityAddress,
          config: configPda,
          minter: address as Address,
          roleAccount: rolePda,
          minterQuota: minterQuotaPda,
          isActive: false,
          quotaLimit: 0n,
        });
      } else {
        inx = getUpdateRolesInstruction({
          authority: authorityAddress,
          config: configPda,
          assignee: address as Address,
          roleAccount: rolePda,
          roleType: ROLE_TYPE_MAP[role],
          isActive: false,
        });
      }

      const sig = await sendInx(inx);
      setResult({ signature: sig });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Panel title="Manage Roles" tag="RBAC">
        <div
          style={{
            display: "flex",
            gap: 6,
            marginBottom: 16,
            flexWrap: "wrap",
          }}
        >
          {ROLES.map((r) => (
            <button
              key={r}
              onClick={() => {
                setRole(r);
                reset();
              }}
              style={{
                padding: "5px 14px",
                background: role === r ? "var(--primary-dim)" : "transparent",
                border: `1px solid ${
                  role === r ? "var(--primary)" : "var(--border)"
                }`,
                color: role === r ? "var(--primary)" : "var(--text-muted)",
                borderRadius: 4,
                cursor: "pointer",
                fontFamily: "var(--mono)",
                fontSize: 11,
                letterSpacing: "0.06em",
              }}
            >
              {r}
            </button>
          ))}
        </div>

        <Field label="Wallet Address">
          <input
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              reset();
            }}
            placeholder="address to grant / revoke"
          />
        </Field>

        {role === "minter" && (
          <Field label="Quota Limit (raw token units)">
            <input
              type="number"
              value={quotaLimit}
              onChange={(e) => setQuotaLimit(e.target.value)}
              placeholder="1000000000"
            />
          </Field>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <Btn
            onClick={check}
            disabled={!address || loading !== null}
            variant="ghost"
          >
            {loading === "check" ? (
              <>
                <Spinner />
                checking…
              </>
            ) : (
              "$ check"
            )}
          </Btn>
          <Btn
            onClick={grant}
            disabled={!address || loading !== null}
            variant="primary"
          >
            {loading === "grant" ? (
              <>
                <Spinner />
                granting…
              </>
            ) : (
              "$ grant"
            )}
          </Btn>
          <Btn
            onClick={revoke}
            disabled={!address || loading !== null}
            variant="danger"
          >
            {loading === "revoke" ? (
              <>
                <Spinner />
                revoking…
              </>
            ) : (
              "$ revoke"
            )}
          </Btn>
        </div>

        {result && !result.signature && (
          <div
            style={{
              marginTop: 12,
              padding: "10px 12px",
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              borderRadius: 4,
              fontFamily: "var(--mono)",
              fontSize: 11,
            }}
          >
            <span
              style={{
                color: result.hasRole ? "var(--green)" : "var(--text-muted)",
              }}
            >
              {result.hasRole ? "✓ has role" : "✗ no role"}
            </span>
          </div>
        )}

        <TxResult sig={result?.signature} error={error} network={network} />
      </Panel>
    </div>
  );
}
