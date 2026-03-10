# SSS API

Express backend for Solana Stablecoin Standard role management.

## Setup

```bash
cp .env.example .env
# Edit .env — set AUTHORITY_KEYPAIR

npm install
npm run dev
```

## Getting your authority keypair

```bash
# Generate a new keypair
solana-keygen new --outfile authority.json

# Airdrop SOL (localnet)
solana airdrop 10 $(solana-keygen pubkey authority.json) --url localhost

# Copy the bytes array into AUTHORITY_KEYPAIR in .env
cat authority.json
```

## Endpoints

### Health
```
GET /health
```

---

### Minters

**Check minter status**
```bash
curl "http://localhost:3001/minters/<MINT>/check?address=<WALLET>"
```

**Grant minter role**
```bash
curl -X POST http://localhost:3001/minters/<MINT>/grant \
  -H "Content-Type: application/json" \
  -d '{ "address": "<WALLET>", "quotaLimit": "1000000000" }'
```

**Revoke minter role**
```bash
curl -X POST http://localhost:3001/minters/<MINT>/revoke \
  -H "Content-Type: application/json" \
  -d '{ "address": "<WALLET>" }'
```

---

### Blacklist (SSS-2)

**Check if blacklisted**
```bash
curl "http://localhost:3001/blacklist/<MINT>/check?address=<WALLET>"
```

**Add to blacklist**
```bash
curl -X POST http://localhost:3001/blacklist/<MINT>/add \
  -H "Content-Type: application/json" \
  -d '{ "address": "<WALLET>" }'
```

**Remove from blacklist**
```bash
curl -X POST http://localhost:3001/blacklist/<MINT>/remove \
  -H "Content-Type: application/json" \
  -d '{ "address": "<WALLET>" }'
```

---

### Roles (generic)

Valid roles: `minter`, `blacklister`, `pauser`, `seizer`

**Check role**
```bash
curl "http://localhost:3001/roles/<MINT>/check?address=<WALLET>&role=pauser"
```

**Grant role**
```bash
curl -X POST http://localhost:3001/roles/<MINT>/grant \
  -H "Content-Type: application/json" \
  -d '{ "address": "<WALLET>", "role": "pauser" }'
```

**Revoke role**
```bash
curl -X POST http://localhost:3001/roles/<MINT>/revoke \
  -H "Content-Type: application/json" \
  -d '{ "address": "<WALLET>", "role": "pauser" }'
```

---

## Response format

All responses follow:
```json
{ "success": true, ...data }
{ "success": false, "error": "message" }
```