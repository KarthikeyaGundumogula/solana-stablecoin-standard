# SSS-1: Minimal Stablecoin Standard

The SSS-1 standard prescribes the smallest possible footprint for a compliant, functional stablecoin on Solana.

## Rationale

For internal corporate tokens, settlement rails, and DAO treasuries, a heavy compliance footprint (forced hooks on every transfer) is inefficient. SSS-1 relies on reactive enforcement by giving the issuer freeze authority.

## Token-2022 Extensions Used

- **MetadataPointer**: Points to itself so metadata resides on-chain natively inside the Mint account.

## Protocol Features

1. **Mint**: Managed via Minter quotas.
2. **Burn**: Any account owner can burn their tokens.
3. **Roles**: Master Authority, Minter, Burner, Pauser.
4. **Pause**: Global operations pause.
5. **Freeze**: Authority can freeze a specific token account in emergencies.

## What it lacks

- **No Permanent Delegate**: Tokens cannot be forcibly seized from an account.
- **No Transfer Hook**: Transfers do not execute custom logic, avoiding overhead and ensuring maximum compatibility with all DeFi protocols.
- **No Blacklist**: Handled off-chain by observing indexed transactions and proactively freezing accounts.
