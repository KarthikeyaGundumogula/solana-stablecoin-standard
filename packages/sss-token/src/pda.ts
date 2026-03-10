import {
  getProgramDerivedAddress,
  getAddressEncoder,
  type Address,
} from "gill";
import { STC_PROGRAM_PROGRAM_ADDRESS } from "./generated";

export async function getStablecoinConfigPda(
  mint: Address,
  programId: Address = STC_PROGRAM_PROGRAM_ADDRESS,
): Promise<Address> {
  const [pda] = await getProgramDerivedAddress({
    programAddress: programId,
    seeds: ["stablecoin_config", getAddressEncoder().encode(mint)],
  });
  return pda;
}

export async function getRolePda(
  mint: Address,
  assignee: Address,
  roleType: number,
  programId: Address = STC_PROGRAM_PROGRAM_ADDRESS,
): Promise<Address> {
  const [pda] = await getProgramDerivedAddress({
    programAddress: programId,
    seeds: [
      "role",
      getAddressEncoder().encode(mint),
      getAddressEncoder().encode(assignee),
      new Uint8Array([roleType]),
    ],
  });
  return pda;
}

export async function getMinterQuotaPda(
  mint: Address,
  minter: Address,
  programId: Address = STC_PROGRAM_PROGRAM_ADDRESS,
): Promise<Address> {
  const [pda] = await getProgramDerivedAddress({
    programAddress: programId,
    seeds: [
      "minter_quota",
      getAddressEncoder().encode(mint),
      getAddressEncoder().encode(minter),
    ],
  });
  return pda;
}

export async function getBlacklistPda(
  mint: Address,
  account: Address,
  programId: Address = "3nqtxhZZdpV5W2TPaa1hbWbeM3bhhsMg3Fy9oLdAHKfH" as Address,
): Promise<Address> {
  const [pda] = await getProgramDerivedAddress({
    programAddress: programId,
    seeds: [
      "blacklist",
      getAddressEncoder().encode(mint),
      getAddressEncoder().encode(account),
    ],
  });
  return pda;
}

export async function getAssociatedTokenAddress(
  mint: Address,
  owner: Address,
  tokenProgramId: Address = "TokenzQdBNbLqP5VEhfq514e8yxeK31Tz2M7n1zUjRQ" as Address,
  associatedTokenProgramId: Address = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL" as Address,
): Promise<Address> {
  const [address] = await getProgramDerivedAddress({
    programAddress: associatedTokenProgramId,
    seeds: [
      getAddressEncoder().encode(owner),
      getAddressEncoder().encode(tokenProgramId),
      getAddressEncoder().encode(mint),
    ],
  });
  return address;
}

export function getCreateAssociatedTokenAccountInstruction(
  payer: Address,
  associatedToken: Address,
  owner: Address,
  mint: Address,
  tokenProgram: Address = "TokenzQdBNbLqP5VEhfq514e8yxeK31Tz2M7n1zUjRQ" as Address,
  systemProgram: Address = "11111111111111111111111111111111" as Address,
  associatedTokenProgram: Address = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL" as Address,
) {
  return {
    programAddress: associatedTokenProgram,
    accounts: [
      { address: payer, role: 3 }, // WRITABLE_SIGNER
      { address: associatedToken, role: 1 }, // WRITABLE
      { address: owner, role: 0 }, // READONLY
      { address: mint, role: 0 }, // READONLY
      { address: systemProgram, role: 0 }, // READONLY
      { address: tokenProgram, role: 0 }, // READONLY
    ],
    data: new Uint8Array([]),
  } as any;
}
