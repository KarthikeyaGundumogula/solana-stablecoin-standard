# Compliance and Regulatory Guide

Operating an SSS-2 stablecoin requires integrating with real-world compliance tooling.

## On-Chain Sanctions Enforcement (Transfer Hook)

The transfer hook program checks the presence of a PDA derived from the mint and the user address:
`[ "blacklist", mint_pubkey, address_pubkey ]`

If this PDA exists, the transfer is blocked.

## Audit Trails

Regulators often ask for a verifiable log of actions. The SSS programs emit standard Anchor events (`FreezeEvent`, `BlacklistEvent`, `SeizeEvent`, etc.). You must index these immediately.

### Format

```json
{
  "timestamp": "2026-03-08T12:00:00Z",
  "action": "BLACKLIST_ADD",
  "issuer_address": "...",
  "target_address": "...",
  "reason": "OFAC match",
  "transaction_signature": "5xy..."
}
```

## Data Privacy

Addresses are public. Real-world identity must map to these addresses off-chain in your Secure Enclave or KYC provider. Do not put PII into on-chain metadata or memo instruction data.
