# Solana Stablecoin Standard (SSS)

A modular SDK with opinionated presets covering the most common stablecoin architectures on Solana. Built on Token-2022 extensions.

Think **OpenZeppelin for stablecoins**: the library is the SDK, the standards (SSS-1, SSS-2) are opinionated presets that get adopted.

## Devnet Deployment

Both programs are live on Solana Devnet:

| Program           | Program ID                                     |
| ----------------- | ---------------------------------------------- |
| **stc_program**   | `3nqtxhZZdpV5W2TPaa1hbWbeM3bhhsMg3Fy9oLdAHKfH` |
| **transfer_hook** | `FtPdSNiQ8ieM4yE1V8FekUk7WDbgZrx9ehb3CyaXzHtG` |

## Architecture

```
┌─────────────────────────────────────────────────┐
│              Layer 3 — Standard Presets          │
│  SSS-1 (Minimal)    SSS-2 (Compliant)           │
├─────────────────────────────────────────────────┤
│              Layer 2 — Modules                   │
│  Compliance Module    Privacy Module (SSS-3)     │
│  (Transfer Hook, Blacklist, Permanent Delegate)  │
├─────────────────────────────────────────────────┤
│              Layer 1 — Base SDK                  │
│  Token Creation · Mint/Freeze Authority          │
│  Role Management · CLI · TypeScript SDK          │
└─────────────────────────────────────────────────┘
```

## Standards

| Standard  | Name                 | Description                                                                                     |
| --------- | -------------------- | ----------------------------------------------------------------------------------------------- |
| **SSS-1** | Minimal Stablecoin   | Mint authority + freeze authority + metadata. What's needed on every stable, nothing more.      |
| **SSS-2** | Compliant Stablecoin | SSS-1 + permanent delegate + transfer hook + blacklist enforcement. USDC/USDT-class compliance. |

## Quick Start

### Initialize a stablecoin

```bash
# Install the CLI package globally
cd packages/sss-token
npm install -g .

# SSS-1: Minimal
sss-token init sss-1 --name "My Stablecoin" --symbol "MUSD"

# SSS-2: Compliant
sss-token init sss-2 --name "Regulated USD" --symbol "RUSD"
```

### Operations

```bash
# Mint tokens
sss-token mint -m <mint_address> <recipient_address> 1000000

# Burn tokens
sss-token burn -m <mint_address> 500000

# Freeze/thaw accounts
sss-token freeze -m <mint_address> <account_address>
sss-token thaw -m <mint_address> <account_address>

# Pause/unpause all operations
sss-token pause -m <mint_address>
sss-token unpause -m <mint_address>

# Check status
sss-token status -m <mint_address>
```

### SSS-2 Compliance

```bash
# Blacklist management
sss-token blacklist add -m <mint_address> <address>
sss-token blacklist remove -m <mint_address> <address>

# Seize tokens (via permanent delegate)
sss-token seize -m <mint_address> <from_address> <to_treasury>

# Minter management
sss-token minters list -m <mint_address>
sss-token minters add -m <mint_address> <address> -q 1000000
sss-token minters remove -m <mint_address> <address>
```

### TypeScript SDK

```typescript
import { SolanaStablecoin, Presets } from "@stbr/sss-token";

// SSS-2 preset setup
const { stablecoin, tx } = await SolanaStablecoin.create(clientInfo, {
  preset: Presets.SSS_2,
  name: "My Stablecoin",
  symbol: "MYUSD",
  decimals: 6,
  authority: adminSigner,
  mint: mintSigner,
});

// Operations
await stablecoin.mintTo(
  adminSigner,
  adminSigner,
  recipientAddress,
  1000000n,
  adminKeypair,
  rpcUrl,
);
await stablecoin.blacklistAdd(adminSigner, adminSigner, blacklistedAddress);
await stablecoin.seize(
  adminSigner,
  adminSigner,
  frozenAccount,
  treasuryAccount,
  100n,
);
```

## Project Structure

```
solana-stablecoin-standard/
├── programs/
│   ├── stc_program/         # Core Anchor program (SSS-1 + SSS-2)
│   │   └── src/
│   │       ├── lib.rs        # Program entrypoint
│   │       ├── state.rs      # Account definitions
│   │       ├── instructions/ # All instruction handlers
│   │       └── error.rs      # Error codes
│   └── transfer_hook/       # Transfer hook program (SSS-2 blacklist enforcement)
├── packages/
│   └── sss-token/           # Core TypeScript SDK and CLI (@stbr/sss-token)
├── sss-api/                 # Backend REST API for Launchpad
├── sss-demo/                # Frontend application
├── docs/                    # Documentation
│   ├── CLI.md
│   └── ...
└── tests/                   # Integration tests
```

## Role-Based Access Control

No single key controls everything:

| Role                 | Capabilities                                |
| -------------------- | ------------------------------------------- |
| **Master Authority** | Assign/revoke all roles, transfer authority |
| **Minter**           | Mint tokens (with per-minter quotas)        |
| **Burner**           | Burn tokens                                 |
| **Pauser**           | Pause/unpause, freeze/thaw accounts         |
| **Blacklister**      | Add/remove from blacklist (SSS-2)           |
| **Seizer**           | Seize tokens via permanent delegate (SSS-2) |

## Token-2022 Extensions Used

| Extension             | SSS-1 | SSS-2    | Purpose                                 |
| --------------------- | ----- | -------- | --------------------------------------- |
| Metadata Pointer      | ✓     | ✓        | On-chain metadata                       |
| Mint/Freeze Authority | ✓     | ✓        | Token control                           |
| Permanent Delegate    |       | ✓        | Token seizure                           |
| Transfer Hook         |       | ✓        | Blacklist enforcement on every transfer |
| Default Account State |       | Optional | Freeze new accounts by default          |

## Development

```bash
# Build programs
anchor build

# Run tests
anchor test

# Build SDK & CLI
cd packages/sss-token
npm run build:cli
npm run build:sdk
```

## Example Workflow(CLI)

1. create token with preset

```bash
sss-token init --preset sss-1 --name "Internal Settlement" --symbol "SETL"
```

devnet_transaction - https://solscan.io/tx/4mhvZQ8tDEEPEKcy7j47EqXHyJZKhZF3sBpJ4HFQePdgUiFThAVui7ACbHxZBKERSce8a852FGVXCB53kyTu57xX?cluster=devnet

2. add minter role with quota

```bash
sss-token minters add HGbe7AjNtNNuU3QmninLVZhcY1bJGEyuXVLrbw1EPyCW -m AVMs4cWazivk7MeWaVSEHjGa7gYMiS7tGdkwshLhr98e -q 100000
```

devnet_transaction - https://solscan.io/tx/3yNjs8NpPc3bgHdWVPvKJBNfb2sz9ZvP6G9uxg1hUsSp6ZkMScQyL1GzxLDoKSMeRQ23KFnHGvP8iSt5CyTbHiDr?cluster=devnet

3. check whether the minter role is added or not

```bash
 sss-token minters list -m AVMs4cWazivk7MeWaVSEHjGa7gYMiS7tGdkwshLhr98e
```

4. mint some tokens

```bash
 sss-token mint HGbe7AjNtNNuU3QmninLVZhcY1bJGEyuXVLrbw1EPyCW 100 -m AVMs4cWazivk7MeWaVSEHjGa7gYMiS7tGdkwshLhr98e
```

devnet transaction - https://solscan.io/tx/5bnMEGec8L6rFYfxL3Lm7hV5Zn8bXNx63k75pB9Y8MVBSsPWb5XCsX5EcQcSdeBADQ8zQ4mTuNVmc24EupKH1npF?cluster=devnet

## License

MIT
