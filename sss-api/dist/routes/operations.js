import { Router } from "express";
import { SolanaStablecoin } from "@stbr/sss-token";
import { getSolanaClient, getAuthoritySigner } from "../solana.js";
import { ok, err, asyncHandler } from "../helpers.js";
const router = Router();
/**
 * POST /operations/:mint/pause
 */
router.post("/:mint/pause", asyncHandler(async (req, res) => {
    const { mint } = req.params;
    const { rpc, sendAndConfirmTransaction } = getSolanaClient();
    const authority = await getAuthoritySigner();
    const stablecoin = new SolanaStablecoin({ rpc, sendAndConfirmTransaction }, mint);
    const tx = await stablecoin.pause(authority, authority);
    const signature = await sendAndConfirmTransaction(tx, {
        commitment: "confirmed",
    });
    console.log(`[OPS] Paused ${mint} | ${signature}`);
    ok(res, { signature, mint, action: "paused" });
}));
/**
 * POST /operations/:mint/unpause
 */
router.post("/:mint/unpause", asyncHandler(async (req, res) => {
    const { mint } = req.params;
    const { rpc, sendAndConfirmTransaction } = getSolanaClient();
    const authority = await getAuthoritySigner();
    const stablecoin = new SolanaStablecoin({ rpc, sendAndConfirmTransaction }, mint);
    const tx = await stablecoin.unpause(authority, authority);
    const signature = await sendAndConfirmTransaction(tx, {
        commitment: "confirmed",
    });
    console.log(`[OPS] Unpaused ${mint} | ${signature}`);
    ok(res, { signature, mint, action: "unpaused" });
}));
/**
 * POST /operations/:mint/freeze
 * Body: { tokenAccount }
 */
router.post("/:mint/freeze", asyncHandler(async (req, res) => {
    const { mint } = req.params;
    const { tokenAccount } = req.body;
    if (!tokenAccount)
        return err(res, "'tokenAccount' is required");
    const { rpc, sendAndConfirmTransaction } = getSolanaClient();
    const authority = await getAuthoritySigner();
    const stablecoin = new SolanaStablecoin({ rpc, sendAndConfirmTransaction }, mint);
    const tx = await stablecoin.freezeAccount(authority, authority, tokenAccount);
    const signature = await sendAndConfirmTransaction(tx, {
        commitment: "confirmed",
    });
    console.log(`[OPS] Froze ${tokenAccount} on ${mint} | ${signature}`);
    ok(res, { signature, mint, tokenAccount, action: "frozen" });
}));
/**
 * POST /operations/:mint/thaw
 * Body: { tokenAccount }
 */
router.post("/:mint/thaw", asyncHandler(async (req, res) => {
    const { mint } = req.params;
    const { tokenAccount } = req.body;
    if (!tokenAccount)
        return err(res, "'tokenAccount' is required");
    const { rpc, sendAndConfirmTransaction } = getSolanaClient();
    const authority = await getAuthoritySigner();
    const stablecoin = new SolanaStablecoin({ rpc, sendAndConfirmTransaction }, mint);
    const tx = await stablecoin.thawAccount(authority, authority, tokenAccount);
    const signature = await sendAndConfirmTransaction(tx, {
        commitment: "confirmed",
    });
    console.log(`[OPS] Thawed ${tokenAccount} on ${mint} | ${signature}`);
    ok(res, { signature, mint, tokenAccount, action: "thawed" });
}));
export default router;
