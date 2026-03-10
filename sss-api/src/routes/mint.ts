import { Router } from "express";
import { SolanaStablecoin } from "@stbr/sss-token";
import type { Address } from "gill";
import { getSolanaClient, getAuthoritySigner, getNetwork } from "../solana.js";
import { ok, err, asyncHandler } from "../helpers.js";

const router = Router();

/**
 * GET /mint/:mint/config
 * Returns on-chain StablecoinConfig for a given mint
 */
router.get(
  "/:mint/config",
  asyncHandler(async (req, res) => {
    const { mint } = req.params;
    const { rpc } = getSolanaClient();
    const stablecoin = new SolanaStablecoin({ rpc }, mint as Address);

    const config = await stablecoin.getConfig();
    ok(res, {
      mint,
      config: {
        authority:
          (config as any).masterAuthority ||
          (config as any).master_authority ||
          (config as any).authority,
        isPaused: config.isPaused,
        preset: (config as any).preset ?? null,
      },
    });
  }),
);

/**
 * POST /mint/:mint/transfer-authority
 * Transfer master authority to a new wallet
 * Body: { newAuthority }
 */
router.post(
  "/:mint/transfer-authority",
  asyncHandler(async (req, res) => {
    const { mint } = req.params;
    const { newAuthority } = req.body;

    if (!newAuthority) return err(res, "'newAuthority' is required");

    const { rpc, sendAndConfirmTransaction } = getSolanaClient();
    const authority = await getAuthoritySigner();
    const stablecoin = new SolanaStablecoin(
      { rpc, sendAndConfirmTransaction },
      mint as Address,
    );

    const tx = await stablecoin.transferAuthority(
      authority,
      authority,
      newAuthority as Address,
    );
    const signature = await sendAndConfirmTransaction!(tx as any, {
      commitment: "confirmed",
    });

    console.log(
      `[AUTHORITY] Transferred on ${mint} → ${newAuthority} | ${signature}`,
    );
    ok(res, { signature, mint, newAuthority, action: "authority-transferred" });
  }),
);

export default router;
