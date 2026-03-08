# SSS-2: Compliant Stablecoin Standard

The SSS-2 standard answers the requirements of top-tier regulated stablecoins (like USDC or USDT) aiming for institutional adoption. Regulators expect on-chain proactive enforcement.

## Rationale

If an account is flagged by OFAC, the issuer must prevent that account from sending or receiving tokens _immediately_, and may be legally compelled to seize the assets. SSS-2 enforces this.

## Token-2022 Extensions Used

- **MetadataPointer**: On-chain metadata inside the Mint.
- **TransferHook**: Points to a dedicated compliance program.
- **PermanentDelegate**: Points to the `StablecoinConfig` PDA.
- **DefaultAccountState**: (Optional) Enforces that all new accounts start as `Frozen` until KYC is completed, at which point they are `Thawed`.

## Compliance Features

1. **Blacklist Enforcement**: Every transfer invokes the transfer hook. The hook validates both the `source` owner and `destination` owner against active Blacklist PDAs.
2. **Seizure**: The `StablecoinConfig` PDA, acting as the permanent delegate, allows a designated Seizer role to sweep tokens from a frozen or blacklisted account into a treasury.
3. **Role Separation**: Introduces `Blacklister` and `Seizer` roles distinct from the master authority.
