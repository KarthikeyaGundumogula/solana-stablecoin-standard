# SSS Operator CLI

The Solana Stablecoin Standard provides a native Node.js Command Line Interface (`sss-token`) for operators and administrators to quickly initialize and manage compliant stablecoins without needing a frontend or writing custom scripts.

## Installation

Ensure you have built the CLI package from the `packages/sss-token` directory:

```bash
cd packages/sss-token
yarn install
yarn build:cli
npm link
```

This makes the `sss-token` command available globally in your terminal.

## Configuration

For production and testnet environments, the CLI relies on a `.env` file to determine the network and the keypairs to use for signing.

Create a `.env` file in the `packages/sss-token` directory (you can copy `.env.example`):

```bash
cp packages/sss-token/.env.example packages/sss-token/.env
```

### Environment Variables

Configure the following inside your `.env`:

```properties
# Network connection (e.g., localnet, https://api.devnet.solana.com, mainnet-beta)
RPC_URL=localnet

# Absolute path to your Administrator JSON Keypair (pays fees and holds authority)
ADMIN_KEYPAIR=/Users/yourname/.config/solana/id.json

# Absolute path to a pre-generated Mint JSON Keypair (determines the token address)
MINT_KEYPAIR=/Users/yourname/.config/solana/mint.json
```

> **Note:** If `ADMIN_KEYPAIR` or `MINT_KEYPAIR` are missing from the `.env` file, the CLI will automatically generate ephemeral (temporary) keypairs for testing purposes. On `localnet`, it will also attempt to airdrop 1 SOL to the generated admin wallet automatically.

## Usage

### Initialize a Stablecoin

The `init` command deploys a new stablecoin mint according to the specified SSS Standard preset.

```bash
sss-token init [options]
```

**Options:**

- `-p, --preset <type>`: SSS Preset to use (`sss-1` for Minimal, `sss-2` for Compliant). Default: `sss-1`
- `-n, --name <name>`: The display name of the stablecoin. Default: `SSS Token`
- `-s, --symbol <symbol>`: The ticker symbol. Default: `SSS`

**Examples:**

Deploy a minimal (SSS-1) settlement token:

```bash
sss-token init --preset sss-1 --name "Internal Settlement" --symbol "SETL"
```

Deploy a fully compliant (SSS-2) stablecoin with Transfer Hooks and Permanent Delegates:

```bash
sss-token init --preset sss-2 --name "Institutional USD" --symbol "IUSD"
```

### Expected Output

```
Initializing stablecoin with preset: sss-2
Connecting to network: localnet
Using admin keypair: FSFtN5rVaQzHbRQC2Ec7AinB5ehsgne15UPMPzkcZFq6
Using mint address: J9oy4gfKvgPNU1MPDgh3LYGRmSz19WCftRU6ZucG52Go
Airdropping 1 SOL for fee payment on localnet...
✅ Successfully sent tx! Signature: 63xyxxrv...
✅ Initialized SSS Token: J9oy4gfKvgPNU1MPDgh3LYGRmSz19WCftRU6ZucG52Go
```
