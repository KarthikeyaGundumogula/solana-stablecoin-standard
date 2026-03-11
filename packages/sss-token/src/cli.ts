#!/usr/bin/env node
import { Command } from "commander";
import { SolanaStablecoin, Presets } from "./index";
import {
  createSolanaClient,
  generateKeyPairSigner,
  createKeyPairSignerFromBytes,
  airdropFactory,
  lamports,
  type Address,
} from "gill";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as os from "os";

dotenv.config();

const program = new Command();

program
  .name("sss-token")
  .description("CLI for the Solana Stablecoin Standard (SSS)")
  .version("0.1.0");

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resolveUrl(rpcUrl: string): string {
  if (rpcUrl === "localnet") return "http://127.0.0.1:8899";
  if (rpcUrl === "devnet") return "https://api.devnet.solana.com";
  if (rpcUrl === "mainnet-beta") return "https://api.mainnet-beta.solana.com";
  return rpcUrl;
}

async function getStablecoinClient(mintStr: string) {
  const rpcUrl = process.env.RPC_URL || "localnet";
  const { rpc, rpcSubscriptions, sendAndConfirmTransaction } =
    createSolanaClient({ urlOrMoniker: rpcUrl as any });

  let keypairPath =
    process.env.ADMIN_KEYPAIR || `${os.homedir()}/.config/solana/id.json`;
  if (keypairPath.startsWith("~")) {
    keypairPath = keypairPath.replace("~", os.homedir());
  }

  if (!fs.existsSync(keypairPath)) {
    throw new Error(
      `ADMIN_KEYPAIR file not found at ${keypairPath}. Set ADMIN_KEYPAIR in .env`,
    );
  }

  const secretKey = new Uint8Array(
    JSON.parse(fs.readFileSync(keypairPath, "utf-8")),
  );
  const admin = await createKeyPairSignerFromBytes(secretKey);

  const { Keypair } = await import("@solana/web3.js");
  const adminKeypair = Keypair.fromSecretKey(secretKey);

  console.log(`Using admin keypair: ${admin.address}`);
  console.log(`Using mint address:  ${mintStr}`);

  const transferHookProgramId = (process.env.TRANSFER_HOOK_PROGRAM_ID ||
    "FtPdSNiQ8ieM4yE1V8FekUk7WDbgZrx9ehb3CyaXzHtG") as Address;

  const stablecoin = new SolanaStablecoin(
    { rpc: rpc as any, sendAndConfirmTransaction },
    mintStr as Address,
    transferHookProgramId,
  );

  return {
    stablecoin,
    admin,
    adminKeypair,
    rpcUrl,
    rpc,
    rpcSubscriptions,
    sendAndConfirmTransaction,
  };
}

async function resolveAta(
  mintStr: string,
  walletStr: string,
  rpcUrl: string,
): Promise<string> {
  const { Connection, PublicKey } = await import("@solana/web3.js");
  const { getAssociatedTokenAddress } = await import("@solana/spl-token");

  const connection = new Connection(resolveUrl(rpcUrl), "confirmed");
  const mintPubkey = new PublicKey(mintStr);

  // Auto-detect token program from on-chain mint account
  let tokenProgram = new PublicKey(
    "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
  );
  const mintAccInfo = await connection.getAccountInfo(mintPubkey);
  if (mintAccInfo) tokenProgram = mintAccInfo.owner;

  const ata = await getAssociatedTokenAddress(
    mintPubkey,
    new PublicKey(walletStr),
    true,
    tokenProgram,
  );
  return ata.toBase58();
}

async function ensureFunded(
  adminAddress: string,
  rpcUrl: string,
  rpc: any,
  rpcSubscriptions: any,
) {
  const { Connection, PublicKey } = await import("@solana/web3.js");
  const connection = new Connection(resolveUrl(rpcUrl), "confirmed");
  const balance = await connection.getBalance(new PublicKey(adminAddress));

  if (
    balance < 10_000_000 &&
    (rpcUrl === "localnet" ||
      rpcUrl.includes("127.0.0.1") ||
      rpcUrl.includes("localhost"))
  ) {
    console.log(
      `⚡ Admin balance low (${balance} lamports), airdropping 2 SOL on localnet...`,
    );
    try {
      const airdrop = airdropFactory({ rpc, rpcSubscriptions } as any);
      await airdrop({
        commitment: "confirmed",
        recipientAddress: adminAddress as Address,
        lamports: lamports(2_000_000_000n),
      });
      console.log(`✅ Airdrop complete`);
    } catch {
      console.warn(
        "⚠️  Airdrop failed — fund manually: solana airdrop 5 " +
          adminAddress +
          " --url localhost",
      );
    }
  }
}

// ─── Commands ────────────────────────────────────────────────────────────────

program
  .command("init")
  .description("Initialize a new stablecoin mint")
  .option("-p, --preset <type>", "Preset: sss-1 or sss-2", "sss-1")
  .option("-n, --name <n>", "Token name", "SSS Token")
  .option("-s, --symbol <symbol>", "Token symbol", "SSS")
  .option(
    "-u, --uri <uri>",
    "Metadata URI",
    "https://example.com/metadata.json",
  )
  .option("-d, --decimals <n>", "Decimals", "6")
  .option(
    "-k, --mint-keypair <path>",
    "Path to mint keypair JSON (optional — generates new if omitted)",
  )
  .option(
    "-t, --transfer-hook <address>",
    "Transfer hook program ID (sss-2 only)",
    process.env.TRANSFER_HOOK_PROGRAM_ID ||
      "FtPdSNiQ8ieM4yE1V8FekUk7WDbgZrx9ehb3CyaXzHtG",
  )
  .action(async (options) => {
    const rpcUrl = process.env.RPC_URL || "localnet";
    console.log(
      `Initializing stablecoin — preset: ${options.preset}, network: ${rpcUrl}`,
    );

    const { rpc, rpcSubscriptions, sendAndConfirmTransaction } =
      createSolanaClient({ urlOrMoniker: rpcUrl as any });

    let keypairPath =
      process.env.ADMIN_KEYPAIR || `${os.homedir()}/.config/solana/id.json`;
    if (keypairPath.startsWith("~"))
      keypairPath = keypairPath.replace("~", os.homedir());

    if (!fs.existsSync(keypairPath)) {
      throw new Error(
        `Keypair not found at ${keypairPath}. Set ADMIN_KEYPAIR in .env`,
      );
    }

    const secretKey = new Uint8Array(
      JSON.parse(fs.readFileSync(keypairPath, "utf-8")),
    );
    const admin = await createKeyPairSignerFromBytes(secretKey);

    let mint;
    if (options.mintKeypair && fs.existsSync(options.mintKeypair)) {
      const secretKey = new Uint8Array(
        JSON.parse(fs.readFileSync(options.mintKeypair, "utf-8")),
      );
      mint = await createKeyPairSignerFromBytes(secretKey);
    } else {
      mint = await generateKeyPairSigner();
    }

    console.log(`Admin:  ${admin.address}`);
    console.log(`Mint:   ${mint.address}`);

    await ensureFunded(admin.address, rpcUrl, rpc, rpcSubscriptions);

    const preset = options.preset === "sss-2" ? Presets.SSS_2 : Presets.SSS_1;

    try {
      const { stablecoin, tx } = await SolanaStablecoin.create(
        { rpc: rpc as any, sendAndConfirmTransaction },
        {
          preset,
          name: options.name,
          symbol: options.symbol,
          uri: options.uri,
          decimals: parseInt(options.decimals),
          authority: admin,
          mint,
          transferHookProgramId:
            preset === Presets.SSS_2
              ? (options.transferHook as Address)
              : undefined,
        },
      );

      const signature = await sendAndConfirmTransaction!(tx as any, {
        commitment: "confirmed",
      });
      console.log(`✅ Mint initialized: ${stablecoin.mint}`);
      console.log(`✅ Signature: ${signature}`);
    } catch (e: any) {
      console.error(`❌ Init failed: ${e.message}`);
      if (e.logs) console.error("Logs:", e.logs);
    }
  });

program
  .command("status")
  .alias("supply")
  .description("Get on-chain status and config")
  .requiredOption("-m, --mint <address>", "The SSS token mint address")
  .action(async (options) => {
    try {
      const { stablecoin } = await getStablecoinClient(options.mint);
      const config = await stablecoin.getConfig();
      console.log(`\n--- On-Chain Status ---`);
      console.log(`Paused:                ${config.isPaused}`);
      console.log(`Master Authority:      ${config.masterAuthority}`);
      console.log(`Transfer Hook Enabled: ${config.enableTransferHook}`);
    } catch (e: any) {
      console.error(`❌ Status fetch failed: ${e.message}`);
    }
  });

// ─── Minter Management ───────────────────────────────────────────────────────

const mintersCmd = program
  .command("minters")
  .description("Manage minters and quotas");

mintersCmd
  .command("add <address>")
  .description("Grant minter role with quota")
  .requiredOption("-m, --mint <address>", "The SSS token mint address")
  .requiredOption("-q, --quota <amount>", "Quota limit in raw token units")
  .action(async (address, options) => {
    console.log(`Adding minter ${address} with quota ${options.quota}...`);
    try {
      const {
        stablecoin,
        admin,
        rpcUrl,
        rpc,
        rpcSubscriptions,
        sendAndConfirmTransaction,
      } = await getStablecoinClient(options.mint);
      await ensureFunded(admin.address, rpcUrl, rpc, rpcSubscriptions);

      const tx = await stablecoin.updateMinter(
        admin,
        admin,
        address as Address,
        true,
        BigInt(options.quota),
      );
      const sig = await sendAndConfirmTransaction!(tx as any, {
        commitment: "confirmed",
      });
      console.log(`✅ Minter added. Signature: ${sig}`);
    } catch (e: any) {
      console.error(`❌ Add minter failed: ${e.message}`);
      if (e.logs) console.error("Logs:", e.logs);
    }
  });

mintersCmd
  .command("remove <address>")
  .description("Revoke minter role")
  .requiredOption("-m, --mint <address>", "The SSS token mint address")
  .action(async (address, options) => {
    console.log(`Removing minter ${address}...`);
    try {
      const {
        stablecoin,
        admin,
        rpcUrl,
        rpc,
        rpcSubscriptions,
        sendAndConfirmTransaction,
      } = await getStablecoinClient(options.mint);
      await ensureFunded(admin.address, rpcUrl, rpc, rpcSubscriptions);

      const tx = await stablecoin.updateMinter(
        admin,
        admin,
        address as Address,
        false,
        0n,
      );
      const sig = await sendAndConfirmTransaction!(tx as any, {
        commitment: "confirmed",
      });
      console.log(`✅ Minter removed. Signature: ${sig}`);
    } catch (e: any) {
      console.error(`❌ Remove minter failed: ${e.message}`);
    }
  });

mintersCmd
  .command("list")
  .description("List all minters for a mint")
  .requiredOption("-m, --mint <address>", "The SSS token mint address")
  .action(async (options) => {
    try {
      const { rpcUrl } = await getStablecoinClient(options.mint);
      const { Connection, PublicKey } = await import("@solana/web3.js");
      const connection = new Connection(resolveUrl(rpcUrl), "confirmed");
      const programId = new PublicKey(
        "3nqtxhZZdpV5W2TPaa1hbWbeM3bhhsMg3Fy9oLdAHKfH",
      );

      const accounts = await connection.getProgramAccounts(programId, {
        filters: [
          { memcmp: { offset: 0, bytes: "83FeYWPdRW8" } },
          { memcmp: { offset: 8, bytes: options.mint } },
        ],
      });

      if (accounts.length === 0) {
        console.log("No minters found.");
        return;
      }

      console.log(`\nMinters for ${options.mint}:`);
      for (const { account } of accounts) {
        const minterPubkey = new PublicKey(account.data.slice(40, 72));
        const limit = account.data.readBigUInt64LE(72);
        const used = account.data.readBigUInt64LE(80);
        console.log(
          `  ${minterPubkey.toBase58()}  quota: ${limit} · used: ${used}`,
        );
      }
    } catch (e: any) {
      console.error(`❌ List minters failed: ${e.message}`);
    }
  });

// ─── Token Operations ────────────────────────────────────────────────────────

program
  .command("mint <recipient> <amount>")
  .description("Mint tokens to a recipient token account (ATA)")
  .requiredOption("-m, --mint <address>", "The SSS token mint address")
  .action(async (recipient, amount, options) => {
    console.log(`Minting ${amount} tokens to ${recipient}...`);
    try {
      const {
        stablecoin,
        admin,
        adminKeypair,
        rpcUrl,
        rpc,
        rpcSubscriptions,
        sendAndConfirmTransaction,
      } = await getStablecoinClient(options.mint);
      await ensureFunded(admin.address, rpcUrl, rpc, rpcSubscriptions);

      // recipient can be wallet address — resolve to ATA
      let targetAta = recipient;
      if (recipient.length < 44) {
        targetAta = await resolveAta(options.mint, recipient, rpcUrl);
        console.log(`Resolved ATA: ${targetAta}`);
      }

      const tx = await stablecoin.mintTo(
        admin, // feePayer
        admin, // minter (same wallet — must have minter role)
        targetAta as Address, // recipientOwner (ATA or wallet address)
        BigInt(amount),
        adminKeypair, // payerKeypair — needed for auto ATA creation
        rpcUrl,
      );

      const sig = await sendAndConfirmTransaction!(tx as any, {
        commitment: "confirmed",
      });
      console.log(`✅ Minted. Signature: ${sig}`);
    } catch (e: any) {
      console.error(`❌ Mint failed: ${e.message}`);
      if (e.logs) console.error("Logs:", e.logs);
    }
  });

program
  .command("burn <amount>")
  .description("Burn tokens from a token account")
  .requiredOption("-m, --mint <address>", "The SSS token mint address")
  .requiredOption(
    "--source <address>",
    "Source wallet or token account to burn from",
  )
  .action(async (amount, options) => {
    console.log(`Burning ${amount} tokens from ${options.source}...`);
    try {
      const {
        stablecoin,
        admin,
        rpcUrl,
        rpc,
        rpcSubscriptions,
        sendAndConfirmTransaction,
      } = await getStablecoinClient(options.mint);
      await ensureFunded(admin.address, rpcUrl, rpc, rpcSubscriptions);

      const sourceAta = await resolveAta(options.mint, options.source, rpcUrl);
      console.log(`Resolved ATA: ${sourceAta}`);

      const tx = await stablecoin.burn(
        admin,
        admin,
        sourceAta as Address,
        BigInt(amount),
      );
      const sig = await sendAndConfirmTransaction!(tx as any, {
        commitment: "confirmed",
      });
      console.log(`✅ Burned. Signature: ${sig}`);
    } catch (e: any) {
      console.error(`❌ Burn failed: ${e.message}`);
      if (e.logs) console.error("Logs:", e.logs);
    }
  });

// ─── Pause / Unpause ─────────────────────────────────────────────────────────

program
  .command("pause")
  .description("Pause all mint/burn/transfer operations")
  .requiredOption("-m, --mint <address>", "The SSS token mint address")
  .action(async (options) => {
    try {
      const {
        stablecoin,
        admin,
        rpcUrl,
        rpc,
        rpcSubscriptions,
        sendAndConfirmTransaction,
      } = await getStablecoinClient(options.mint);
      await ensureFunded(admin.address, rpcUrl, rpc, rpcSubscriptions);

      const tx = await stablecoin.pause(admin, admin);
      const sig = await sendAndConfirmTransaction!(tx as any, {
        commitment: "confirmed",
      });
      console.log(`✅ Paused. Signature: ${sig}`);
    } catch (e: any) {
      console.error(`❌ Pause failed: ${e.message}`);
    }
  });

program
  .command("unpause")
  .description("Unpause operations")
  .requiredOption("-m, --mint <address>", "The SSS token mint address")
  .action(async (options) => {
    try {
      const {
        stablecoin,
        admin,
        rpcUrl,
        rpc,
        rpcSubscriptions,
        sendAndConfirmTransaction,
      } = await getStablecoinClient(options.mint);
      await ensureFunded(admin.address, rpcUrl, rpc, rpcSubscriptions);

      const tx = await stablecoin.unpause(admin, admin);
      const sig = await sendAndConfirmTransaction!(tx as any, {
        commitment: "confirmed",
      });
      console.log(`✅ Unpaused. Signature: ${sig}`);
    } catch (e: any) {
      console.error(`❌ Unpause failed: ${e.message}`);
    }
  });

// ─── Freeze / Thaw ───────────────────────────────────────────────────────────

program
  .command("freeze <address>")
  .description("Freeze a wallet's token account")
  .requiredOption("-m, --mint <address>", "The SSS token mint address")
  .action(async (address, options) => {
    console.log(`Freezing ${address}...`);
    try {
      const {
        stablecoin,
        admin,
        rpcUrl,
        rpc,
        rpcSubscriptions,
        sendAndConfirmTransaction,
      } = await getStablecoinClient(options.mint);
      await ensureFunded(admin.address, rpcUrl, rpc, rpcSubscriptions);

      const targetAta = await resolveAta(options.mint, address, rpcUrl);
      console.log(`Resolved ATA: ${targetAta}`);

      const tx = await stablecoin.freezeAccount(
        admin,
        admin,
        targetAta as Address,
      );
      const sig = await sendAndConfirmTransaction!(tx as any, {
        commitment: "confirmed",
      });
      console.log(`✅ Frozen. Signature: ${sig}`);
    } catch (e: any) {
      console.error(`❌ Freeze failed: ${e.message}`);
      if (e.logs) console.error("Logs:", e.logs);
    }
  });

program
  .command("thaw <address>")
  .description("Thaw a frozen token account")
  .requiredOption("-m, --mint <address>", "The SSS token mint address")
  .action(async (address, options) => {
    console.log(`Thawing ${address}...`);
    try {
      const {
        stablecoin,
        admin,
        rpcUrl,
        rpc,
        rpcSubscriptions,
        sendAndConfirmTransaction,
      } = await getStablecoinClient(options.mint);
      await ensureFunded(admin.address, rpcUrl, rpc, rpcSubscriptions);

      const targetAta = await resolveAta(options.mint, address, rpcUrl);
      console.log(`Resolved ATA: ${targetAta}`);

      const tx = await stablecoin.thawAccount(
        admin,
        admin,
        targetAta as Address,
      );
      const sig = await sendAndConfirmTransaction!(tx as any, {
        commitment: "confirmed",
      });
      console.log(`✅ Thawed. Signature: ${sig}`);
    } catch (e: any) {
      console.error(`❌ Thaw failed: ${e.message}`);
    }
  });

// ─── Compliance ──────────────────────────────────────────────────────────────

const blacklistCmd = program
  .command("blacklist")
  .description("Manage the blacklist (SSS-2)");

blacklistCmd
  .command("add <address>")
  .description("Blacklist a wallet address")
  .requiredOption("-m, --mint <address>", "The SSS token mint address")
  .action(async (address, options) => {
    console.log(`Blacklisting ${address}...`);
    try {
      const {
        stablecoin,
        admin,
        rpcUrl,
        rpc,
        rpcSubscriptions,
        sendAndConfirmTransaction,
      } = await getStablecoinClient(options.mint);
      await ensureFunded(admin.address, rpcUrl, rpc, rpcSubscriptions);

      const tx = await stablecoin.compliance.blacklistAdd(
        admin,
        admin,
        address as Address,
      );
      const sig = await sendAndConfirmTransaction!(tx as any, {
        commitment: "confirmed",
      });
      console.log(`✅ Blacklisted. Signature: ${sig}`);
    } catch (e: any) {
      console.error(`❌ Blacklist add failed: ${e.message}`);
      if (e.logs) console.error("Logs:", e.logs);
    }
  });

blacklistCmd
  .command("remove <address>")
  .description("Remove a wallet from the blacklist")
  .requiredOption("-m, --mint <address>", "The SSS token mint address")
  .action(async (address, options) => {
    console.log(`Removing ${address} from blacklist...`);
    try {
      const {
        stablecoin,
        admin,
        rpcUrl,
        rpc,
        rpcSubscriptions,
        sendAndConfirmTransaction,
      } = await getStablecoinClient(options.mint);
      await ensureFunded(admin.address, rpcUrl, rpc, rpcSubscriptions);

      const tx = await stablecoin.compliance.blacklistRemove(
        admin,
        admin,
        address as Address,
      );
      const sig = await sendAndConfirmTransaction!(tx as any, {
        commitment: "confirmed",
      });
      console.log(`✅ Removed from blacklist. Signature: ${sig}`);
    } catch (e: any) {
      console.error(`❌ Blacklist remove failed: ${e.message}`);
    }
  });

program
  .command("seize <address>")
  .description("Seize tokens from an account (SSS-2, permanent delegate)")
  .requiredOption("-m, --mint <address>", "The SSS token mint address")
  .requiredOption("--amount <amount>", "Amount to seize in raw token units")
  .requiredOption("--to <treasury>", "Treasury wallet to receive seized tokens")
  .action(async (address, options) => {
    console.log(`Seizing ${options.amount} from ${address} → ${options.to}...`);
    try {
      const {
        stablecoin,
        admin,
        rpcUrl,
        rpc,
        rpcSubscriptions,
        sendAndConfirmTransaction,
      } = await getStablecoinClient(options.mint);
      await ensureFunded(admin.address, rpcUrl, rpc, rpcSubscriptions);

      const sourceAta = await resolveAta(options.mint, address, rpcUrl);
      const destAta = await resolveAta(options.mint, options.to, rpcUrl);
      console.log(`Source ATA: ${sourceAta}`);
      console.log(`Dest ATA:   ${destAta}`);

      const tx = await stablecoin.seize(
        admin,
        admin,
        sourceAta as Address,
        destAta as Address,
        BigInt(options.amount),
      );
      const sig = await sendAndConfirmTransaction!(tx as any, {
        commitment: "confirmed",
      });
      console.log(`✅ Seized. Signature: ${sig}`);
    } catch (e: any) {
      console.error(`❌ Seize failed: ${e.message}`);
    }
  });

program.parse();
