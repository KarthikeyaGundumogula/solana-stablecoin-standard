# Switchboard Oracle Integration

For stablecoins that are pegged to assets other than USD (e.g., EUR, BRL, or CPI-adjusted indexes), SSS integrates cleanly with the Switchboard Oracle Network.

## Architecture

Tokens themselves remain pure SSS-1 or SSS-2 standard on the Token-2022 layer.
The Oracle integration acts primarily as a pricing feed for your _Minting and Redemption Service_, rather than residing directly inside the token's transfer hook (which would cause massive compute overhead).

## Implementation Steps

1. **Create a Switchboard Feed**: Spin up a V2 or V3 feed targeting your fiat pair (e.g. `EUR/USD`).
2. **Backend Sync**: Your mint service polls the Switchboard aggregator PLA PDA.
3. **Minting Logic**:

   ```typescript
   import { AggregatorAccount } from "@switchboard-xyz/solana.js";

   const baseAmount = req.body.fiatAmount;
   const aggregator = new AggregatorAccount(program, "YourAggregatorPubkey");
   const result = await aggregator.loadData();
   const rate = result.latestConfirmedRound.result.toNumber();

   const tokensToMint = baseAmount * rate;
   await stablecoin.mintTo(minter, recipient, tokensToMint);
   ```

Because the token is purely a standard token, you get 100% DeFi composability, while offloading the pricing complexity to your issuance interface.
