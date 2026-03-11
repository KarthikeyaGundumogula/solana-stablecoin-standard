import {
  createSolanaClient,
  createKeyPairSignerFromBytes,
  type TransactionSigner,
  type Rpc,
  type SolanaRpcApi,
  type SendAndConfirmTransactionWithSignersFunction,
  type Address,
} from "gill";
import * as fs from "fs";
import * as os from "os";

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
    let keypairPath = process.env.AUTHORITY_KEYPAIR || `${os.homedir()}/.config/solana/id.json`;
    if (keypairPath.startsWith("~")) {
      keypairPath = keypairPath.replace("~", os.homedir());
    }
    if (!fs.existsSync(keypairPath)) {
      throw new Error(`AUTHORITY_KEYPAIR file not found at ${keypairPath}`);
    }
    const raw = fs.readFileSync(keypairPath, "utf-8");
    const bytes = new Uint8Array(JSON.parse(raw));
    _authority = await createKeyPairSignerFromBytes(bytes);
  }
  return _authority;
}

export function getNetwork(): string {
  return process.env.SOLANA_NETWORK ?? "localnet";
}

export function getTransferHookId(): Address {
  return (process.env.TRANSFER_HOOK_PROGRAM_ID ||
    "FtPdSNiQ8ieM4yE1V8FekUk7WDbgZrx9ehb3CyaXzHtG") as Address;
}
