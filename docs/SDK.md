# SSS SDK Guide

The SSS TypeScript SDK provides an ergonomic and strongly-typed interface for interacting with the SSS programs.

## Installation

```bash
npm install @stbr/sss-token @solana/web3.js
```

## Creating a Stablecoin (Presets)

```typescript
import { SolanaStablecoin, Presets } from "@stbr/sss-token";

// Standard initialization using SSS-2
const { stablecoin, tx } = await SolanaStablecoin.create(client, {
  preset: Presets.SSS_2,
  name: "My Stablecoin",
  symbol: "MYUSD",
  decimals: 6,
  authority: adminKeypair,
  mint: mintKeypair,
  transferHookProgramId: "...",
});

await client.sendAndConfirmTransaction(tx);
```

## Custom Configurations

You can build a bespoke token combining specific extensions by omitting the preset:

```typescript
const { stablecoin, tx } = await SolanaStablecoin.create(client, {
  name: "Custom Stable",
  symbol: "CUSD",
  decimals: 6,
  authority: adminKeypair,
  mint: mintKeypair,
  extensions: {
    permanentDelegate: true,
    transferHook: false,
  },
});
```

## Compliance Operations

To perform SSS-2 exclusive actions, use the `compliance` sub-namespace to distinguish them from standard operations.

```typescript
// Add an account to the blacklist
await stablecoin.compliance.blacklistAdd(
  feePayer,
  blacklisterKeypair,
  targetAddress,
);

// Seize 50,000 tokens
await stablecoin.compliance.seize(
  feePayer,
  seizerKeypair,
  walletToSeizeFrom,
  treasuryWallet,
);
```
