# SSS Architecture

The Solana Stablecoin Standard (SSS) is composed of three interconnected layers.

## Layer 1 — Base SDK & Core Program

The `stc_program` acts as the primary mint authority, freeze authority, and metadata configuration PDA. It provides robust Role-Based Access Control (RBAC):

- **Master Authority**: Transfers authority, updates roles.
- **Minters**: Can mint up to a specific quota.
- **Pausers**: Can pause all token operations in an emergency.
- **Burners**: Can burn directly.

## Layer 2 — Modules

Modules are composable and optionally enabled on the Token-2022 Mint.

- **Compliance Module**: Includes a `transfer_hook_program`, Blacklist PDAs managed by `stc_program`, and a Permanent Delegate authority allowing token seizures.
- **Privacy Module (WIP)**: Confidential transfers and scoped allowlists.

## Data Flows

When a transfer happens on an SSS-2 token:

1. User calls the standard SPL Token transfer instruction.
2. Token-2022 halts and invokes the `transfer_hook_program`.
3. The hook checks if the `source` or `destination` address has an active Blacklist PDA.
4. If a Blacklist PDA exists, the transfer fails. If not, Token-2022 resumes the transfer.

## Security Model

- **No Single Point of Failure**: The system separates Mint/Pause/Blacklist roles.
- **Graceful Failures**: SSS-2 instructions naturally fail on SSS-1 configurations due to account constraint validations.
