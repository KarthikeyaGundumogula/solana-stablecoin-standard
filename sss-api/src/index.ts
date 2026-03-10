import "dotenv/config";
import express from "express";
import cors from "cors";
import rolesRouter from "./routes/roles.js";
import complianceRouter from "./routes/compliance.js";
import operationsRouter from "./routes/operations.js";
import mintRouter from "./routes/mint.js";
import { errorMiddleware } from "./helpers.js";
import { getSolanaClient, getAuthoritySigner, getNetwork } from "./solana.js";

const app = express();
const PORT = parseInt(process.env.PORT ?? "3001");

// ── Middleware ─────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ── Routes ─────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    network: getNetwork(),
    ts: new Date().toISOString(),
  });
});

app.use("/roles", rolesRouter);
app.use("/compliance", complianceRouter);
app.use("/operations", operationsRouter);
app.use("/mint", mintRouter);

app.use((_req, res) =>
  res.status(404).json({ success: false, error: "Not found" }),
);
app.use(errorMiddleware);

// ── Boot ───────────────────────────────────────────────
async function boot() {
  try {
    await getAuthoritySigner();
    console.log(`[BOOT] Authority keypair loaded`);
  } catch (e: any) {
    console.error(`[BOOT] ${e.message}`);
    console.error(`[BOOT] Set AUTHORITY_KEYPAIR in .env`);
    console.error(
      `[BOOT] Run: solana-keygen new --outfile authority.json && cat authority.json`,
    );
    process.exit(1);
  }

  const { rpc } = getSolanaClient();
  try {
    await (rpc as any).getHealth().send();
    console.log(`[BOOT] RPC connected — ${getNetwork()}`);
  } catch {
    console.warn(`[BOOT] RPC health check failed — is your validator running?`);
  }

  app.listen(PORT, () => {
    console.log(`\n🟢 SSS API running on http://localhost:${PORT}`);
    console.log(`   Network    : ${getNetwork()}`);
    console.log(
      `   Routes     : /health /roles /compliance /operations /mint\n`,
    );
  });
}

boot();
