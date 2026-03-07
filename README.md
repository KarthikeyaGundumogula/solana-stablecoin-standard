# Solana Stablecoin Standard (SSS)

The **Solana Stablecoin Standard (SSS)** is an open-source, modular framework for creating stablecoins on Solana using Token-2022. It provides a standard path for both simple utility stablecoins and fully compliant fiat-backed stablecoins.

## Overview

- **Layer 1 (Base SDK)**: Token creation with mint authority + freeze authority + metadata.
- **Layer 2 (Modules)**: Composable pieces that add capabilities like permanent delegates, transfer hooks, and blacklist enforcement.
- **Layer 3 (Presets)**: Opinionated combinations of Layers 1 and 2, yielding standards like **SSS-1** and **SSS-2**.

## Quick Start

Install the CLI and SDK:

```bash
npm install -g @stbr/sss-token
```

To initialize a new stablecoin, choose a preset:

```bash
# Minimal Stablecoin
sss-token init --preset sss-1 --name "My Stable" --symbol "MYS"

# Compliant Stablecoin (Requires pre-deployed transfer hook)
sss-token init --preset sss-2 --name "Compliant USD" --symbol "CUSD"
```

## Preset Comparison

| Feature                   | SSS-1 (Minimal) | SSS-2 (Compliant)        |
| ------------------------- | --------------- | ------------------------ |
| Mint & Freeze Authority   | Yes             | Yes                      |
| Token-2022 Metadata       | Yes             | Yes                      |
| Role Management           | Yes             | Yes                      |
| Pause / Unpause           | Yes             | Yes                      |
| Seize Tokens              | No              | Yes (Permanent Delegate) |
| Transfer Hook (Blacklist) | No              | Yes                      |
| Default Account State     | Unfrozen        | Frozen                   |
