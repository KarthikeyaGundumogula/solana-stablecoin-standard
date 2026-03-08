# Operator Runbook

This runbook describes the workflow and CLI commands expected for day-to-day operators.

## Minting and Supply Management

A wallet with the Minter role and sufficient quota must sign mint requests. For the CLI, we assume the operator keypair is loaded.

```bash
# Mint 1,000,000 tokens to a treasury or exchange address
sss-token mint 5XYZ... 1000000

# Burn matching amounts (e.g. for fiat redemptions)
sss-token burn 1000000
```

## Freezing & Pausing

A freeze affects a single account. A pause halts the entire protocol.

```bash
# Freeze a suspicious account
sss-token freeze 5XYZ...

# Thaw after review
sss-token thaw 5XYZ...

# Pause the entire program (requires Pauser role)
sss-token pause

# Resume operations
sss-token unpause
```

## Role Updates

Only the Master Authority can update roles.

```bash
# Provide 5M token quota to a new market maker
sss-token minters add 7ABC...
# (Actual quota adjustments require backend SDK integration presently, CLI defaults to open quota based on SDK bindings)

# Revoke a minter
sss-token minters remove 7ABC...
```
