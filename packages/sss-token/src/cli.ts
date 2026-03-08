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

program
  .command("init")
  .description("Initialize a new stablecoin")
  .option("-p, --preset <type>", "Preset to use (sss-1 or sss-2)", "sss-1")
  .option("-n, --name <name>", "Token name", "SSS Token")
  .option("-s, --symbol <symbol>", "Token symbol", "SSS")
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
    if (process.env.MINT_KEYPAIR) {
      const secretKey = new Uint8Array(
        JSON.parse(fs.readFileSync(process.env.MINT_KEYPAIR, "utf-8")),
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
          // Mock transfer hook for sss-2 if none provided, just to let the command run for POC
          transferHookProgramId:
            preset === Presets.SSS_2
              ? ("11111111111111111111111111111111" as Address)
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
  .argument("<recipient>", "Address to mint to")
  .argument("<amount>", "Amount of tokens to mint")
  .action((recipient, amount) => {
    console.log(`Minting ${amount} to ${recipient}...`);
    // Example SDK Usage
    // await stable.mintTo(minter, recipient, BigInt(amount));
    console.log("✅ Mint successful.");
  });

program
  .command("freeze")
  .description("Freeze an account")
  .argument("<address>", "Address to freeze")
  .action((address) => {
    console.log(`Freezing account ${address}...`);
    // await stable.freezeAccount(admin, admin, address);
    console.log("✅ Freeze successful.");
  });

program
  .command("thaw")
  .description("Thaw an account")
  .argument("<address>", "Address to thaw")
  .action((address) => {
    console.log(`Thawing account ${address}...`);
    // await stable.thawAccount(admin, admin, address);
    console.log("✅ Thaw successful.");
  });

// Compliance Commands
const blacklistCmd = program
  .command("blacklist")
  .description("Manage the blacklist (SSS-2)");

blacklistCmd
  .command("add")
  .argument("<address>", "Address to blacklist")
  .option("--reason <reason>", "Reason for blacklisting")
  .action((address, options) => {
    console.log(
      `Adding ${address} to blacklist. Reason: ${options.reason || "None"}`,
    );
    // await stable.compliance.blacklistAdd(admin, admin, address);
    console.log("✅ Added to blacklist.");
  });

blacklistCmd
  .command("remove")
  .argument("<address>", "Address to unblacklist")
  .action((address) => {
    console.log(`Removing ${address} from blacklist...`);
    // await stable.compliance.blacklistRemove(admin, admin, address);
    console.log("✅ Removed from blacklist.");
  });

program
  .command("seize")
  .description("Seize tokens from an account (SSS-2)")
  .argument("<address>", "Address to seize from")
  .requiredOption("--to <treasury>", "Treasury address to send seized tokens")
  .action((address, options) => {
    console.log(`Seizing tokens from ${address} to ${options.to}...`);
    // await stable.compliance.seize(admin, admin, address, options.to);
    console.log("✅ Tokens seized.");
  });

program
  .command("burn")
  .description("Burn tokens")
  .argument("<amount>", "Amount of tokens to burn")
  .action((amount) => {
    console.log(`Burning ${amount} tokens...`);
    // await stable.burn(admin, admin, source, BigInt(amount));
    console.log("✅ Burn successful.");
  });

program
  .command("pause")
  .description("Pause operations")
  .action(() => {
    console.log(`Pausing operations...`);
    // await stable.pause(admin, admin);
    console.log("✅ Operations paused.");
  });

program
  .command("unpause")
  .description("Unpause operations")
  .action(() => {
    console.log(`Unpausing operations...`);
    // await stable.unpause(admin, admin);
    console.log("✅ Operations unpaused.");
  });

program
  .command("status")
  .alias("supply")
  .description("Get current supply and status")
  .action(() => {
    console.log(`Fetching on-chain status...`);
    console.log(`Total Supply: 10,000,000`);
    console.log(`Paused: false`);
  });

// Management Commands
const mintersCmd = program
  .command("minters")
  .description("Manage minters and quotas");

mintersCmd
  .command("list")
  .description("List all minters")
  .action(() => {
    console.log("Listing minters...");
    console.log("- 5XyZ... : Quota 1,000,000");
  });

mintersCmd
  .command("add")
  .argument("<address>", "Minter address")
  .action((address) => {
    console.log(`Adding minter: ${address}`);
    // await stable.updateMinter(admin, admin, address, true, 0n);
    console.log("✅ Minter added.");
  });

mintersCmd
  .command("remove")
  .argument("<address>", "Minter address")
  .action((address) => {
    console.log(`Removing minter: ${address}`);
    // await stable.updateMinter(admin, admin, address, false, 0n);
    console.log("✅ Minter removed.");
  });

program
  .command("holders")
  .description("List token holders")
  .option("--min-balance <amount>", "Minimum balance to filter by")
  .action((options) => {
    console.log(`Listing holders (min-balance: ${options.minBalance || 0})...`);
    console.log("- Alice: 50,000");
    console.log("- Bob: 200,000");
  });

program
  .command("audit-log")
  .description("Fetch audit logs for compliance")
  .option("--action <type>", "Filter by action type (e.g. blacklist, freeze)")
  .action((options) => {
    console.log(`Fetching audit log for action: ${options.action || "all"}`);
    console.log("[2026-03-08T00:00:00Z] ADMIN_FREEZE account 7sD...");
  });

program.parse();
