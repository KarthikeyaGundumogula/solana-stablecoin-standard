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
