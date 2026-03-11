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

### Minting & Supply Management

Mint new tokens to a specific wallet address. Requires the caller to have the `Minter` role.

```bash
sss-token mint <recipient_wallet_address> <amount> -m <mint_address>
sss-token mint HGbe7AjNtNNuU3QmninLVZhcY1bJGEyuXVLrbw1EPyCW 100 -m 7Hs3gbPjNX67PCVNDbBbBLsZbinx3fW2DQ4jJCEzRhhQ
```

_Example: `sss-token mint 5XyZ... 1000 -m J9oy...`_
_Note: The CLI will automatically resolve and create the Associated Token Account (ATA) for the recipient if it does not exist._

Burn tokens:

```bash
sss-token burn <amount> -m <mint_address> --source <source_wallet_address>
```

_Example: `sss-token burn 500 -m J9oy... --source 5XyZ...`_

### Account Controls

Freeze an account to prevent it from sending or receiving tokens (Requires `Pauser` authority or Master Authority).

```bash
sss-token freeze <address> -m <mint_address>
```

Thaw (unfreeze) an account to restore access:

```bash
sss-token thaw <address> -m <mint_address>
```

### Role Management & Quotas

Manage minters and their quotas.

List all approved minters:

```bash
sss-token minters list -m <mint_address>
```

Add a new minter (grants the Minter role):

```bash
sss-token minters add <address> -m <mint_address> -q <quota>
```
example with local key
```bash
sss-token minters add HGbe7AjNtNNuU3QmninLVZhcY1bJGEyuXVLrbw1EPyCW -m AVMs4cWazivk7MeWaVSEHjGa7gYMiS7tGdkwshLhr98e -q 100000
```

Remove a minter (revokes the Minter role):

```bash
sss-token minters remove <address> -m <mint_address>
```

### Compliance & Blacklist (SSS-2 Only)

SSS-2 tokens support advanced compliance features via Transfer Hooks and Permanent Delegates.

Add an address to the global blacklist (preventing all transfers involving it):

```bash
sss-token blacklist add <address> -m <mint_address> --reason "Suspected fraud"
```

Remove an address from the global blacklist:

```bash
sss-token blacklist remove <address> -m <mint_address>
```

Seize tokens from an account to a designated treasury (Requires `Permanent Delegate` authority):

```bash
sss-token seize <address> -m <mint_address> --amount <amount> --to <treasury_address>
```

### Operations & Auditing

Pause all token operations globally (emergency stop):

```bash
sss-token pause -m <mint_address>
```

Unpause all token operations globally:

```bash
sss-token unpause -m <mint_address>
```

Get the current global status of the stablecoin (supply, pause status, etc.):

```bash
sss-token status -m <mint_address>
# OR
sss-token supply -m <mint_address>
```

List all token holders (optionally filtering by minimum balance):

```bash
sss-token holders -m <mint_address> --min-balance 1000
```

Fetch compliance audit logs (history of freezes, blacklists, seizures):

```bash
sss-token audit-log -m <mint_address> --action blacklist
```
