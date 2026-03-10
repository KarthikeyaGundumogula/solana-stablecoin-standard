import { Router } from "express";
import {
  SolanaStablecoin,
  RoleType,
  getMinterQuotaPda,
  fetchMinterQuota,
} from "@stbr/sss-token";
import type { Address } from "gill";
import { getSolanaClient, getAuthoritySigner } from "../solana.js";
import { ok, err, asyncHandler } from "../helpers.js";

const router = Router();

export const ROLE_NAMES: Record<string, number> = {
  minter: RoleType.Minter,
  blacklister: RoleType.Blacklister,
  pauser: RoleType.Pauser,
  seizer: RoleType.Seizer,
};

function parseRole(role: string): number | null {
  const r = ROLE_NAMES[role.toLowerCase()];
  return r !== undefined ? r : null;
}

/**
 * GET /roles/:mint/check
 * Query: ?address=<wallet>&role=minter|blacklister|pauser|seizer
 */
router.get(
  "/:mint/check",
  asyncHandler(async (req, res) => {
    const { mint } = req.params;
    const { address, role } = req.query;

    if (!address || typeof address !== "string")
      return err(res, "'address' query param required");
    if (!role || typeof role !== "string")
      return err(res, "'role' query param required");

    const roleType = parseRole(role);
    if (roleType === null)
      return err(
        res,
        `Unknown role. Valid: ${Object.keys(ROLE_NAMES).join(", ")}`,
      );

    const { rpc } = getSolanaClient();
    const stablecoin = new SolanaStablecoin({ rpc }, mint as Address);
    const hasRole = await stablecoin.hasRole(address as Address, roleType);

    if (hasRole && roleType === RoleType.Minter) {
      try {
        const quotaPda = await getMinterQuotaPda(
          mint as Address,
          address as Address,
        );
        const quota = await fetchMinterQuota(rpc, quotaPda);
        return ok(res, {
          address,
          role,
          hasRole,
          quota: {
            limit: quota.data.quotaLimit.toString(),
            used: (quota.data as any).quotaUsed?.toString() ?? "0",
          },
        });
      } catch {
        /* return without quota */
      }
    }

    ok(res, { address, role, hasRole });
  }),
);

/**
 * POST /roles/:mint/grant
 * Body: { address, role, quotaLimit? (minter only) }
 */
router.post(
  "/:mint/grant",
  asyncHandler(async (req, res) => {
    console.log("im here")
    const { mint } = req.params;
    const { address, role, quotaLimit = "1000000000" } = req.body;

    if (!address) return err(res, "'address' is required");
    if (!role) return err(res, "'role' is required");

    const roleType = parseRole(role);
    if (roleType === null)
      return err(
        res,
        `Unknown role. Valid: ${Object.keys(ROLE_NAMES).join(", ")}`,
      );

    const { rpc, sendAndConfirmTransaction } = getSolanaClient();
    const authority = await getAuthoritySigner();
    const stablecoin = new SolanaStablecoin(
      { rpc, sendAndConfirmTransaction },
      mint as Address,
    );

    const tx =
      roleType === RoleType.Minter
        ? await stablecoin.updateMinter(
            authority,
            authority,
            address as Address,
            true,
            BigInt(quotaLimit),
          )
        : await stablecoin.updateRoles(
            authority,
            authority,
            address as Address,
            roleType,
            true,
          );

    const signature = await sendAndConfirmTransaction!(tx as any, {
      commitment: "confirmed",
    });
    console.log(
      `[ROLE] Granted '${role}' to ${address} on ${mint} | ${signature}`,
    );
    ok(res, {
      signature,
      address,
      mint,
      role,
      quotaLimit: roleType === RoleType.Minter ? quotaLimit : undefined,
      action: "granted",
    });
  }),
);

/**
 * POST /roles/:mint/revoke
 * Body: { address, role }
 */
router.post(
  "/:mint/revoke",
  asyncHandler(async (req, res) => {
    const { mint } = req.params;
    const { address, role } = req.body;

    if (!address) return err(res, "'address' is required");
    if (!role) return err(res, "'role' is required");

    const roleType = parseRole(role);
    if (roleType === null)
      return err(
        res,
        `Unknown role. Valid: ${Object.keys(ROLE_NAMES).join(", ")}`,
      );

    const { rpc, sendAndConfirmTransaction } = getSolanaClient();
    const authority = await getAuthoritySigner();
    const stablecoin = new SolanaStablecoin(
      { rpc, sendAndConfirmTransaction },
      mint as Address,
    );

    const tx =
      roleType === RoleType.Minter
        ? await stablecoin.updateMinter(
            authority,
            authority,
            address as Address,
            false,
            0n,
          )
        : await stablecoin.updateRoles(
            authority,
            authority,
            address as Address,
            roleType,
            false,
          );

    const signature = await sendAndConfirmTransaction!(tx as any, {
      commitment: "confirmed",
    });
    console.log(
      `[ROLE] Revoked '${role}' from ${address} on ${mint} | ${signature}`,
    );
    ok(res, { signature, address, mint, role, action: "revoked" });
  }),
);

export default router;
