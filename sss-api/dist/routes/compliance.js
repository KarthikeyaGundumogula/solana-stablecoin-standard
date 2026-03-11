import { Router } from "express";
import { SolanaStablecoin, getBlacklistPda, fetchBlacklistEntry, } from "@stbr/sss-token";
import { getSolanaClient, getAuthoritySigner, getTransferHookId } from "../solana.js";
import { ok, err, asyncHandler } from "../helpers.js";
const router = Router();
/**
 * GET /compliance/:mint/check
 * Query: ?address=<wallet>&hookProgram=<optional>
 */
router.get("/:mint/check", asyncHandler(async (req, res) => {
    const { mint } = req.params;
    const { address, hookProgram = getTransferHookId() } = req.query;
    if (!address || typeof address !== "string")
        return err(res, "'address' query param required");
    const { rpc } = getSolanaClient();
    try {
        const pda = await getBlacklistPda(mint, address, hookProgram);
        await fetchBlacklistEntry(rpc, pda);
        ok(res, { address, isBlacklisted: true });
    }
    catch {
        ok(res, { address, isBlacklisted: false });
    }
}));
/**
 * POST /compliance/:mint/blacklist
 * Body: { address, hookProgram? }
 */
router.post("/:mint/blacklist", asyncHandler(async (req, res) => {
    const { mint } = req.params;
    const { address, hookProgram = getTransferHookId() } = req.body;
    if (!address)
        return err(res, "'address' is required");
    const { rpc, sendAndConfirmTransaction } = getSolanaClient();
    const authority = await getAuthoritySigner();
    const stablecoin = new SolanaStablecoin({ rpc, sendAndConfirmTransaction }, mint, hookProgram);
    const tx = await stablecoin.compliance.blacklistAdd(authority, authority, address);
    const signature = await sendAndConfirmTransaction(tx, {
        commitment: "confirmed",
    });
    console.log(`[BLACKLIST] Added ${address} on ${mint} | ${signature}`);
    ok(res, { signature, address, mint, action: "blacklisted" });
}));
/**
 * POST /compliance/:mint/unblacklist
 * Body: { address, hookProgram? }
 */
router.post("/:mint/unblacklist", asyncHandler(async (req, res) => {
    const { mint } = req.params;
    const { address, hookProgram = getTransferHookId() } = req.body;
    if (!address)
        return err(res, "'address' is required");
    const { rpc, sendAndConfirmTransaction } = getSolanaClient();
    const authority = await getAuthoritySigner();
    const stablecoin = new SolanaStablecoin({ rpc, sendAndConfirmTransaction }, mint, hookProgram);
    const tx = await stablecoin.compliance.blacklistRemove(authority, authority, address);
    const signature = await sendAndConfirmTransaction(tx, {
        commitment: "confirmed",
    });
    console.log(`[BLACKLIST] Removed ${address} on ${mint} | ${signature}`);
    ok(res, { signature, address, mint, action: "unblacklisted" });
}));
/**
 * POST /compliance/:mint/seize
 * Body: { source, destination, amount, hookProgram? }
 */
router.post("/:mint/seize", asyncHandler(async (req, res) => {
    const { mint } = req.params;
    const { source, destination, amount, hookProgram = getTransferHookId(), } = req.body;
    if (!source)
        return err(res, "'source' is required");
    if (!destination)
        return err(res, "'destination' is required");
    if (!amount)
        return err(res, "'amount' is required");
    const { rpc, sendAndConfirmTransaction } = getSolanaClient();
    const authority = await getAuthoritySigner();
    const stablecoin = new SolanaStablecoin({ rpc, sendAndConfirmTransaction }, mint, hookProgram);
    const tx = await stablecoin.seize(authority, authority, source, destination, BigInt(amount));
    const signature = await sendAndConfirmTransaction(tx, {
        commitment: "confirmed",
    });
    console.log(`[SEIZE] ${amount} from ${source} → ${destination} on ${mint} | ${signature}`);
    ok(res, { signature, source, destination, amount, mint, action: "seized" });
}));
export default router;
