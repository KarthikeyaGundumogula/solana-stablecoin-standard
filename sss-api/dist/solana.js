import { createSolanaClient, createKeyPairSignerFromBytes, } from "gill";
const NETWORK_MAP = {
    localnet: "http://localhost:8899",
    devnet: "https://api.devnet.solana.com",
    "mainnet-beta": "https://api.mainnet-beta.solana.com",
};
function getRpcUrl() {
    if (process.env.RPC_URL)
        return process.env.RPC_URL;
    const network = process.env.SOLANA_NETWORK ?? "localnet";
    const url = NETWORK_MAP[network];
    if (!url)
        throw new Error(`Unknown SOLANA_NETWORK: ${network}`);
    return url;
}
// Lazy singletons
let _client = null;
let _authority = null;
export function getSolanaClient() {
    if (!_client) {
        const url = getRpcUrl();
        const { rpc, sendAndConfirmTransaction } = createSolanaClient({
            urlOrMoniker: url,
        });
        _client = { rpc, sendAndConfirmTransaction };
    }
    return _client;
}
export async function getAuthoritySigner() {
    if (!_authority) {
        const raw = process.env.AUTHORITY_KEYPAIR;
        if (!raw)
            throw new Error("AUTHORITY_KEYPAIR not set in environment");
        const bytes = new Uint8Array(JSON.parse(raw));
        _authority = await createKeyPairSignerFromBytes(bytes);
    }
    return _authority;
}
export function getNetwork() {
    return process.env.SOLANA_NETWORK ?? "localnet";
}
