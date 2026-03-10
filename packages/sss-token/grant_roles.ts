import { createSolanaClient, type Address } from "gill";
import { SolanaStablecoin, RoleType } from "./src/stablecoin";
import { Keypair } from "@solana/web3.js";
import * as fs from "fs";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const { rpc, sendAndConfirmTransaction } = createSolanaClient({ urlOrMoniker: "localnet" });
  const secret = new Uint8Array(JSON.parse(fs.readFileSync(process.env.ADMIN_KEYPAIR!, "utf8")));
  const adminKeypair = Keypair.fromSecretKey(secret);
  const adminSigner = {
    address: adminKeypair.publicKey.toBase58() as Address,
    signTransaction: async (tx: any) => {
      tx.sign([adminKeypair]);
      return tx;
    }
  };

  const mint = "CatA5aPHZF9t4yqxQbRyoRZ6bEiLo4gu2hgvjTPZ4mYu" as Address;
  const stablecoin = new SolanaStablecoin(
    { rpc: rpc as any, sendAndConfirmTransaction },
    mint,
    "FtPdSNiQ8ieM4yE1V8FekUk7WDbgZrx9ehb3CyaXzHtG" as Address
  );
  
  // Assign Blacklister
  let tx = await stablecoin.updateRoles(adminSigner as any, adminSigner as any, adminSigner.address, 2, true);
  let sig = await sendAndConfirmTransaction(tx as any, { commitment: "confirmed" });
  console.log("Granted Blacklister:", sig);
  
  // Assign Seizer
  tx = await stablecoin.updateRoles(adminSigner as any, adminSigner as any, adminSigner.address, 4, true);
  sig = await sendAndConfirmTransaction(tx as any, { commitment: "confirmed" });
  console.log("Granted Seizer:", sig);

  // Assign Pauser
  tx = await stablecoin.updateRoles(adminSigner as any, adminSigner as any, adminSigner.address, 1, true);
  sig = await sendAndConfirmTransaction(tx as any, { commitment: "confirmed" });
  console.log("Granted Pauser:", sig);

}
main();
