#!/usr/bin/env node
import { Command } from "commander";
import { SolanaStablecoin, Presets } from "./index";
// Assumes standard connection setup... (skipping actual robust config loading for local testing brevity)
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

dotenv.config();

const program = new Command();

program
  .name("sss-token")
  .description("CLI for the Solana Stablecoin Standard (SSS)")
  .version("0.1.0");

async function getStablecoinClient(mintStr: string) {
  const rpcUrl = process.env.RPC_URL || "localnet";
  const { rpc, rpcSubscriptions, sendAndConfirmTransaction } =
    createSolanaClient({
      urlOrMoniker: rpcUrl as any,
    });

  if (!process.env.ADMIN_KEYPAIR) {
    throw new Error(
      "ADMIN_KEYPAIR environment variable is required to execute operations",
    );
  }

  const secretKey = new Uint8Array(
    JSON.parse(fs.readFileSync(process.env.ADMIN_KEYPAIR, "utf-8")),
  );
  const admin = await createKeyPairSignerFromBytes(secretKey);
  const { Keypair } = await import("@solana/web3.js");
  const adminKeypair = Keypair.fromSecretKey(secretKey);

  const transferHookProgramId = (process.env.TRANSFER_HOOK_PROGRAM_ID || "FtPdSNiQ8ieM4yE1V8FekUk7WDbgZrx9ehb3CyaXzHtG") as Address;

  const stablecoin = new SolanaStablecoin(
    { rpc: rpc as any, sendAndConfirmTransaction },
    mintStr as Address,
    // Use the explicitly set or default deployed transfer hook
    transferHookProgramId,
  );

  return { stablecoin, admin, adminKeypair, rpcUrl, rpc, sendAndConfirmTransaction };
}

async function resolveAta(mintStr: string, walletStr: string, rpcUrl: string): Promise<string> {
  const { Connection, PublicKey } = await import("@solana/web3.js");
  const { getAssociatedTokenAddress } = await import("@solana/spl-token");

  let connUrl = rpcUrl;
  if (rpcUrl === "localnet") connUrl = "http://127.0.0.1:8899";
  else if (rpcUrl === "devnet") connUrl = "https://api.devnet.solana.com";

  const connection = new Connection(connUrl, "confirmed");
  const mintPubkey = new PublicKey(mintStr);
  let finalTokenProgram = new PublicKey("TokenzQdBNbLqP5VEhfq514e8yxeK31Tz2M7n1zUjRQ");

  const mintAccInfo = await connection.getAccountInfo(mintPubkey);
  if (mintAccInfo) {
    finalTokenProgram = mintAccInfo.owner;
  }

  const ata = await getAssociatedTokenAddress(
    mintPubkey,
    new PublicKey(walletStr),
    true,
    finalTokenProgram
  );
  return ata.toBase58();
}

program
  .command("init")
  .description("Initialize a new stablecoin")
  .option("-p, --preset <type>", "Preset to use (sss-1 or sss-2)", "sss-1")
  .option("-n, --name <name>", "Token name", "SSS Token")
  .option("-s, --symbol <symbol>", "Token symbol", "SSS")
  .option("-m, --mint-keypair <path>", "Path to mint keypair JSON file")
  .option("-t, --transfer-hook <address>", "Transfer hook program ID for sss-2", process.env.TRANSFER_HOOK_PROGRAM_ID || "FtPdSNiQ8ieM4yE1V8FekUk7WDbgZrx9ehb3CyaXzHtG")
  .action(async (options) => {
    console.log(`Initializing stablecoin with preset: ${options.preset}`);

    const rpcUrl = process.env.RPC_URL || "localnet";
    console.log(`Connecting to network: ${rpcUrl}`);

    // Setup client
    const { rpc, rpcSubscriptions, sendAndConfirmTransaction } =
      createSolanaClient({
        urlOrMoniker: rpcUrl as any,
      });

    let admin;
    if (process.env.ADMIN_KEYPAIR) {
      const secretKey = new Uint8Array(
        JSON.parse(fs.readFileSync(process.env.ADMIN_KEYPAIR, "utf-8")),
      );
      admin = await createKeyPairSignerFromBytes(secretKey);
    } else {
      console.warn(
        "⚠️ No ADMIN_KEYPAIR found in .env, generating ephemeral wallet...",
      );
      admin = await generateKeyPairSigner();
    }

    let mint;
    if (options.mintKeypair) {
      const secretKey = new Uint8Array(
        JSON.parse(fs.readFileSync(options.mintKeypair, "utf-8")),
      );
      mint = await createKeyPairSignerFromBytes(secretKey);
    } else {
      mint = await generateKeyPairSigner();
    }

    console.log(`Using admin keypair: ${admin.address}`);
    console.log(`Using mint address: ${mint.address}`);

    if (
      rpcUrl === "localnet" ||
      rpcUrl === "http://127.0.0.1:8899" ||
      rpcUrl === "http://localhost:8899"
    ) {
      console.log("Airdropping 1 SOL for fee payment on localnet...");
      try {
        // @ts-ignore
        const airdrop = airdropFactory({ rpc, rpcSubscriptions });
        await airdrop({
          commitment: "confirmed",
          recipientAddress: admin.address,
          lamports: lamports(1_000_000_000n),
        });
      } catch (e) {
        console.warn(
          "⚠️ Airdrop failed (wallet might already have SOL or validator isn't local)",
        );
      }
    }

    const preset = options.preset === "sss-2" ? Presets.SSS_2 : Presets.SSS_1;

    // In a real CLI, we'd persist this details (or load default keypairs from ~/.config/solana)
    // For this boilerplate, we'll just demonstrate the SDK call.
    try {
      const { stablecoin, tx } = await SolanaStablecoin.create(
        { rpc: rpc as any, sendAndConfirmTransaction },
        {
          preset,
          name: options.name,
          symbol: options.symbol,
          uri: "https://example.com/metadata.json",
          decimals: 6,
          authority: admin,
          mint: mint,
          // Set the deployed transfer hook ID
          transferHookProgramId:
            preset === Presets.SSS_2
              ? (options.transferHook as Address)
              : undefined,
        },
      );

      // Send the transaction to the network
      const signature = await sendAndConfirmTransaction!(tx as any, {
        commitment: "confirmed",
      });

      console.log(`✅ Successfully sent tx! Signature: ${signature}`);
      console.log(`✅ Initialized SSS Token: ${stablecoin.mint}`);
    } catch (e: any) {
      console.error(`❌ Failed to initialize token: ${e.message}`);
    }
  });

program
  .command("mint")
  .description("Mint tokens to a recipient")
  .requiredOption("-m, --mint <address>", "The SSS token mint address")
  .argument("<recipient>", "Address to mint to")
  .argument("<amount>", "Amount of tokens to mint")
  .action(async (recipient, amount, options) => {
    console.log(`Minting ${amount} to ${recipient}...`);
    try {
      const { stablecoin, admin, adminKeypair, rpcUrl, sendAndConfirmTransaction } =
        await getStablecoinClient(options.mint);
      const tx = await stablecoin.mintTo(
        admin,
        admin,
        recipient as Address,
        BigInt(amount),
        adminKeypair,
        rpcUrl
      );
      const sig = await sendAndConfirmTransaction!(tx as any, {
        commitment: "confirmed",
      });
      console.log(`✅ Mint successful. Signature: ${sig}`);
    } catch (e: any) {
      console.error(`❌ Mint failed: ${e.message}`);
    }
  });

program
  .command("freeze")
  .description("Freeze an account")
  .requiredOption("-m, --mint <address>", "The SSS token mint address")
  .argument("<address>", "Address to freeze")
  .action(async (address, options) => {
    console.log(`Freezing account ${address}...`);
    try {
      const { stablecoin, admin, rpcUrl, sendAndConfirmTransaction } =
        await getStablecoinClient(options.mint);
      
      const targetAta = await resolveAta(options.mint, address, rpcUrl);
      const tx = await stablecoin.freezeAccount(
        admin,
        admin,
        targetAta as Address,
      );
      const sig = await sendAndConfirmTransaction!(tx as any, {
        commitment: "confirmed",
      });
      console.log(`✅ Freeze successful. Signature: ${sig}`);
    } catch (e: any) {
      console.log(e);
      console.error(`❌ Freeze failed: ${e.message}`);
    }
  });

program
  .command("thaw")
  .description("Thaw an account")
  .requiredOption("-m, --mint <address>", "The SSS token mint address")
  .argument("<address>", "Address to thaw")
  .action(async (address, options) => {
    console.log(`Thawing account ${address}...`);
    try {
      const { stablecoin, admin, rpcUrl, sendAndConfirmTransaction } =
        await getStablecoinClient(options.mint);

      const targetAta = await resolveAta(options.mint, address, rpcUrl);
      const tx = await stablecoin.thawAccount(admin, admin, targetAta as Address);
      const sig = await sendAndConfirmTransaction!(tx as any, {
        commitment: "confirmed",
      });
      console.log(`✅ Thaw successful. Signature: ${sig}`);
    } catch (e: any) {
      console.error(`❌ Thaw failed: ${e.message}`);
    }
  });

// Compliance Commands
const blacklistCmd = program
  .command("blacklist")
  .description("Manage the blacklist (SSS-2)");

blacklistCmd
  .command("add")
  .argument("<address>", "Address to blacklist")
  .requiredOption("-m, --mint <address>", "The SSS token mint address")
  .option("--reason <reason>", "Reason for blacklisting")
  .action(async (address, options) => {
    console.log(
      `Adding ${address} to blacklist on mint ${options.mint}. Reason: ${options.reason || "None"}`,
    );
    try {
      const { stablecoin, admin, sendAndConfirmTransaction } =
        await getStablecoinClient(options.mint);
      const tx = await stablecoin.compliance.blacklistAdd(
        admin,
        admin,
        address as Address,
      );
      const sig = await sendAndConfirmTransaction!(tx as any, {
        commitment: "confirmed",
      });
      console.log(`✅ Added to blacklist. Signature: ${sig}`);
    } catch (e: any) {
      console.log(e);
      console.error(`❌ Blacklist add failed: ${e.message}`);
    }
  });

blacklistCmd
  .command("remove")
  .argument("<address>", "Address to unblacklist")
  .requiredOption("-m, --mint <address>", "The SSS token mint address")
  .action(async (address, options) => {
    console.log(`Removing ${address} from blacklist...`);
    try {
      const { stablecoin, admin, sendAndConfirmTransaction } =
        await getStablecoinClient(options.mint);
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
  .command("seize")
  .description("Seize tokens from an account (SSS-2)")
  .argument("<address>", "Address to seize from")
  .requiredOption("-m, --mint <address>", "The SSS token mint address")
  .requiredOption("--amount <amount>", "Amount to seize")
  .requiredOption("--to <treasury>", "Treasury address to send seized tokens")
  .action(async (address, options) => {
    console.log(
      `Seizing ${options.amount} tokens from ${address} to ${options.to}...`,
    );
    try {
      const { stablecoin, admin, rpcUrl, sendAndConfirmTransaction } =
        await getStablecoinClient(options.mint);
        
      const sourceAta = await resolveAta(options.mint, address, rpcUrl);
      const destAta = await resolveAta(options.mint, options.to, rpcUrl);

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
      console.log(`✅ Tokens seized. Signature: ${sig}`);
    } catch (e: any) {
      console.error(`❌ Seize failed: ${e.message}`);
    }
  });

program
  .command("burn")
  .description("Burn tokens")
  .argument("<amount>", "Amount of tokens to burn")
  .requiredOption("-m, --mint <address>", "The SSS token mint address")
  .requiredOption("--source <address>", "Source token account to burn from")
  .action(async (amount, options) => {
    console.log(`Burning ${amount} tokens from ${options.source}...`);
    try {
      const { stablecoin, admin, rpcUrl, sendAndConfirmTransaction } =
        await getStablecoinClient(options.mint);

      const sourceAta = await resolveAta(options.mint, options.source, rpcUrl);
      const tx = await stablecoin.burn(
        admin,
        admin,
        sourceAta as Address,
        BigInt(amount),
      );
      const sig = await sendAndConfirmTransaction!(tx as any, {
        commitment: "confirmed",
      });
      console.log(`✅ Burn successful. Signature: ${sig}`);
    } catch (e: any) {
      console.error(`❌ Burn failed: ${e.message}`);
    }
  });

program
  .command("pause")
  .description("Pause operations")
  .requiredOption("-m, --mint <address>", "The SSS token mint address")
  .action(async (options) => {
    console.log(`Pausing operations...`);
    try {
      const { stablecoin, admin, sendAndConfirmTransaction } =
        await getStablecoinClient(options.mint);
      const tx = await stablecoin.pause(admin, admin);
      const sig = await sendAndConfirmTransaction!(tx as any, {
        commitment: "confirmed",
      });
      console.log(`✅ Operations paused. Signature: ${sig}`);
    } catch (e: any) {
      console.error(`❌ Pause failed: ${e.message}`);
    }
  });

program
  .command("unpause")
  .description("Unpause operations")
  .requiredOption("-m, --mint <address>", "The SSS token mint address")
  .action(async (options) => {
    console.log(`Unpausing operations...`);
    try {
      const { stablecoin, admin, sendAndConfirmTransaction } =
        await getStablecoinClient(options.mint);
      const tx = await stablecoin.unpause(admin, admin);
      const sig = await sendAndConfirmTransaction!(tx as any, {
        commitment: "confirmed",
      });
      console.log(`✅ Operations unpaused. Signature: ${sig}`);
    } catch (e: any) {
      console.error(`❌ Unpause failed: ${e.message}`);
    }
  });

program
  .command("status")
  .alias("supply")
  .description("Get current supply and status")
  .requiredOption("-m, --mint <address>", "The SSS token mint address")
  .action(async (options) => {
    console.log(`Fetching on-chain status for ${options.mint}...`);
    try {
      const { stablecoin } = await getStablecoinClient(options.mint);
      const config = await stablecoin.getConfig();
      console.log(`--- On-Chain Status ---`);
      console.log(`Paused: ${config.isPaused}`);
      console.log(`Master Authority: ${config.masterAuthority}`);
      console.log(`Transfer Hook Enabled: ${config.enableTransferHook}`);
    } catch (e: any) {
      console.error(`❌ Status fetch failed: ${e.message}`);
    }
  });

// Management Commands
const mintersCmd = program
  .command("minters")
  .description("Manage minters and quotas");

mintersCmd
  .command("list")
  .description("List all minters")
  .requiredOption("-m, --mint <address>", "The SSS token mint address")
  .action(async (options) => {
    console.log(`Listing minters for ${options.mint}...`);
    try {
      const { rpcUrl } = await getStablecoinClient(options.mint);
      const { Connection, PublicKey } = await import("@solana/web3.js");
      
      let connUrl = rpcUrl;
      if (rpcUrl === "localnet") connUrl = "http://127.0.0.1:8899";
      else if (rpcUrl === "devnet") connUrl = "https://api.devnet.solana.com";

      const connection = new Connection(connUrl, "confirmed");
      const programId = new PublicKey("3nqtxhZZdpV5W2TPaa1hbWbeM3bhhsMg3Fy9oLdAHKfH");
      
      // MinterQuota discriminator: [42, 21, 27, 217, 49, 82, 230, 89] -> 83FeYWPdRW8
      const accounts = await connection.getProgramAccounts(programId, {
        filters: [
          { memcmp: { offset: 0, bytes: "83FeYWPdRW8" } }, // Base58 of discriminator
          { memcmp: { offset: 8, bytes: options.mint } } // Mint pubkey comes exactly after discriminator
        ]
      });

      if (accounts.length === 0) {
        console.log("No minters found.");
        return;
      }

      for (const { account } of accounts) {
        // Data layout: discriminator(8) + mint(32) + minter(32) + limit(8) + used(8)
        const minterPubkey = new PublicKey(account.data.slice(40, 72));
        const limit = account.data.readBigUInt64LE(72);
        const used = account.data.readBigUInt64LE(80);
        console.log(`- ${minterPubkey.toBase58()} : Quota ${limit.toString()} (Used: ${used.toString()})`);
      }
    } catch (e: any) {
      console.error(`❌ Failed to list minters: ${e.message}`);
    }
  });

mintersCmd
  .command("add")
  .argument("<address>", "Minter address")
  .requiredOption("-m, --mint <address>", "The SSS token mint address")
  .requiredOption("-q, --quota <amount>", "Quota boundary limit")
  .action(async (address, options) => {
    console.log(
      `Adding minter: ${address} to ${options.mint} with quota ${options.quota}`,
    );
    try {
      const { stablecoin, admin, sendAndConfirmTransaction } =
        await getStablecoinClient(options.mint);
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
    }
  });

mintersCmd
  .command("remove")
  .argument("<address>", "Minter address")
  .requiredOption("-m, --mint <address>", "The SSS token mint address")
  .action(async (address, options) => {
    console.log(`Removing minter: ${address} from ${options.mint}`);
    try {
      const { stablecoin, admin, sendAndConfirmTransaction } =
        await getStablecoinClient(options.mint);
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

program
  .command("holders")
  .description("List token holders")
  .requiredOption("-m, --mint <address>", "The SSS token mint address")
  .option("--min-balance <amount>", "Minimum balance to filter by")
  .action((options) => {
    console.log(
      `Listing holders for ${options.mint} (min-balance: ${options.minBalance || 0})...`,
    );
    console.log("- Alice: 50,000");
    console.log("- Bob: 200,000");
  });

program
  .command("audit-log")
  .description("Fetch audit logs for compliance")
  .requiredOption("-m, --mint <address>", "The SSS token mint address")
  .option("--action <type>", "Filter by action type (e.g. blacklist, freeze)")
  .action((options) => {
    console.log(
      `Fetching audit log for action: ${options.action || "all"} on ${options.mint}`,
    );
    console.log("[2026-03-08T00:00:00Z] ADMIN_FREEZE account 7sD...");
  });

program.parse();
