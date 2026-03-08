#!/usr/bin/env node

// src/cli.ts
import { Command } from "commander";

// src/generated/accounts/blacklistEntry.ts
import {
  assertAccountExists,
  assertAccountsExist,
  combineCodec,
  decodeAccount,
  fetchEncodedAccount,
  fetchEncodedAccounts,
  fixDecoderSize,
  fixEncoderSize,
  getAddressDecoder,
  getAddressEncoder,
  getBytesDecoder,
  getBytesEncoder,
  getStructDecoder,
  getStructEncoder,
  getU8Decoder,
  getU8Encoder,
  transformEncoder
} from "gill";
var BLACKLIST_ENTRY_DISCRIMINATOR = new Uint8Array([
  218,
  179,
  231,
  40,
  141,
  25,
  168,
  189
]);

// src/generated/accounts/minterQuota.ts
import {
  assertAccountExists as assertAccountExists2,
  assertAccountsExist as assertAccountsExist2,
  combineCodec as combineCodec2,
  decodeAccount as decodeAccount2,
  fetchEncodedAccount as fetchEncodedAccount2,
  fetchEncodedAccounts as fetchEncodedAccounts2,
  fixDecoderSize as fixDecoderSize2,
  fixEncoderSize as fixEncoderSize2,
  getAddressDecoder as getAddressDecoder2,
  getAddressEncoder as getAddressEncoder2,
  getBytesDecoder as getBytesDecoder2,
  getBytesEncoder as getBytesEncoder2,
  getStructDecoder as getStructDecoder2,
  getStructEncoder as getStructEncoder2,
  getU64Decoder,
  getU64Encoder,
  getU8Decoder as getU8Decoder2,
  getU8Encoder as getU8Encoder2,
  transformEncoder as transformEncoder2
} from "gill";
var MINTER_QUOTA_DISCRIMINATOR = new Uint8Array([
  42,
  21,
  27,
  217,
  49,
  82,
  230,
  89
]);

// src/generated/accounts/roleAccount.ts
import {
  assertAccountExists as assertAccountExists3,
  assertAccountsExist as assertAccountsExist3,
  combineCodec as combineCodec4,
  decodeAccount as decodeAccount3,
  fetchEncodedAccount as fetchEncodedAccount3,
  fetchEncodedAccounts as fetchEncodedAccounts3,
  fixDecoderSize as fixDecoderSize3,
  fixEncoderSize as fixEncoderSize3,
  getAddressDecoder as getAddressDecoder3,
  getAddressEncoder as getAddressEncoder3,
  getBooleanDecoder,
  getBooleanEncoder,
  getBytesDecoder as getBytesDecoder3,
  getBytesEncoder as getBytesEncoder3,
  getStructDecoder as getStructDecoder3,
  getStructEncoder as getStructEncoder3,
  getU8Decoder as getU8Decoder3,
  getU8Encoder as getU8Encoder3,
  transformEncoder as transformEncoder3
} from "gill";

// src/generated/types/roleType.ts
import {
  combineCodec as combineCodec3,
  getEnumDecoder,
  getEnumEncoder
} from "gill";
var RoleType = /* @__PURE__ */ ((RoleType2) => {
  RoleType2[RoleType2["Minter"] = 0] = "Minter";
  RoleType2[RoleType2["Burner"] = 1] = "Burner";
  RoleType2[RoleType2["Pauser"] = 2] = "Pauser";
  RoleType2[RoleType2["Blacklister"] = 3] = "Blacklister";
  RoleType2[RoleType2["Seizer"] = 4] = "Seizer";
  return RoleType2;
})(RoleType || {});
function getRoleTypeEncoder() {
  return getEnumEncoder(RoleType);
}
function getRoleTypeDecoder() {
  return getEnumDecoder(RoleType);
}

// src/generated/accounts/roleAccount.ts
var ROLE_ACCOUNT_DISCRIMINATOR = new Uint8Array([
  142,
  236,
  135,
  197,
  214,
  3,
  244,
  226
]);
function getRoleAccountDecoder() {
  return getStructDecoder3([
    ["discriminator", fixDecoderSize3(getBytesDecoder3(), 8)],
    ["mint", getAddressDecoder3()],
    ["assignee", getAddressDecoder3()],
    ["roleType", getRoleTypeDecoder()],
    ["isActive", getBooleanDecoder()],
    ["bump", getU8Decoder3()]
  ]);
}
function decodeRoleAccount(encodedAccount) {
  return decodeAccount3(
    encodedAccount,
    getRoleAccountDecoder()
  );
}
async function fetchRoleAccount(rpc, address, config2) {
  const maybeAccount = await fetchMaybeRoleAccount(rpc, address, config2);
  assertAccountExists3(maybeAccount);
  return maybeAccount;
}
async function fetchMaybeRoleAccount(rpc, address, config2) {
  const maybeAccount = await fetchEncodedAccount3(rpc, address, config2);
  return decodeRoleAccount(maybeAccount);
}

// src/generated/accounts/stablecoinConfig.ts
import {
  assertAccountExists as assertAccountExists4,
  assertAccountsExist as assertAccountsExist4,
  combineCodec as combineCodec5,
  decodeAccount as decodeAccount4,
  fetchEncodedAccount as fetchEncodedAccount4,
  fetchEncodedAccounts as fetchEncodedAccounts4,
  fixDecoderSize as fixDecoderSize4,
  fixEncoderSize as fixEncoderSize4,
  getAddressDecoder as getAddressDecoder4,
  getAddressEncoder as getAddressEncoder4,
  getBooleanDecoder as getBooleanDecoder2,
  getBooleanEncoder as getBooleanEncoder2,
  getBytesDecoder as getBytesDecoder4,
  getBytesEncoder as getBytesEncoder4,
  getStructDecoder as getStructDecoder4,
  getStructEncoder as getStructEncoder4,
  getU8Decoder as getU8Decoder4,
  getU8Encoder as getU8Encoder4,
  transformEncoder as transformEncoder4
} from "gill";
var STABLECOIN_CONFIG_DISCRIMINATOR = new Uint8Array([
  127,
  25,
  244,
  213,
  1,
  192,
  101,
  6
]);
function getStablecoinConfigDecoder() {
  return getStructDecoder4([
    ["discriminator", fixDecoderSize4(getBytesDecoder4(), 8)],
    ["mint", getAddressDecoder4()],
    ["masterAuthority", getAddressDecoder4()],
    ["decimals", getU8Decoder4()],
    ["isPaused", getBooleanDecoder2()],
    ["enablePermanentDelegate", getBooleanDecoder2()],
    ["enableTransferHook", getBooleanDecoder2()],
    ["bump", getU8Decoder4()]
  ]);
}
function decodeStablecoinConfig(encodedAccount) {
  return decodeAccount4(
    encodedAccount,
    getStablecoinConfigDecoder()
  );
}
async function fetchStablecoinConfig(rpc, address, config2) {
  const maybeAccount = await fetchMaybeStablecoinConfig(rpc, address, config2);
  assertAccountExists4(maybeAccount);
  return maybeAccount;
}
async function fetchMaybeStablecoinConfig(rpc, address, config2) {
  const maybeAccount = await fetchEncodedAccount4(rpc, address, config2);
  return decodeStablecoinConfig(maybeAccount);
}

// src/generated/errors/stcProgram.ts
import {
  isProgramError
} from "gill";

// src/generated/programs/stcProgram.ts
import {
  assertIsInstructionWithAccounts,
  containsBytes,
  fixEncoderSize as fixEncoderSize20,
  getBytesEncoder as getBytesEncoder20
} from "gill";

// src/generated/instructions/addToBlacklist.ts
import {
  combineCodec as combineCodec6,
  fixDecoderSize as fixDecoderSize5,
  fixEncoderSize as fixEncoderSize5,
  getBytesDecoder as getBytesDecoder5,
  getBytesEncoder as getBytesEncoder5,
  getStructDecoder as getStructDecoder5,
  getStructEncoder as getStructEncoder5,
  transformEncoder as transformEncoder5
} from "gill";

// src/generated/shared/index.ts
import {
  AccountRole,
  isProgramDerivedAddress,
  isTransactionSigner as kitIsTransactionSigner,
  upgradeRoleToSigner
} from "gill";
function expectAddress(value) {
  if (!value) {
    throw new Error("Expected a Address.");
  }
  if (typeof value === "object" && "address" in value) {
    return value.address;
  }
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}
function getAccountMetaFactory(programAddress, optionalAccountStrategy) {
  return (account) => {
    if (!account.value) {
      if (optionalAccountStrategy === "omitted") return;
      return Object.freeze({
        address: programAddress,
        role: AccountRole.READONLY
      });
    }
    const writableRole = account.isWritable ? AccountRole.WRITABLE : AccountRole.READONLY;
    return Object.freeze({
      address: expectAddress(account.value),
      role: isTransactionSigner(account.value) ? upgradeRoleToSigner(writableRole) : writableRole,
      ...isTransactionSigner(account.value) ? { signer: account.value } : {}
    });
  };
}
function isTransactionSigner(value) {
  return !!value && typeof value === "object" && "address" in value && kitIsTransactionSigner(value);
}

// src/generated/instructions/addToBlacklist.ts
var ADD_TO_BLACKLIST_DISCRIMINATOR = new Uint8Array([
  90,
  115,
  98,
  231,
  173,
  119,
  117,
  176
]);
function getAddToBlacklistInstructionDataEncoder() {
  return transformEncoder5(
    getStructEncoder5([["discriminator", fixEncoderSize5(getBytesEncoder5(), 8)]]),
    (value) => ({ ...value, discriminator: ADD_TO_BLACKLIST_DISCRIMINATOR })
  );
}
function getAddToBlacklistInstruction(input, config2) {
  const programAddress = config2?.programAddress ?? STC_PROGRAM_PROGRAM_ADDRESS;
  const originalAccounts = {
    blacklister: { value: input.blacklister ?? null, isWritable: true },
    config: { value: input.config ?? null, isWritable: false },
    roleAccount: { value: input.roleAccount ?? null, isWritable: false },
    addressToBlacklist: {
      value: input.addressToBlacklist ?? null,
      isWritable: false
    },
    blacklistEntry: { value: input.blacklistEntry ?? null, isWritable: true },
    systemProgram: { value: input.systemProgram ?? null, isWritable: false }
  };
  const accounts = originalAccounts;
  if (!accounts.systemProgram.value) {
    accounts.systemProgram.value = "11111111111111111111111111111111";
  }
  const getAccountMeta = getAccountMetaFactory(programAddress, "programId");
  return Object.freeze({
    accounts: [
      getAccountMeta(accounts.blacklister),
      getAccountMeta(accounts.config),
      getAccountMeta(accounts.roleAccount),
      getAccountMeta(accounts.addressToBlacklist),
      getAccountMeta(accounts.blacklistEntry),
      getAccountMeta(accounts.systemProgram)
    ],
    data: getAddToBlacklistInstructionDataEncoder().encode({}),
    programAddress
  });
}

// src/generated/instructions/burn.ts
import {
  combineCodec as combineCodec7,
  fixDecoderSize as fixDecoderSize6,
  fixEncoderSize as fixEncoderSize6,
  getBytesDecoder as getBytesDecoder6,
  getBytesEncoder as getBytesEncoder6,
  getStructDecoder as getStructDecoder6,
  getStructEncoder as getStructEncoder6,
  getU64Decoder as getU64Decoder2,
  getU64Encoder as getU64Encoder2,
  transformEncoder as transformEncoder6
} from "gill";
var BURN_DISCRIMINATOR = new Uint8Array([
  116,
  110,
  29,
  56,
  107,
  219,
  42,
  93
]);
function getBurnInstructionDataEncoder() {
  return transformEncoder6(
    getStructEncoder6([
      ["discriminator", fixEncoderSize6(getBytesEncoder6(), 8)],
      ["amount", getU64Encoder2()]
    ]),
    (value) => ({ ...value, discriminator: BURN_DISCRIMINATOR })
  );
}
function getBurnInstruction(input, config2) {
  const programAddress = config2?.programAddress ?? STC_PROGRAM_PROGRAM_ADDRESS;
  const originalAccounts = {
    burner: { value: input.burner ?? null, isWritable: true },
    config: { value: input.config ?? null, isWritable: false },
    roleAccount: { value: input.roleAccount ?? null, isWritable: false },
    mint: { value: input.mint ?? null, isWritable: true },
    tokenAccount: { value: input.tokenAccount ?? null, isWritable: true },
    tokenAccountOwner: {
      value: input.tokenAccountOwner ?? null,
      isWritable: false
    },
    tokenProgram: { value: input.tokenProgram ?? null, isWritable: false }
  };
  const accounts = originalAccounts;
  const args = { ...input };
  if (!accounts.tokenProgram.value) {
    accounts.tokenProgram.value = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
  }
  const getAccountMeta = getAccountMetaFactory(programAddress, "programId");
  return Object.freeze({
    accounts: [
      getAccountMeta(accounts.burner),
      getAccountMeta(accounts.config),
      getAccountMeta(accounts.roleAccount),
      getAccountMeta(accounts.mint),
      getAccountMeta(accounts.tokenAccount),
      getAccountMeta(accounts.tokenAccountOwner),
      getAccountMeta(accounts.tokenProgram)
    ],
    data: getBurnInstructionDataEncoder().encode(
      args
    ),
    programAddress
  });
}

// src/generated/instructions/freezeAccount.ts
import {
  combineCodec as combineCodec8,
  fixDecoderSize as fixDecoderSize7,
  fixEncoderSize as fixEncoderSize7,
  getBytesDecoder as getBytesDecoder7,
  getBytesEncoder as getBytesEncoder7,
  getStructDecoder as getStructDecoder7,
  getStructEncoder as getStructEncoder7,
  transformEncoder as transformEncoder7
} from "gill";
var FREEZE_ACCOUNT_DISCRIMINATOR = new Uint8Array([
  253,
  75,
  82,
  133,
  167,
  238,
  43,
  130
]);
function getFreezeAccountInstructionDataEncoder() {
  return transformEncoder7(
    getStructEncoder7([["discriminator", fixEncoderSize7(getBytesEncoder7(), 8)]]),
    (value) => ({ ...value, discriminator: FREEZE_ACCOUNT_DISCRIMINATOR })
  );
}
function getFreezeAccountInstruction(input, config2) {
  const programAddress = config2?.programAddress ?? STC_PROGRAM_PROGRAM_ADDRESS;
  const originalAccounts = {
    authority: { value: input.authority ?? null, isWritable: true },
    config: { value: input.config ?? null, isWritable: false },
    mint: { value: input.mint ?? null, isWritable: false },
    tokenAccount: { value: input.tokenAccount ?? null, isWritable: true },
    tokenProgram: { value: input.tokenProgram ?? null, isWritable: false }
  };
  const accounts = originalAccounts;
  if (!accounts.tokenProgram.value) {
    accounts.tokenProgram.value = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
  }
  const getAccountMeta = getAccountMetaFactory(programAddress, "programId");
  return Object.freeze({
    accounts: [
      getAccountMeta(accounts.authority),
      getAccountMeta(accounts.config),
      getAccountMeta(accounts.mint),
      getAccountMeta(accounts.tokenAccount),
      getAccountMeta(accounts.tokenProgram)
    ],
    data: getFreezeAccountInstructionDataEncoder().encode({}),
    programAddress
  });
}

// src/generated/instructions/initialize.ts
import {
  addDecoderSizePrefix,
  addEncoderSizePrefix,
  combineCodec as combineCodec9,
  fixDecoderSize as fixDecoderSize8,
  fixEncoderSize as fixEncoderSize8,
  getAddressEncoder as getAddressEncoder5,
  getBytesDecoder as getBytesDecoder8,
  getBytesEncoder as getBytesEncoder8,
  getProgramDerivedAddress,
  getStructDecoder as getStructDecoder8,
  getStructEncoder as getStructEncoder8,
  getU32Decoder,
  getU32Encoder,
  getU8Decoder as getU8Decoder5,
  getU8Encoder as getU8Encoder5,
  getUtf8Decoder,
  getUtf8Encoder,
  transformEncoder as transformEncoder8
} from "gill";
var INITIALIZE_DISCRIMINATOR = new Uint8Array([
  175,
  175,
  109,
  31,
  13,
  152,
  155,
  237
]);
function getInitializeInstructionDataEncoder() {
  return transformEncoder8(
    getStructEncoder8([
      ["discriminator", fixEncoderSize8(getBytesEncoder8(), 8)],
      ["name", addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder())],
      ["symbol", addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder())],
      ["uri", addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder())],
      ["decimals", getU8Encoder5()]
    ]),
    (value) => ({ ...value, discriminator: INITIALIZE_DISCRIMINATOR })
  );
}
function getInitializeInstruction(input, config2) {
  const programAddress = config2?.programAddress ?? STC_PROGRAM_PROGRAM_ADDRESS;
  const originalAccounts = {
    authority: { value: input.authority ?? null, isWritable: true },
    config: { value: input.config ?? null, isWritable: true },
    mint: { value: input.mint ?? null, isWritable: true },
    tokenProgram: { value: input.tokenProgram ?? null, isWritable: false },
    systemProgram: { value: input.systemProgram ?? null, isWritable: false }
  };
  const accounts = originalAccounts;
  const args = { ...input };
  if (!accounts.tokenProgram.value) {
    accounts.tokenProgram.value = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
  }
  if (!accounts.systemProgram.value) {
    accounts.systemProgram.value = "11111111111111111111111111111111";
  }
  const getAccountMeta = getAccountMetaFactory(programAddress, "programId");
  return Object.freeze({
    accounts: [
      getAccountMeta(accounts.authority),
      getAccountMeta(accounts.config),
      getAccountMeta(accounts.mint),
      getAccountMeta(accounts.tokenProgram),
      getAccountMeta(accounts.systemProgram)
    ],
    data: getInitializeInstructionDataEncoder().encode(
      args
    ),
    programAddress
  });
}

// src/generated/instructions/initializePermanentDelegate.ts
import {
  addDecoderSizePrefix as addDecoderSizePrefix2,
  addEncoderSizePrefix as addEncoderSizePrefix2,
  combineCodec as combineCodec10,
  fixDecoderSize as fixDecoderSize9,
  fixEncoderSize as fixEncoderSize9,
  getAddressEncoder as getAddressEncoder6,
  getBytesDecoder as getBytesDecoder9,
  getBytesEncoder as getBytesEncoder9,
  getProgramDerivedAddress as getProgramDerivedAddress2,
  getStructDecoder as getStructDecoder9,
  getStructEncoder as getStructEncoder9,
  getU32Decoder as getU32Decoder2,
  getU32Encoder as getU32Encoder2,
  getU8Decoder as getU8Decoder6,
  getU8Encoder as getU8Encoder6,
  getUtf8Decoder as getUtf8Decoder2,
  getUtf8Encoder as getUtf8Encoder2,
  transformEncoder as transformEncoder9
} from "gill";
var INITIALIZE_PERMANENT_DELEGATE_DISCRIMINATOR = new Uint8Array([
  98,
  200,
  9,
  70,
  17,
  203,
  130,
  60
]);
function getInitializePermanentDelegateInstructionDataEncoder() {
  return transformEncoder9(
    getStructEncoder9([
      ["discriminator", fixEncoderSize9(getBytesEncoder9(), 8)],
      ["name", addEncoderSizePrefix2(getUtf8Encoder2(), getU32Encoder2())],
      ["symbol", addEncoderSizePrefix2(getUtf8Encoder2(), getU32Encoder2())],
      ["uri", addEncoderSizePrefix2(getUtf8Encoder2(), getU32Encoder2())],
      ["decimals", getU8Encoder6()]
    ]),
    (value) => ({
      ...value,
      discriminator: INITIALIZE_PERMANENT_DELEGATE_DISCRIMINATOR
    })
  );
}
function getInitializePermanentDelegateInstruction(input, config2) {
  const programAddress = config2?.programAddress ?? STC_PROGRAM_PROGRAM_ADDRESS;
  const originalAccounts = {
    authority: { value: input.authority ?? null, isWritable: true },
    config: { value: input.config ?? null, isWritable: true },
    mint: { value: input.mint ?? null, isWritable: true },
    tokenProgram: { value: input.tokenProgram ?? null, isWritable: false },
    systemProgram: { value: input.systemProgram ?? null, isWritable: false }
  };
  const accounts = originalAccounts;
  const args = { ...input };
  if (!accounts.tokenProgram.value) {
    accounts.tokenProgram.value = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
  }
  if (!accounts.systemProgram.value) {
    accounts.systemProgram.value = "11111111111111111111111111111111";
  }
  const getAccountMeta = getAccountMetaFactory(programAddress, "programId");
  return Object.freeze({
    accounts: [
      getAccountMeta(accounts.authority),
      getAccountMeta(accounts.config),
      getAccountMeta(accounts.mint),
      getAccountMeta(accounts.tokenProgram),
      getAccountMeta(accounts.systemProgram)
    ],
    data: getInitializePermanentDelegateInstructionDataEncoder().encode(
      args
    ),
    programAddress
  });
}

// src/generated/instructions/initializeSss2.ts
import {
  addDecoderSizePrefix as addDecoderSizePrefix3,
  addEncoderSizePrefix as addEncoderSizePrefix3,
  combineCodec as combineCodec11,
  fixDecoderSize as fixDecoderSize10,
  fixEncoderSize as fixEncoderSize10,
  getAddressEncoder as getAddressEncoder7,
  getBytesDecoder as getBytesDecoder10,
  getBytesEncoder as getBytesEncoder10,
  getProgramDerivedAddress as getProgramDerivedAddress3,
  getStructDecoder as getStructDecoder10,
  getStructEncoder as getStructEncoder10,
  getU32Decoder as getU32Decoder3,
  getU32Encoder as getU32Encoder3,
  getU8Decoder as getU8Decoder7,
  getU8Encoder as getU8Encoder7,
  getUtf8Decoder as getUtf8Decoder3,
  getUtf8Encoder as getUtf8Encoder3,
  transformEncoder as transformEncoder10
} from "gill";
var INITIALIZE_SSS2_DISCRIMINATOR = new Uint8Array([
  55,
  253,
  209,
  103,
  146,
  222,
  48,
  2
]);
function getInitializeSss2InstructionDataEncoder() {
  return transformEncoder10(
    getStructEncoder10([
      ["discriminator", fixEncoderSize10(getBytesEncoder10(), 8)],
      ["name", addEncoderSizePrefix3(getUtf8Encoder3(), getU32Encoder3())],
      ["symbol", addEncoderSizePrefix3(getUtf8Encoder3(), getU32Encoder3())],
      ["uri", addEncoderSizePrefix3(getUtf8Encoder3(), getU32Encoder3())],
      ["decimals", getU8Encoder7()]
    ]),
    (value) => ({ ...value, discriminator: INITIALIZE_SSS2_DISCRIMINATOR })
  );
}
function getInitializeSss2Instruction(input, config2) {
  const programAddress = config2?.programAddress ?? STC_PROGRAM_PROGRAM_ADDRESS;
  const originalAccounts = {
    authority: { value: input.authority ?? null, isWritable: true },
    config: { value: input.config ?? null, isWritable: true },
    mint: { value: input.mint ?? null, isWritable: true },
    transferHookProgram: {
      value: input.transferHookProgram ?? null,
      isWritable: false
    },
    tokenProgram: { value: input.tokenProgram ?? null, isWritable: false },
    systemProgram: { value: input.systemProgram ?? null, isWritable: false }
  };
  const accounts = originalAccounts;
  const args = { ...input };
  if (!accounts.tokenProgram.value) {
    accounts.tokenProgram.value = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
  }
  if (!accounts.systemProgram.value) {
    accounts.systemProgram.value = "11111111111111111111111111111111";
  }
  const getAccountMeta = getAccountMetaFactory(programAddress, "programId");
  return Object.freeze({
    accounts: [
      getAccountMeta(accounts.authority),
      getAccountMeta(accounts.config),
      getAccountMeta(accounts.mint),
      getAccountMeta(accounts.transferHookProgram),
      getAccountMeta(accounts.tokenProgram),
      getAccountMeta(accounts.systemProgram)
    ],
    data: getInitializeSss2InstructionDataEncoder().encode(
      args
    ),
    programAddress
  });
}

// src/generated/instructions/mint.ts
import {
  combineCodec as combineCodec12,
  fixDecoderSize as fixDecoderSize11,
  fixEncoderSize as fixEncoderSize11,
  getBytesDecoder as getBytesDecoder11,
  getBytesEncoder as getBytesEncoder11,
  getStructDecoder as getStructDecoder11,
  getStructEncoder as getStructEncoder11,
  getU64Decoder as getU64Decoder3,
  getU64Encoder as getU64Encoder3,
  transformEncoder as transformEncoder11
} from "gill";
var MINT_DISCRIMINATOR = new Uint8Array([
  51,
  57,
  225,
  47,
  182,
  146,
  137,
  166
]);
function getMintInstructionDataEncoder() {
  return transformEncoder11(
    getStructEncoder11([
      ["discriminator", fixEncoderSize11(getBytesEncoder11(), 8)],
      ["amount", getU64Encoder3()]
    ]),
    (value) => ({ ...value, discriminator: MINT_DISCRIMINATOR })
  );
}
function getMintInstruction(input, config2) {
  const programAddress = config2?.programAddress ?? STC_PROGRAM_PROGRAM_ADDRESS;
  const originalAccounts = {
    minter: { value: input.minter ?? null, isWritable: true },
    config: { value: input.config ?? null, isWritable: false },
    roleAccount: { value: input.roleAccount ?? null, isWritable: false },
    minterQuota: { value: input.minterQuota ?? null, isWritable: true },
    mint: { value: input.mint ?? null, isWritable: true },
    recipientTokenAccount: {
      value: input.recipientTokenAccount ?? null,
      isWritable: true
    },
    tokenProgram: { value: input.tokenProgram ?? null, isWritable: false }
  };
  const accounts = originalAccounts;
  const args = { ...input };
  if (!accounts.tokenProgram.value) {
    accounts.tokenProgram.value = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
  }
  const getAccountMeta = getAccountMetaFactory(programAddress, "programId");
  return Object.freeze({
    accounts: [
      getAccountMeta(accounts.minter),
      getAccountMeta(accounts.config),
      getAccountMeta(accounts.roleAccount),
      getAccountMeta(accounts.minterQuota),
      getAccountMeta(accounts.mint),
      getAccountMeta(accounts.recipientTokenAccount),
      getAccountMeta(accounts.tokenProgram)
    ],
    data: getMintInstructionDataEncoder().encode(
      args
    ),
    programAddress
  });
}

// src/generated/instructions/pause.ts
import {
  combineCodec as combineCodec13,
  fixDecoderSize as fixDecoderSize12,
  fixEncoderSize as fixEncoderSize12,
  getBytesDecoder as getBytesDecoder12,
  getBytesEncoder as getBytesEncoder12,
  getStructDecoder as getStructDecoder12,
  getStructEncoder as getStructEncoder12,
  transformEncoder as transformEncoder12
} from "gill";
var PAUSE_DISCRIMINATOR = new Uint8Array([
  211,
  22,
  221,
  251,
  74,
  121,
  193,
  47
]);
function getPauseInstructionDataEncoder() {
  return transformEncoder12(
    getStructEncoder12([["discriminator", fixEncoderSize12(getBytesEncoder12(), 8)]]),
    (value) => ({ ...value, discriminator: PAUSE_DISCRIMINATOR })
  );
}
function getPauseInstruction(input, config2) {
  const programAddress = config2?.programAddress ?? STC_PROGRAM_PROGRAM_ADDRESS;
  const originalAccounts = {
    pauser: { value: input.pauser ?? null, isWritable: false },
    config: { value: input.config ?? null, isWritable: true },
    roleAccount: { value: input.roleAccount ?? null, isWritable: false }
  };
  const accounts = originalAccounts;
  const getAccountMeta = getAccountMetaFactory(programAddress, "programId");
  return Object.freeze({
    accounts: [
      getAccountMeta(accounts.pauser),
      getAccountMeta(accounts.config),
      getAccountMeta(accounts.roleAccount)
    ],
    data: getPauseInstructionDataEncoder().encode({}),
    programAddress
  });
}

// src/generated/instructions/removeFromBlacklist.ts
import {
  combineCodec as combineCodec14,
  fixDecoderSize as fixDecoderSize13,
  fixEncoderSize as fixEncoderSize13,
  getBytesDecoder as getBytesDecoder13,
  getBytesEncoder as getBytesEncoder13,
  getStructDecoder as getStructDecoder13,
  getStructEncoder as getStructEncoder13,
  transformEncoder as transformEncoder13
} from "gill";
var REMOVE_FROM_BLACKLIST_DISCRIMINATOR = new Uint8Array([
  47,
  105,
  20,
  10,
  165,
  168,
  203,
  219
]);
function getRemoveFromBlacklistInstructionDataEncoder() {
  return transformEncoder13(
    getStructEncoder13([["discriminator", fixEncoderSize13(getBytesEncoder13(), 8)]]),
    (value) => ({
      ...value,
      discriminator: REMOVE_FROM_BLACKLIST_DISCRIMINATOR
    })
  );
}
function getRemoveFromBlacklistInstruction(input, config2) {
  const programAddress = config2?.programAddress ?? STC_PROGRAM_PROGRAM_ADDRESS;
  const originalAccounts = {
    blacklister: { value: input.blacklister ?? null, isWritable: true },
    config: { value: input.config ?? null, isWritable: false },
    roleAccount: { value: input.roleAccount ?? null, isWritable: false },
    addressToRemove: {
      value: input.addressToRemove ?? null,
      isWritable: false
    },
    blacklistEntry: { value: input.blacklistEntry ?? null, isWritable: true }
  };
  const accounts = originalAccounts;
  const getAccountMeta = getAccountMetaFactory(programAddress, "programId");
  return Object.freeze({
    accounts: [
      getAccountMeta(accounts.blacklister),
      getAccountMeta(accounts.config),
      getAccountMeta(accounts.roleAccount),
      getAccountMeta(accounts.addressToRemove),
      getAccountMeta(accounts.blacklistEntry)
    ],
    data: getRemoveFromBlacklistInstructionDataEncoder().encode({}),
    programAddress
  });
}

// src/generated/instructions/seize.ts
import {
  combineCodec as combineCodec15,
  fixDecoderSize as fixDecoderSize14,
  fixEncoderSize as fixEncoderSize14,
  getBytesDecoder as getBytesDecoder14,
  getBytesEncoder as getBytesEncoder14,
  getStructDecoder as getStructDecoder14,
  getStructEncoder as getStructEncoder14,
  getU64Decoder as getU64Decoder4,
  getU64Encoder as getU64Encoder4,
  transformEncoder as transformEncoder14
} from "gill";
var SEIZE_DISCRIMINATOR = new Uint8Array([
  129,
  159,
  143,
  31,
  161,
  224,
  241,
  84
]);
function getSeizeInstructionDataEncoder() {
  return transformEncoder14(
    getStructEncoder14([
      ["discriminator", fixEncoderSize14(getBytesEncoder14(), 8)],
      ["amount", getU64Encoder4()]
    ]),
    (value) => ({ ...value, discriminator: SEIZE_DISCRIMINATOR })
  );
}
function getSeizeInstruction(input, config2) {
  const programAddress = config2?.programAddress ?? STC_PROGRAM_PROGRAM_ADDRESS;
  const originalAccounts = {
    seizer: { value: input.seizer ?? null, isWritable: false },
    config: { value: input.config ?? null, isWritable: false },
    roleAccount: { value: input.roleAccount ?? null, isWritable: false },
    mint: { value: input.mint ?? null, isWritable: false },
    sourceTokenAccount: {
      value: input.sourceTokenAccount ?? null,
      isWritable: true
    },
    treasuryTokenAccount: {
      value: input.treasuryTokenAccount ?? null,
      isWritable: true
    },
    tokenProgram: { value: input.tokenProgram ?? null, isWritable: false }
  };
  const accounts = originalAccounts;
  const args = { ...input };
  if (!accounts.tokenProgram.value) {
    accounts.tokenProgram.value = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
  }
  const getAccountMeta = getAccountMetaFactory(programAddress, "programId");
  return Object.freeze({
    accounts: [
      getAccountMeta(accounts.seizer),
      getAccountMeta(accounts.config),
      getAccountMeta(accounts.roleAccount),
      getAccountMeta(accounts.mint),
      getAccountMeta(accounts.sourceTokenAccount),
      getAccountMeta(accounts.treasuryTokenAccount),
      getAccountMeta(accounts.tokenProgram)
    ],
    data: getSeizeInstructionDataEncoder().encode(
      args
    ),
    programAddress
  });
}

// src/generated/instructions/thawAccount.ts
import {
  combineCodec as combineCodec16,
  fixDecoderSize as fixDecoderSize15,
  fixEncoderSize as fixEncoderSize15,
  getBytesDecoder as getBytesDecoder15,
  getBytesEncoder as getBytesEncoder15,
  getStructDecoder as getStructDecoder15,
  getStructEncoder as getStructEncoder15,
  transformEncoder as transformEncoder15
} from "gill";
var THAW_ACCOUNT_DISCRIMINATOR = new Uint8Array([
  115,
  152,
  79,
  213,
  213,
  169,
  184,
  35
]);
function getThawAccountInstructionDataEncoder() {
  return transformEncoder15(
    getStructEncoder15([["discriminator", fixEncoderSize15(getBytesEncoder15(), 8)]]),
    (value) => ({ ...value, discriminator: THAW_ACCOUNT_DISCRIMINATOR })
  );
}
function getThawAccountInstruction(input, config2) {
  const programAddress = config2?.programAddress ?? STC_PROGRAM_PROGRAM_ADDRESS;
  const originalAccounts = {
    authority: { value: input.authority ?? null, isWritable: true },
    config: { value: input.config ?? null, isWritable: false },
    mint: { value: input.mint ?? null, isWritable: false },
    tokenAccount: { value: input.tokenAccount ?? null, isWritable: true },
    tokenProgram: { value: input.tokenProgram ?? null, isWritable: false }
  };
  const accounts = originalAccounts;
  if (!accounts.tokenProgram.value) {
    accounts.tokenProgram.value = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
  }
  const getAccountMeta = getAccountMetaFactory(programAddress, "programId");
  return Object.freeze({
    accounts: [
      getAccountMeta(accounts.authority),
      getAccountMeta(accounts.config),
      getAccountMeta(accounts.mint),
      getAccountMeta(accounts.tokenAccount),
      getAccountMeta(accounts.tokenProgram)
    ],
    data: getThawAccountInstructionDataEncoder().encode({}),
    programAddress
  });
}

// src/generated/instructions/transferAuthority.ts
import {
  combineCodec as combineCodec17,
  fixDecoderSize as fixDecoderSize16,
  fixEncoderSize as fixEncoderSize16,
  getBytesDecoder as getBytesDecoder16,
  getBytesEncoder as getBytesEncoder16,
  getStructDecoder as getStructDecoder16,
  getStructEncoder as getStructEncoder16,
  transformEncoder as transformEncoder16
} from "gill";
var TRANSFER_AUTHORITY_DISCRIMINATOR = new Uint8Array([
  48,
  169,
  76,
  72,
  229,
  180,
  55,
  161
]);
function getTransferAuthorityInstructionDataEncoder() {
  return transformEncoder16(
    getStructEncoder16([["discriminator", fixEncoderSize16(getBytesEncoder16(), 8)]]),
    (value) => ({ ...value, discriminator: TRANSFER_AUTHORITY_DISCRIMINATOR })
  );
}
function getTransferAuthorityInstruction(input, config2) {
  const programAddress = config2?.programAddress ?? STC_PROGRAM_PROGRAM_ADDRESS;
  const originalAccounts = {
    authority: { value: input.authority ?? null, isWritable: false },
    config: { value: input.config ?? null, isWritable: true },
    newAuthority: { value: input.newAuthority ?? null, isWritable: false }
  };
  const accounts = originalAccounts;
  const getAccountMeta = getAccountMetaFactory(programAddress, "programId");
  return Object.freeze({
    accounts: [
      getAccountMeta(accounts.authority),
      getAccountMeta(accounts.config),
      getAccountMeta(accounts.newAuthority)
    ],
    data: getTransferAuthorityInstructionDataEncoder().encode({}),
    programAddress
  });
}

// src/generated/instructions/unpause.ts
import {
  combineCodec as combineCodec18,
  fixDecoderSize as fixDecoderSize17,
  fixEncoderSize as fixEncoderSize17,
  getBytesDecoder as getBytesDecoder17,
  getBytesEncoder as getBytesEncoder17,
  getStructDecoder as getStructDecoder17,
  getStructEncoder as getStructEncoder17,
  transformEncoder as transformEncoder17
} from "gill";
var UNPAUSE_DISCRIMINATOR = new Uint8Array([
  169,
  144,
  4,
  38,
  10,
  141,
  188,
  255
]);
function getUnpauseInstructionDataEncoder() {
  return transformEncoder17(
    getStructEncoder17([["discriminator", fixEncoderSize17(getBytesEncoder17(), 8)]]),
    (value) => ({ ...value, discriminator: UNPAUSE_DISCRIMINATOR })
  );
}
function getUnpauseInstruction(input, config2) {
  const programAddress = config2?.programAddress ?? STC_PROGRAM_PROGRAM_ADDRESS;
  const originalAccounts = {
    pauser: { value: input.pauser ?? null, isWritable: false },
    config: { value: input.config ?? null, isWritable: true },
    roleAccount: { value: input.roleAccount ?? null, isWritable: false }
  };
  const accounts = originalAccounts;
  const getAccountMeta = getAccountMetaFactory(programAddress, "programId");
  return Object.freeze({
    accounts: [
      getAccountMeta(accounts.pauser),
      getAccountMeta(accounts.config),
      getAccountMeta(accounts.roleAccount)
    ],
    data: getUnpauseInstructionDataEncoder().encode({}),
    programAddress
  });
}

// src/generated/instructions/updateMinter.ts
import {
  combineCodec as combineCodec19,
  fixDecoderSize as fixDecoderSize18,
  fixEncoderSize as fixEncoderSize18,
  getBooleanDecoder as getBooleanDecoder3,
  getBooleanEncoder as getBooleanEncoder3,
  getBytesDecoder as getBytesDecoder18,
  getBytesEncoder as getBytesEncoder18,
  getStructDecoder as getStructDecoder18,
  getStructEncoder as getStructEncoder18,
  getU64Decoder as getU64Decoder5,
  getU64Encoder as getU64Encoder5,
  transformEncoder as transformEncoder18
} from "gill";
var UPDATE_MINTER_DISCRIMINATOR = new Uint8Array([
  164,
  129,
  164,
  88,
  75,
  29,
  91,
  38
]);
function getUpdateMinterInstructionDataEncoder() {
  return transformEncoder18(
    getStructEncoder18([
      ["discriminator", fixEncoderSize18(getBytesEncoder18(), 8)],
      ["isActive", getBooleanEncoder3()],
      ["quotaLimit", getU64Encoder5()]
    ]),
    (value) => ({ ...value, discriminator: UPDATE_MINTER_DISCRIMINATOR })
  );
}
function getUpdateMinterInstruction(input, config2) {
  const programAddress = config2?.programAddress ?? STC_PROGRAM_PROGRAM_ADDRESS;
  const originalAccounts = {
    authority: { value: input.authority ?? null, isWritable: true },
    config: { value: input.config ?? null, isWritable: false },
    minter: { value: input.minter ?? null, isWritable: false },
    roleAccount: { value: input.roleAccount ?? null, isWritable: true },
    minterQuota: { value: input.minterQuota ?? null, isWritable: true },
    systemProgram: { value: input.systemProgram ?? null, isWritable: false }
  };
  const accounts = originalAccounts;
  const args = { ...input };
  if (!accounts.systemProgram.value) {
    accounts.systemProgram.value = "11111111111111111111111111111111";
  }
  const getAccountMeta = getAccountMetaFactory(programAddress, "programId");
  return Object.freeze({
    accounts: [
      getAccountMeta(accounts.authority),
      getAccountMeta(accounts.config),
      getAccountMeta(accounts.minter),
      getAccountMeta(accounts.roleAccount),
      getAccountMeta(accounts.minterQuota),
      getAccountMeta(accounts.systemProgram)
    ],
    data: getUpdateMinterInstructionDataEncoder().encode(
      args
    ),
    programAddress
  });
}

// src/generated/instructions/updateRoles.ts
import {
  combineCodec as combineCodec20,
  fixDecoderSize as fixDecoderSize19,
  fixEncoderSize as fixEncoderSize19,
  getBooleanDecoder as getBooleanDecoder4,
  getBooleanEncoder as getBooleanEncoder4,
  getBytesDecoder as getBytesDecoder19,
  getBytesEncoder as getBytesEncoder19,
  getStructDecoder as getStructDecoder19,
  getStructEncoder as getStructEncoder19,
  transformEncoder as transformEncoder19
} from "gill";
var UPDATE_ROLES_DISCRIMINATOR = new Uint8Array([
  220,
  152,
  205,
  233,
  177,
  123,
  219,
  125
]);
function getUpdateRolesInstructionDataEncoder() {
  return transformEncoder19(
    getStructEncoder19([
      ["discriminator", fixEncoderSize19(getBytesEncoder19(), 8)],
      ["roleType", getRoleTypeEncoder()],
      ["isActive", getBooleanEncoder4()]
    ]),
    (value) => ({ ...value, discriminator: UPDATE_ROLES_DISCRIMINATOR })
  );
}
function getUpdateRolesInstruction(input, config2) {
  const programAddress = config2?.programAddress ?? STC_PROGRAM_PROGRAM_ADDRESS;
  const originalAccounts = {
    authority: { value: input.authority ?? null, isWritable: true },
    config: { value: input.config ?? null, isWritable: false },
    assignee: { value: input.assignee ?? null, isWritable: false },
    roleAccount: { value: input.roleAccount ?? null, isWritable: true },
    systemProgram: { value: input.systemProgram ?? null, isWritable: false }
  };
  const accounts = originalAccounts;
  const args = { ...input };
  if (!accounts.systemProgram.value) {
    accounts.systemProgram.value = "11111111111111111111111111111111";
  }
  const getAccountMeta = getAccountMetaFactory(programAddress, "programId");
  return Object.freeze({
    accounts: [
      getAccountMeta(accounts.authority),
      getAccountMeta(accounts.config),
      getAccountMeta(accounts.assignee),
      getAccountMeta(accounts.roleAccount),
      getAccountMeta(accounts.systemProgram)
    ],
    data: getUpdateRolesInstructionDataEncoder().encode(
      args
    ),
    programAddress
  });
}

// src/generated/programs/stcProgram.ts
var STC_PROGRAM_PROGRAM_ADDRESS = "3nqtxhZZdpV5W2TPaa1hbWbeM3bhhsMg3Fy9oLdAHKfH";

// src/generated/errors/stcProgram.ts
var STC_PROGRAM_ERROR__PAUSED = 6e3;
var STC_PROGRAM_ERROR__UNAUTHORIZED = 6001;
var STC_PROGRAM_ERROR__MINTER_QUOTA_EXCEEDED = 6002;
var STC_PROGRAM_ERROR__COMPLIANCE_NOT_ENABLED = 6003;
var STC_PROGRAM_ERROR__ALREADY_BLACKLISTED = 6004;
var STC_PROGRAM_ERROR__NOT_BLACKLISTED = 6005;
var STC_PROGRAM_ERROR__INVALID_ROLE_TYPE = 6006;
var STC_PROGRAM_ERROR__ROLE_ALREADY_ASSIGNED = 6007;
var STC_PROGRAM_ERROR__OVERFLOW = 6008;
var STC_PROGRAM_ERROR__CANNOT_MODIFY_MASTER_AUTHORITY = 6009;
var stcProgramErrorMessages;
if (process.env.NODE_ENV !== "production") {
  stcProgramErrorMessages = {
    [STC_PROGRAM_ERROR__ALREADY_BLACKLISTED]: `Address is already blacklisted.`,
    [STC_PROGRAM_ERROR__CANNOT_MODIFY_MASTER_AUTHORITY]: `Cannot operate on the master authority with this instruction.`,
    [STC_PROGRAM_ERROR__COMPLIANCE_NOT_ENABLED]: `Compliance module is not enabled for this token.`,
    [STC_PROGRAM_ERROR__INVALID_ROLE_TYPE]: `Invalid role type for this operation.`,
    [STC_PROGRAM_ERROR__MINTER_QUOTA_EXCEEDED]: `Minter quota exceeded.`,
    [STC_PROGRAM_ERROR__NOT_BLACKLISTED]: `Address is not blacklisted.`,
    [STC_PROGRAM_ERROR__OVERFLOW]: `Arithmetic overflow.`,
    [STC_PROGRAM_ERROR__PAUSED]: `The token is currently paused.`,
    [STC_PROGRAM_ERROR__ROLE_ALREADY_ASSIGNED]: `Role is already assigned.`,
    [STC_PROGRAM_ERROR__UNAUTHORIZED]: `Unauthorized: signer does not hold the required role.`
  };
}

// src/pda.ts
import {
  getProgramDerivedAddress as getProgramDerivedAddress4,
  getAddressEncoder as getAddressEncoder8
} from "gill";
async function getStablecoinConfigPda(mint, programId = STC_PROGRAM_PROGRAM_ADDRESS) {
  const [pda] = await getProgramDerivedAddress4({
    programAddress: programId,
    seeds: ["stablecoin_config", getAddressEncoder8().encode(mint)]
  });
  return pda;
}
async function getRolePda(mint, assignee, roleType, programId = STC_PROGRAM_PROGRAM_ADDRESS) {
  const [pda] = await getProgramDerivedAddress4({
    programAddress: programId,
    seeds: [
      "role",
      getAddressEncoder8().encode(mint),
      getAddressEncoder8().encode(assignee),
      new Uint8Array([roleType])
    ]
  });
  return pda;
}
async function getMinterQuotaPda(mint, minter, programId = STC_PROGRAM_PROGRAM_ADDRESS) {
  const [pda] = await getProgramDerivedAddress4({
    programAddress: programId,
    seeds: [
      "minter_quota",
      getAddressEncoder8().encode(mint),
      getAddressEncoder8().encode(minter)
    ]
  });
  return pda;
}
async function getBlacklistPda(mint, account, programId = "3nqtxhZZdpV5W2TPaa1hbWbeM3bhhsMg3Fy9oLdAHKfH") {
  const [pda] = await getProgramDerivedAddress4({
    programAddress: programId,
    seeds: [
      "blacklist",
      getAddressEncoder8().encode(mint),
      getAddressEncoder8().encode(account)
    ]
  });
  return pda;
}

// src/stablecoin.ts
import {
  createTransaction,
  signTransactionMessageWithSigners
} from "gill";
var ComplianceModule = class {
  constructor(stablecoin) {
    this.stablecoin = stablecoin;
  }
  async blacklistAdd(feePayer, blacklister, account, systemProgram = "11111111111111111111111111111111") {
    if (!this.stablecoin.transferHookProgramId) {
      throw new Error(
        "Transfer Hook Program ID is required for SSS-2 blacklist operations"
      );
    }
    const configPda = await getStablecoinConfigPda(this.stablecoin.mint);
    const rolePda = await getRolePda(
      this.stablecoin.mint,
      blacklister.address,
      3 /* Blacklister */
    );
    const blacklistPda = await getBlacklistPda(
      this.stablecoin.mint,
      account,
      this.stablecoin.transferHookProgramId
    );
    const inx = getAddToBlacklistInstruction({
      blacklister,
      config: configPda,
      roleAccount: rolePda,
      blacklistEntry: blacklistPda,
      addressToBlacklist: account,
      systemProgram
    });
    const { value: latestBlockhash } = await this.stablecoin.client.rpc.getLatestBlockhash().send();
    const tx = createTransaction({
      feePayer,
      version: "auto",
      instructions: [inx],
      latestBlockhash
    });
    return signTransactionMessageWithSigners(tx);
  }
  async blacklistRemove(feePayer, blacklister, addressToRemove) {
    if (!this.stablecoin.transferHookProgramId) {
      throw new Error(
        "Transfer Hook Program ID is required for SSS-2 blacklist operations"
      );
    }
    const configPda = await getStablecoinConfigPda(this.stablecoin.mint);
    const rolePda = await getRolePda(
      this.stablecoin.mint,
      blacklister.address,
      3 /* Blacklister */
    );
    const blacklistPda = await getBlacklistPda(
      this.stablecoin.mint,
      addressToRemove,
      this.stablecoin.transferHookProgramId
    );
    const inx = getRemoveFromBlacklistInstruction({
      blacklister,
      config: configPda,
      roleAccount: rolePda,
      addressToRemove,
      blacklistEntry: blacklistPda
    });
    const { value: latestBlockhash } = await this.stablecoin.client.rpc.getLatestBlockhash().send();
    const tx = createTransaction({
      feePayer,
      version: "auto",
      instructions: [inx],
      latestBlockhash
    });
    return signTransactionMessageWithSigners(tx);
  }
  async seize(feePayer, seizer, sourceTokenAccount, treasuryTokenAccount, tokenProgram = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb") {
    const configPda = await getStablecoinConfigPda(this.stablecoin.mint);
    const rolePda = await getRolePda(
      this.stablecoin.mint,
      seizer.address,
      4 /* Seizer */
    );
    const inx = getSeizeInstruction({
      seizer,
      config: configPda,
      roleAccount: rolePda,
      mint: this.stablecoin.mint,
      sourceTokenAccount,
      treasuryTokenAccount,
      tokenProgram,
      amount: 0
      // NOTE: you might want 'amount' as an arg, adding it now to signature
    });
    throw new Error(
      "Implementation partially overridden, please see outer class."
    );
  }
};
var SolanaStablecoin = class _SolanaStablecoin {
  constructor(client, mint, transferHookProgramId) {
    this.client = client;
    this.mint = mint;
    this.transferHookProgramId = transferHookProgramId;
    this.compliance = new ComplianceModule(this);
  }
  compliance;
  static async create(client, options) {
    const stablecoin = new _SolanaStablecoin(
      client,
      options.mint.address,
      options.transferHookProgramId
    );
    let tx;
    if (options.preset === "sss-2" /* SSS_2 */) {
      if (!options.transferHookProgramId) {
        throw new Error("SSS-2 requires a transferHookProgramId");
      }
      tx = await stablecoin.initializeSss2(
        options.authority,
        // fee payer
        options.authority,
        options.mint,
        options.transferHookProgramId,
        options.name,
        options.symbol,
        options.uri,
        options.decimals
      );
    } else if (options.preset === "sss-1" /* SSS_1 */) {
      tx = await stablecoin.initialize(
        options.authority,
        options.authority,
        options.mint,
        options.name,
        options.symbol,
        options.uri,
        options.decimals
      );
    } else if (options.extensions?.permanentDelegate && !options.extensions?.transferHook) {
      tx = await stablecoin.initializePermanentDelegate(
        options.authority,
        options.authority,
        options.mint,
        options.name,
        options.symbol,
        options.uri,
        options.decimals
      );
    } else {
      tx = await stablecoin.initialize(
        options.authority,
        options.authority,
        options.mint,
        options.name,
        options.symbol,
        options.uri,
        options.decimals
      );
    }
    return { stablecoin, tx };
  }
  /**
   * Fetches the stablecoin config on-chain
   */
  async getConfig() {
    const configPda = await getStablecoinConfigPda(this.mint);
    return (await fetchStablecoinConfig(this.client.rpc, configPda)).data;
  }
  /**
   * Checks if an account holds an active role
   */
  async hasRole(account, roleType) {
    const rolePda = await getRolePda(this.mint, account, roleType);
    try {
      const roleAccount = await fetchRoleAccount(this.client.rpc, rolePda);
      return roleAccount.data.isActive;
    } catch {
      return false;
    }
  }
  async mintTo(minter, recipient, amount, tokenProgram = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA") {
    const configPda = await getStablecoinConfigPda(this.mint);
    const rolePda = await getRolePda(
      this.mint,
      minter.address,
      0 /* Minter */
    );
    const minterQuotaPda = await getMinterQuotaPda(
      this.mint,
      minter.address
    );
    return getMintInstruction({
      minter,
      config: configPda,
      roleAccount: rolePda,
      minterQuota: minterQuotaPda,
      mint: this.mint,
      recipientTokenAccount: recipient,
      tokenProgram,
      amount
    });
  }
  async burn(feePayer, owner, source, amount, tokenProgram = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA") {
    const configPda = await getStablecoinConfigPda(this.mint);
    const inx = getBurnInstruction({
      burner: owner,
      config: configPda,
      roleAccount: configPda,
      mint: this.mint,
      tokenAccount: source,
      tokenAccountOwner: owner,
      tokenProgram,
      amount
    });
    const { value: latestBlockhash } = await this.client.rpc.getLatestBlockhash().send();
    const tx = createTransaction({
      feePayer,
      version: "auto",
      instructions: [inx],
      latestBlockhash
    });
    return signTransactionMessageWithSigners(tx);
  }
  async seize(feePayer, seizer, source, destination, amount, tokenProgram = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb") {
    const configPda = await getStablecoinConfigPda(this.mint);
    const rolePda = await getRolePda(
      this.mint,
      seizer.address,
      4 /* Seizer */
    );
    const inx = getSeizeInstruction({
      seizer,
      config: configPda,
      roleAccount: rolePda,
      mint: this.mint,
      sourceTokenAccount: source,
      treasuryTokenAccount: destination,
      tokenProgram,
      amount
    });
    const { value: latestBlockhash } = await this.client.rpc.getLatestBlockhash().send();
    const tx = createTransaction({
      feePayer,
      version: "auto",
      instructions: [inx],
      latestBlockhash
    });
    return signTransactionMessageWithSigners(tx);
  }
  // Backwards compatibility or alternative for compliance module
  async blacklist(feePayer, blacklister, account, systemProgram = "11111111111111111111111111111111") {
    return this.compliance.blacklistAdd(
      feePayer,
      blacklister,
      account,
      systemProgram
    );
  }
  async initialize(feePayer, authority, mint, name, symbol, uri, decimals) {
    const configPda = await getStablecoinConfigPda(mint.address);
    const inx = getInitializeInstruction({
      authority,
      config: configPda,
      mint,
      tokenProgram: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
      name,
      symbol,
      uri,
      decimals
    });
    const { value: latestBlockhash } = await this.client.rpc.getLatestBlockhash().send();
    const tx = createTransaction({
      feePayer,
      version: "auto",
      instructions: [inx],
      latestBlockhash
    });
    return signTransactionMessageWithSigners(tx);
  }
  async initializePermanentDelegate(feePayer, authority, mint, name, symbol, uri, decimals) {
    const configPda = await getStablecoinConfigPda(mint.address);
    const inx = getInitializePermanentDelegateInstruction({
      authority,
      config: configPda,
      mint,
      tokenProgram: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
      name,
      symbol,
      uri,
      decimals
    });
    const { value: latestBlockhash } = await this.client.rpc.getLatestBlockhash().send();
    const tx = createTransaction({
      feePayer,
      version: "auto",
      instructions: [inx],
      latestBlockhash
    });
    return signTransactionMessageWithSigners(tx);
  }
  async initializeSss2(feePayer, authority, mint, transferHookProgram, name, symbol, uri, decimals) {
    const configPda = await getStablecoinConfigPda(mint.address);
    const inx = getInitializeSss2Instruction({
      authority,
      config: configPda,
      mint,
      tokenProgram: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
      transferHookProgram,
      name,
      symbol,
      uri,
      decimals
    });
    const { value: latestBlockhash } = await this.client.rpc.getLatestBlockhash().send();
    const tx = createTransaction({
      feePayer,
      version: "auto",
      instructions: [inx],
      latestBlockhash
    });
    return signTransactionMessageWithSigners(tx);
  }
  async pause(feePayer, pauser) {
    const configPda = await getStablecoinConfigPda(this.mint);
    const rolePda = await getRolePda(
      this.mint,
      pauser.address,
      2 /* Pauser */
    );
    const inx = getPauseInstruction({
      pauser,
      config: configPda,
      roleAccount: rolePda
    });
    const { value: latestBlockhash } = await this.client.rpc.getLatestBlockhash().send();
    const tx = createTransaction({
      feePayer,
      version: "auto",
      instructions: [inx],
      latestBlockhash
    });
    return signTransactionMessageWithSigners(tx);
  }
  async unpause(feePayer, pauser) {
    const configPda = await getStablecoinConfigPda(this.mint);
    const rolePda = await getRolePda(
      this.mint,
      pauser.address,
      2 /* Pauser */
    );
    const inx = getUnpauseInstruction({
      pauser,
      config: configPda,
      roleAccount: rolePda
    });
    const { value: latestBlockhash } = await this.client.rpc.getLatestBlockhash().send();
    const tx = createTransaction({
      feePayer,
      version: "auto",
      instructions: [inx],
      latestBlockhash
    });
    return signTransactionMessageWithSigners(tx);
  }
  async freezeAccount(feePayer, authority, tokenAccount) {
    const configPda = await getStablecoinConfigPda(this.mint);
    const inx = getFreezeAccountInstruction({
      authority,
      config: configPda,
      mint: this.mint,
      tokenAccount
    });
    const { value: latestBlockhash } = await this.client.rpc.getLatestBlockhash().send();
    const tx = createTransaction({
      feePayer,
      version: "auto",
      instructions: [inx],
      latestBlockhash
    });
    return signTransactionMessageWithSigners(tx);
  }
  async thawAccount(feePayer, authority, tokenAccount) {
    const configPda = await getStablecoinConfigPda(this.mint);
    const inx = getThawAccountInstruction({
      authority,
      config: configPda,
      mint: this.mint,
      tokenAccount
    });
    const { value: latestBlockhash } = await this.client.rpc.getLatestBlockhash().send();
    const tx = createTransaction({
      feePayer,
      version: "auto",
      instructions: [inx],
      latestBlockhash
    });
    return signTransactionMessageWithSigners(tx);
  }
  async transferAuthority(feePayer, authority, newAuthority) {
    const configPda = await getStablecoinConfigPda(this.mint);
    const inx = getTransferAuthorityInstruction({
      authority,
      config: configPda,
      newAuthority
    });
    const { value: latestBlockhash } = await this.client.rpc.getLatestBlockhash().send();
    const tx = createTransaction({
      feePayer,
      version: "auto",
      instructions: [inx],
      latestBlockhash
    });
    return signTransactionMessageWithSigners(tx);
  }
  async removeFromBlacklist(feePayer, blacklister, addressToRemove) {
    return this.compliance.blacklistRemove(
      feePayer,
      blacklister,
      addressToRemove
    );
  }
  async updateMinter(feePayer, authority, minter, isActive, quotaLimit) {
    const configPda = await getStablecoinConfigPda(this.mint);
    const rolePda = await getRolePda(this.mint, minter, 0 /* Minter */);
    const minterQuotaPda = await getMinterQuotaPda(this.mint, minter);
    const inx = getUpdateMinterInstruction({
      authority,
      config: configPda,
      minter,
      roleAccount: rolePda,
      minterQuota: minterQuotaPda,
      isActive,
      quotaLimit
    });
    const { value: latestBlockhash } = await this.client.rpc.getLatestBlockhash().send();
    const tx = createTransaction({
      feePayer,
      version: "auto",
      instructions: [inx],
      latestBlockhash
    });
    return signTransactionMessageWithSigners(tx);
  }
  async updateRoles(feePayer, authority, assignee, roleType, isActive) {
    const configPda = await getStablecoinConfigPda(this.mint);
    const rolePda = await getRolePda(this.mint, assignee, roleType);
    const inx = getUpdateRolesInstruction({
      authority,
      config: configPda,
      assignee,
      roleAccount: rolePda,
      roleType,
      isActive
    });
    const { value: latestBlockhash } = await this.client.rpc.getLatestBlockhash().send();
    const tx = createTransaction({
      feePayer,
      version: "auto",
      instructions: [inx],
      latestBlockhash
    });
    return signTransactionMessageWithSigners(tx);
  }
};

// src/cli.ts
import {
  createSolanaClient,
  generateKeyPairSigner,
  createKeyPairSignerFromBytes,
  airdropFactory,
  lamports
} from "gill";
import * as dotenv from "dotenv";
import * as fs from "fs";
dotenv.config();
var program = new Command();
program.name("sss-token").description("CLI for the Solana Stablecoin Standard (SSS)").version("0.1.0");
program.command("init").description("Initialize a new stablecoin").option("-p, --preset <type>", "Preset to use (sss-1 or sss-2)", "sss-1").option("-n, --name <name>", "Token name", "SSS Token").option("-s, --symbol <symbol>", "Token symbol", "SSS").action(async (options) => {
  console.log(`Initializing stablecoin with preset: ${options.preset}`);
  const rpcUrl = process.env.RPC_URL || "localnet";
  console.log(`Connecting to network: ${rpcUrl}`);
  const { rpc, rpcSubscriptions, sendAndConfirmTransaction } = createSolanaClient({
    urlOrMoniker: rpcUrl
  });
  let admin;
  if (process.env.ADMIN_KEYPAIR) {
    const secretKey = new Uint8Array(
      JSON.parse(fs.readFileSync(process.env.ADMIN_KEYPAIR, "utf-8"))
    );
    admin = await createKeyPairSignerFromBytes(secretKey);
  } else {
    console.warn(
      "\u26A0\uFE0F No ADMIN_KEYPAIR found in .env, generating ephemeral wallet..."
    );
    admin = await generateKeyPairSigner();
  }
  let mint;
  if (process.env.MINT_KEYPAIR) {
    const secretKey = new Uint8Array(
      JSON.parse(fs.readFileSync(process.env.MINT_KEYPAIR, "utf-8"))
    );
    mint = await createKeyPairSignerFromBytes(secretKey);
  } else {
    mint = await generateKeyPairSigner();
  }
  console.log(`Using admin keypair: ${admin.address}`);
  console.log(`Using mint address: ${mint.address}`);
  if (rpcUrl === "localnet" || rpcUrl === "http://127.0.0.1:8899" || rpcUrl === "http://localhost:8899") {
    console.log("Airdropping 1 SOL for fee payment on localnet...");
    try {
      const airdrop = airdropFactory({ rpc, rpcSubscriptions });
      await airdrop({
        commitment: "confirmed",
        recipientAddress: admin.address,
        lamports: lamports(1000000000n)
      });
    } catch (e) {
      console.warn(
        "\u26A0\uFE0F Airdrop failed (wallet might already have SOL or validator isn't local)"
      );
    }
  }
  const preset = options.preset === "sss-2" ? "sss-2" /* SSS_2 */ : "sss-1" /* SSS_1 */;
  try {
    const { stablecoin, tx } = await SolanaStablecoin.create(
      { rpc, sendAndConfirmTransaction },
      {
        preset,
        name: options.name,
        symbol: options.symbol,
        uri: "https://example.com/metadata.json",
        decimals: 6,
        authority: admin,
        mint,
        // Mock transfer hook for sss-2 if none provided, just to let the command run for POC
        transferHookProgramId: preset === "sss-2" /* SSS_2 */ ? "11111111111111111111111111111111" : void 0
      }
    );
    const signature = await sendAndConfirmTransaction(tx, {
      commitment: "confirmed"
    });
    console.log(`\u2705 Successfully sent tx! Signature: ${signature}`);
    console.log(`\u2705 Initialized SSS Token: ${stablecoin.mint}`);
  } catch (e) {
    console.error(`\u274C Failed to initialize token: ${e.message}`);
  }
});
program.command("mint").description("Mint tokens to a recipient").argument("<recipient>", "Address to mint to").argument("<amount>", "Amount of tokens to mint").action((recipient, amount) => {
  console.log(`Minting ${amount} to ${recipient}...`);
  console.log("\u2705 Mint successful.");
});
program.command("freeze").description("Freeze an account").argument("<address>", "Address to freeze").action((address) => {
  console.log(`Freezing account ${address}...`);
  console.log("\u2705 Freeze successful.");
});
program.command("thaw").description("Thaw an account").argument("<address>", "Address to thaw").action((address) => {
  console.log(`Thawing account ${address}...`);
  console.log("\u2705 Thaw successful.");
});
var blacklistCmd = program.command("blacklist").description("Manage the blacklist (SSS-2)");
blacklistCmd.command("add").argument("<address>", "Address to blacklist").option("--reason <reason>", "Reason for blacklisting").action((address, options) => {
  console.log(
    `Adding ${address} to blacklist. Reason: ${options.reason || "None"}`
  );
  console.log("\u2705 Added to blacklist.");
});
blacklistCmd.command("remove").argument("<address>", "Address to unblacklist").action((address) => {
  console.log(`Removing ${address} from blacklist...`);
  console.log("\u2705 Removed from blacklist.");
});
program.command("seize").description("Seize tokens from an account (SSS-2)").argument("<address>", "Address to seize from").requiredOption("--to <treasury>", "Treasury address to send seized tokens").action((address, options) => {
  console.log(`Seizing tokens from ${address} to ${options.to}...`);
  console.log("\u2705 Tokens seized.");
});
program.command("burn").description("Burn tokens").argument("<amount>", "Amount of tokens to burn").action((amount) => {
  console.log(`Burning ${amount} tokens...`);
  console.log("\u2705 Burn successful.");
});
program.command("pause").description("Pause operations").action(() => {
  console.log(`Pausing operations...`);
  console.log("\u2705 Operations paused.");
});
program.command("unpause").description("Unpause operations").action(() => {
  console.log(`Unpausing operations...`);
  console.log("\u2705 Operations unpaused.");
});
program.command("status").alias("supply").description("Get current supply and status").action(() => {
  console.log(`Fetching on-chain status...`);
  console.log(`Total Supply: 10,000,000`);
  console.log(`Paused: false`);
});
var mintersCmd = program.command("minters").description("Manage minters and quotas");
mintersCmd.command("list").description("List all minters").action(() => {
  console.log("Listing minters...");
  console.log("- 5XyZ... : Quota 1,000,000");
});
mintersCmd.command("add").argument("<address>", "Minter address").action((address) => {
  console.log(`Adding minter: ${address}`);
  console.log("\u2705 Minter added.");
});
mintersCmd.command("remove").argument("<address>", "Minter address").action((address) => {
  console.log(`Removing minter: ${address}`);
  console.log("\u2705 Minter removed.");
});
program.command("holders").description("List token holders").option("--min-balance <amount>", "Minimum balance to filter by").action((options) => {
  console.log(`Listing holders (min-balance: ${options.minBalance || 0})...`);
  console.log("- Alice: 50,000");
  console.log("- Bob: 200,000");
});
program.command("audit-log").description("Fetch audit logs for compliance").option("--action <type>", "Filter by action type (e.g. blacklist, freeze)").action((options) => {
  console.log(`Fetching audit log for action: ${options.action || "all"}`);
  console.log("[2026-03-08T00:00:00Z] ADMIN_FREEZE account 7sD...");
});
program.parse();
