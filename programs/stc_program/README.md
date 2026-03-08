# Solana Stablecoin Standard (SSS) On-Chain Program

## Overview

This is the core on-chain program (smart contract) for the Solana Stablecoin Standard (SSS), built using the Anchor framework and Solana's Token-2022 standard. It provides a modular, role-based architecture for deploying and managing stablecoins, ranging from simple utility tokens to fully compliant, fiat-backed stablecoins.

## What is Built

The program implements two main presets:

1. **SSS-1 (Minimal Stablecoin)**: A lightweight standard that uses Token-2022 with only the `MetadataPointer` extension. It supports role-based access control (RBAC) for minting, burning, pausing, and freezing accounts.
2. **SSS-2 (Compliant Stablecoin)**: A fully compliant standard that adds the `PermanentDelegate` and `TransferHook` extensions. It supports all SSS-1 features plus the ability to seize tokens and enforce compliance through an on-chain blacklist.

### Core Features & Architecture

- **Master Authority**: The initial deployer of the stablecoin becomes the master authority, recorded in the `StablecoinConfig` PDA. The mint's true authority is transferred to this program PDA, meaning no individual can mint directly without going through the program's defined Role-Based Access Control (RBAC).
- **Role-Based Access Control (RBAC)**: Supports modular roles such as `Minter` (with individual quotas), `Burner`, `Pauser`, `Blacklister` (SSS-2), and `Seizer` (SSS-2). The Master Authority manages these delegates.
- **Minter Quotas**: Minters are assigned a specific quota limit, preventing unauthorized infinite token minting and minimizing risk.
- **Pausability**: The entire token ecosystem can be paused by a `Pauser`, halting all mints, burns, and (in SSS-2 via Transfer Hooks) token transfers.
- **Compliance (SSS-2)**:
  - _Blacklist_: Specific addresses can be blacklisted by a `Blacklister`, completely restricting them from transferring or receiving tokens.
  - _Seize_: A `Seizer` can forcefully confiscate tokens from any account using the Token-2022 `PermanentDelegate` extension to comply with local regulations.

## Architecture & Detailed User Action Flows

The SSS program acts as the central brain between the Admin (the original deployer), delegated roles (Minters, compliance officers), regular users, and the underlying Token-2022 Mint.

Below are the detailed flows explaining how the architecture enforces rules for each action.

### 1. Setup & Admin Flow (Initialization)

1. **Admin Initializes**: The Admin calls `initialize` (SSS-1) or `initialize_sss2` (SSS-2). The program creates an on-chain `StablecoinConfig` PDA that records the Admin as the master authority.
2. **Authority Transfer**: The Token-2022 Mint is explicitly configured so that its ultimate `mint_authority` is the `StablecoinConfig` PDA, rather than an individual wallet. The Admin themselves cannot mint tokens directly.
3. **Role Assignments**: Because the Admin holds the master authority in the `StablecoinConfig`, they have the exclusive right to call `update_minter` and `update_roles` to distribute privileges (like Minter, Pauser, Blacklister) to secondary wallets.

### 2. Minter Flow (Issuing Tokens)

1. **Quota Verification**: A user or treasury wallet designated as a `Minter` invokes the `mint` instruction, specifying the appropriate amount.
2. **Program Check**: The on-chain SSS program verifies that this wallet possesses an active `Minter` Role PDA and checks its associated `MinterQuota` PDA. It ensures the requested mint amount plus the historically minted amount does not exceed the allowed quota limit.
3. **Execution**: If authorized by the check, the program PDA signs internally for the Token-2022 Mint to issue the tokens to the destination user.

### 3. Delegated Pausing (Security Flow)

1. **Admin Assigns Pauser Role**: The Admin explicitly grants the `Pauser` privilege to a dedicated security multi-sig or automated security bot.
2. **Emergency Pause**: If a critical vulnerability or irregular activity is detected, the `Pauser` calls the `pause` instruction.
3. **Operations Halted**: The program sets a global pausable flag in the `StablecoinConfig` PDA. All subsequent state-changing operations (mint, burn) are immediately blocked. If using SSS-2, the Transfer Hook also evaluates this flag and rejects all peer-to-peer token transfers entirely across the board.

### 4. Compliance Enforcement (SSS-2 Flow)

1. **Assigning Compliance Officers**: The Admin grants the `Blacklister` and `Seizer` privileges to appropriate wallets (e.g., an automated screening oracle or legal officers).
2. **Blacklisting (Freezing Transfers)**: The `Blacklister` encounters illicit activity and calls `add_to_blacklist` for a malicious user's wallet address. This creates an on-chain `BlacklistEntry` PDA. When the blacklisted user subsequently attempts to transfer their balance, the SSS Transfer Hook program reads the blacklist entry and forcibly rejects the transaction.
3. **Seizing (Confiscation)**: A wallet with the `Seizer` role calls `seize` to confiscate illicit funds. The program uses the global Token-2022 `PermanentDelegate` feature to forcefully recover the tokens from the user's account without requiring their signature, seamlessly burning or rerouting them.

### 5. Transfer Flow

1. **Regular User**: An ordinary token holder initiates a `transfer_checked` instruction through the basic SPL Token-2022 program.
2. **Transfer Hook Verification** (SSS-2 only): Before the transaction concludes, Token-2022 queries the SSS Transfer Hook. The hook verifies that the token standard generally isn't paused and ensures neither the sender nor receiver is found upon the blacklist. Assuming neither is, the transfer securely succeeds.
