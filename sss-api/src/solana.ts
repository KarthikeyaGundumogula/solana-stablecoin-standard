import {
  createSolanaClient,
  createKeyPairSignerFromBytes,
  type TransactionSigner,
  type Rpc,
  type SolanaRpcApi,
  type SendAndConfirmTransactionWithSignersFunction,
} from "gill";

const NETWORK_MAP: Record<string, string> = {
  localnet: "http://localhost:8899",
  devnet: "https://api.devnet.solana.com",
  "mainnet-beta": "https://api.mainnet-beta.solana.com",
};

function getRpcUrl(): string {
  if (process.env.RPC_URL) return process.env.RPC_URL;
  const network = process.env.SOLANA_NETWORK ?? "localnet";
  const url = NETWORK_MAP[network];
  if (!url) throw new Error(`Unknown SOLANA_NETWORK: ${network}`);
  return url;
}

// Lazy singletons
let _client: {
  rpc: any;
  sendAndConfirmTransaction: any;
} | null = null;

let _authority: TransactionSigner | null = null;

export function getSolanaClient(): {
  rpc: any;
  sendAndConfirmTransaction: any;
} {
  if (!_client) {
    const url = getRpcUrl();
    const { rpc, sendAndConfirmTransaction } = createSolanaClient({
      urlOrMoniker: url as any,
    });
    _client = { rpc, sendAndConfirmTransaction };
  }
  return _client;
}

export async function getAuthoritySigner(): Promise<TransactionSigner> {
  if (!_authority) {
    const raw = process.env.AUTHORITY_KEYPAIR;
    if (!raw) throw new Error("AUTHORITY_KEYPAIR not set in environment");
    const bytes = new Uint8Array(JSON.parse(raw));
    _authority = await createKeyPairSignerFromBytes(bytes);
  }
  return _authority;
}

export function getNetwork(): string {
  return process.env.SOLANA_NETWORK ?? "localnet";
}
