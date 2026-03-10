# SSS API

Express backend for Solana Stablecoin Standard — handles role management, compliance, and operations using the authority keypair server-side.

## Setup

```bash
cd sss-api
npm install
cp .env.example .env   # fill in AUTHORITY_KEYPAIR
npm run dev
```

## Getting your authority keypair

```bash
# Generate keypair
solana-keygen new --outfile authority.json --no-bip39-passphrase

# Print address
solana-keygen pubkey authority.json

# Airdrop SOL on localnet
solana airdrop 10 $(solana-keygen pubkey authority.json) --url localhost

# Copy the byte array into .env as AUTHORITY_KEYPAIR
cat authority.json
```

## Health check

```bash
curl http://localhost:3001/health
```

---

## Routes

### `/mint` — Mint config & authority

**Get on-chain config**
```bash
curl http://localhost:3001/mint/<MINT>/config
```

**Transfer authority to a new wallet**
```bash
curl -X POST http://localhost:3001/mint/<MINT>/transfer-authority \
  -H "Content-Type: application/json" \
  -d '{ "newAuthority": "<NEW_WALLET>" }'
```

---

### `/roles` — Role management

Valid roles: `minter` `blacklister` `pauser` `seizer`

**Check if address has a role**
```bash
curl "http://localhost:3001/roles/<MINT>/check?address=<WALLET>&role=minter"
```

**Grant a role**
```bash
curl -X POST http://localhost:3001/roles/<MINT>/grant \
  -H "Content-Type: application/json" \
  -d '{ "address": "<WALLET>", "role": "minter", "quotaLimit": "1000000000" }'
```
> `quotaLimit` is only used when `role` is `minter`. Omit for other roles.

**Revoke a role**
```bash
curl -X POST http://localhost:3001/roles/<MINT>/revoke \
  -H "Content-Type: application/json" \
  -d '{ "address": "<WALLET>", "role": "minter" }'
```

---

### `/compliance` — Blacklist & seize (SSS-2 only)

**Check if address is blacklisted**
```bash
curl "http://localhost:3001/compliance/<MINT>/check?address=<WALLET>"
```

**Blacklist an address**
```bash
curl -X POST http://localhost:3001/compliance/<MINT>/blacklist \
  -H "Content-Type: application/json" \
  -d '{ "address": "<WALLET>" }'
```

**Remove from blacklist**
```bash
curl -X POST http://localhost:3001/compliance/<MINT>/unblacklist \
  -H "Content-Type: application/json" \
  -d '{ "address": "<WALLET>" }'
```

**Seize tokens**
```bash
curl -X POST http://localhost:3001/compliance/<MINT>/seize \
  -H "Content-Type: application/json" \
  -d '{ "source": "<SOURCE_ATA>", "destination": "<DEST_ATA>", "amount": "1000000" }'
```

---

### `/operations` — Pause, freeze, thaw

**Pause the mint** (blocks all mints, burns, and SSS-2 transfers)
```bash
curl -X POST http://localhost:3001/operations/<MINT>/pause
```

**Unpause the mint**
```bash
curl -X POST http://localhost:3001/operations/<MINT>/unpause
```

**Freeze a token account**
```bash
curl -X POST http://localhost:3001/operations/<MINT>/freeze \
  -H "Content-Type: application/json" \
  -d '{ "tokenAccount": "<ATA>" }'
```

**Thaw a token account**
```bash
curl -X POST http://localhost:3001/operations/<MINT>/thaw \
  -H "Content-Type: application/json" \
  -d '{ "tokenAccount": "<ATA>" }'
```

---

## Response format

Every endpoint returns:

```json
{ "success": true, "signature": "...", ... }
{ "success": false, "error": "message" }
```

## Typical workflow

```bash
# 1. Deploy a mint via the web app (sss-demo), copy the mint address

# 2. Grant minter role to a wallet
curl -X POST http://localhost:3001/roles/<MINT>/grant \
  -H "Content-Type: application/json" \
  -d '{ "address": "<MINTER_WALLET>", "role": "minter", "quotaLimit": "1000000000" }'

# 3. Grant pauser role to a security wallet
curl -X POST http://localhost:3001/roles/<MINT>/grant \
  -H "Content-Type: application/json" \
  -d '{ "address": "<PAUSER_WALLET>", "role": "pauser" }'

# 4. (SSS-2) Grant blacklister role
curl -X POST http://localhost:3001/roles/<MINT>/grant \
  -H "Content-Type: application/json" \
  -d '{ "address": "<BLACKLISTER_WALLET>", "role": "blacklister" }'
```