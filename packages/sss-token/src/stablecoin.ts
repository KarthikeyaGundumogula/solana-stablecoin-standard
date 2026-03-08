import {
  type Address,
  type TransactionSigner,
  type Rpc,
  type GetAccountInfoApi,
  type GetMinimumBalanceForRentExemptionApi,
  type SendAndConfirmTransactionWithSignersFunction,
  type SolanaRpcApi,
  createTransaction,
  signTransactionMessageWithSigners,
  type TransactionMessageWithBlockhashLifetime,
  type FullySignedTransaction,
  getProgramDerivedAddress,
  getAddressEncoder,
} from "gill";
import {
  getStablecoinConfigPda,
  getRolePda,
  getMinterQuotaPda,
  getBlacklistPda,
} from "./pda";
import {
  getMintInstruction,
  getBurnInstruction,
  getSeizeInstruction,
  getPauseInstruction,
  getUnpauseInstruction,
  getFreezeAccountInstruction,
  getThawAccountInstruction,
  getAddToBlacklistInstruction,
  getRemoveFromBlacklistInstruction,
  getUpdateRolesInstruction,
  getUpdateMinterInstruction,
  getInitializeInstruction,
  getInitializePermanentDelegateInstruction,
  getInitializeSss2Instruction,
  getTransferAuthorityInstruction,
  fetchStablecoinConfig,
  type StablecoinConfig,
  fetchRoleAccount,
  fetchMinterQuota,
  fetchBlacklistEntry,
  RoleType,
} from "./generated";

export type SssClient = {
  rpc: Rpc<SolanaRpcApi>;
  sendAndConfirmTransaction?: SendAndConfirmTransactionWithSignersFunction;
};

export enum Presets {
  SSS_1 = "sss-1",
  SSS_2 = "sss-2",
}

export interface CustomExtensions {
  permanentDelegate?: boolean;
  transferHook?: boolean;
  defaultAccountState?: boolean;
}

export interface StablecoinInitOptions {
  preset?: Presets;
  extensions?: CustomExtensions;
  name: string;
  symbol: string;
  uri: string;
  decimals: number;
  authority: TransactionSigner;
  mint: TransactionSigner;
  transferHookProgramId?: Address;
}

export class ComplianceModule {
  constructor(private stablecoin: SolanaStablecoin) {}

  async blacklistAdd(
    feePayer: TransactionSigner,
    blacklister: TransactionSigner,
    account: Address,
    systemProgram: Address = "11111111111111111111111111111111" as Address,
  ): Promise<FullySignedTransaction> {
    if (!this.stablecoin.transferHookProgramId) {
      throw new Error(
        "Transfer Hook Program ID is required for SSS-2 blacklist operations",
      );
    }

    const configPda = await getStablecoinConfigPda(this.stablecoin.mint);
    const rolePda = await getRolePda(
      this.stablecoin.mint,
      blacklister.address as Address,
      RoleType.Blacklister,
    );
    const blacklistPda = await getBlacklistPda(
      this.stablecoin.mint,
      account,
      this.stablecoin.transferHookProgramId,
    );

    const inx = getAddToBlacklistInstruction({
      blacklister,
      config: configPda as Address,
      roleAccount: rolePda as Address,
      blacklistEntry: blacklistPda,
      addressToBlacklist: account,
      systemProgram,
    });

    const { value: latestBlockhash } = await this.stablecoin.client.rpc
      .getLatestBlockhash()
      .send();

    const tx = createTransaction({
      feePayer,
      version: "auto",
      instructions: [inx],
      latestBlockhash,
    });

    return signTransactionMessageWithSigners(tx);
  }

  async blacklistRemove(
    feePayer: TransactionSigner,
    blacklister: TransactionSigner,
    addressToRemove: Address,
  ): Promise<FullySignedTransaction> {
    if (!this.stablecoin.transferHookProgramId) {
      throw new Error(
        "Transfer Hook Program ID is required for SSS-2 blacklist operations",
      );
    }
    const configPda = await getStablecoinConfigPda(this.stablecoin.mint);
    const rolePda = await getRolePda(
      this.stablecoin.mint,
      blacklister.address as Address,
      RoleType.Blacklister,
    );
    const blacklistPda = await getBlacklistPda(
      this.stablecoin.mint,
      addressToRemove,
      this.stablecoin.transferHookProgramId,
    );

    const inx = getRemoveFromBlacklistInstruction({
      blacklister,
      config: configPda,
      roleAccount: rolePda,
      addressToRemove,
      blacklistEntry: blacklistPda,
    });

    const { value: latestBlockhash } = await this.stablecoin.client.rpc
      .getLatestBlockhash()
      .send();

    const tx = createTransaction({
      feePayer,
      version: "auto",
      instructions: [inx],
      latestBlockhash,
    });

    return signTransactionMessageWithSigners(tx);
  }

  async seize(
    feePayer: TransactionSigner,
    seizer: TransactionSigner,
    sourceTokenAccount: Address,
    treasuryTokenAccount: Address,
    tokenProgram: Address = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb" as Address,
  ): Promise<FullySignedTransaction> {
    const configPda = await getStablecoinConfigPda(this.stablecoin.mint);
    const rolePda = await getRolePda(
      this.stablecoin.mint,
      seizer.address as Address,
      RoleType.Seizer,
    );

    const inx = getSeizeInstruction({
      seizer,
      config: configPda as Address,
      roleAccount: rolePda as Address,
      mint: this.stablecoin.mint,
      sourceTokenAccount,
      treasuryTokenAccount,
      tokenProgram,
      amount: 0, // NOTE: you might want 'amount' as an arg, adding it now to signature
    });
    // Let's fix seize args: seize(feePayer, seizer, source, treasury, amount, tokenProgram)

    throw new Error(
      "Implementation partially overridden, please see outer class.",
    );
  }
}

export class SolanaStablecoin {
  public readonly compliance: ComplianceModule;

  constructor(
    public readonly client: SssClient,
    public readonly mint: Address,
    public readonly transferHookProgramId?: Address,
  ) {
    this.compliance = new ComplianceModule(this);
  }

  static async create(
    client: SssClient,
    options: StablecoinInitOptions,
  ): Promise<{ stablecoin: SolanaStablecoin; tx: FullySignedTransaction }> {
    const stablecoin = new SolanaStablecoin(
      client,
      options.mint.address as Address,
      options.transferHookProgramId,
    );

    let tx: FullySignedTransaction;

    if (options.preset === Presets.SSS_2) {
      if (!options.transferHookProgramId) {
        throw new Error("SSS-2 requires a transferHookProgramId");
      }
      tx = await stablecoin.initializeSss2(
        options.authority, // fee payer
        options.authority,
        options.mint,
        options.transferHookProgramId,
        options.name,
        options.symbol,
        options.uri,
        options.decimals,
      );
    } else if (options.preset === Presets.SSS_1) {
      tx = await stablecoin.initialize(
        options.authority,
        options.authority,
        options.mint,
        options.name,
        options.symbol,
        options.uri,
        options.decimals,
      );
    } else if (
      options.extensions?.permanentDelegate &&
      !options.extensions?.transferHook
    ) {
      tx = await stablecoin.initializePermanentDelegate(
        options.authority,
        options.authority,
        options.mint,
        options.name,
        options.symbol,
        options.uri,
        options.decimals,
      );
    } else {
      // Default to basic initialize
      tx = await stablecoin.initialize(
        options.authority,
        options.authority,
        options.mint,
        options.name,
        options.symbol,
        options.uri,
        options.decimals,
      );
    }

    return { stablecoin, tx };
  }

  /**
   * Fetches the stablecoin config on-chain
   */
  async getConfig(): Promise<StablecoinConfig> {
    const configPda = await getStablecoinConfigPda(this.mint);
    return (await fetchStablecoinConfig(this.client.rpc, configPda)).data;
  }

  /**
   * Checks if an account holds an active role
   */
  async hasRole(account: Address, roleType: number): Promise<boolean> {
    const rolePda = await getRolePda(this.mint, account, roleType);
    try {
      const roleAccount = await fetchRoleAccount(this.client.rpc, rolePda);
      return roleAccount.data.isActive;
    } catch {
      return false;
    }
  }

  async mintTo(
    minter: TransactionSigner,
    recipient: Address,
    amount: bigint,
    tokenProgram: Address = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" as Address,
  ) {
    const configPda = await getStablecoinConfigPda(this.mint);
    const rolePda = await getRolePda(
      this.mint,
      minter.address as Address,
      RoleType.Minter,
    );
    const minterQuotaPda = await getMinterQuotaPda(
      this.mint,
      minter.address as Address,
    );

    return getMintInstruction({
      minter,
      config: configPda,
      roleAccount: rolePda,
      minterQuota: minterQuotaPda,
      mint: this.mint,
      recipientTokenAccount: recipient,
      tokenProgram,
      amount,
    });
  }

  async burn(
    feePayer: TransactionSigner,
    owner: TransactionSigner,
    source: Address,
    amount: bigint,
    tokenProgram: Address = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" as Address,
  ): Promise<FullySignedTransaction> {
    const configPda = await getStablecoinConfigPda(this.mint);

    const inx = getBurnInstruction({
      burner: owner,
      config: configPda as Address,
      roleAccount: configPda as Address,
      mint: this.mint,
      tokenAccount: source,
      tokenAccountOwner: owner,
      tokenProgram,
      amount,
    });

    const { value: latestBlockhash } = await this.client.rpc
      .getLatestBlockhash()
      .send();

    const tx = createTransaction({
      feePayer,
      version: "auto",
      instructions: [inx],
      latestBlockhash,
    });

    return signTransactionMessageWithSigners(tx);
  }

  async seize(
    feePayer: TransactionSigner,
    seizer: TransactionSigner,
    source: Address,
    destination: Address,
    amount: bigint,
    tokenProgram: Address = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb" as Address,
  ): Promise<FullySignedTransaction> {
    const configPda = await getStablecoinConfigPda(this.mint);
    const rolePda = await getRolePda(
      this.mint,
      seizer.address as Address,
      RoleType.Seizer,
    );

    const inx = getSeizeInstruction({
      seizer,
      config: configPda as Address,
      roleAccount: rolePda as Address,
      mint: this.mint,
      sourceTokenAccount: source,
      treasuryTokenAccount: destination,
      tokenProgram,
      amount,
    });

    const { value: latestBlockhash } = await this.client.rpc
      .getLatestBlockhash()
      .send();

    const tx = createTransaction({
      feePayer,
      version: "auto",
      instructions: [inx],
      latestBlockhash,
    });

    return signTransactionMessageWithSigners(tx);
  }

  // Backwards compatibility or alternative for compliance module
  async blacklist(
    feePayer: TransactionSigner,
    blacklister: TransactionSigner,
    account: Address,
    systemProgram: Address = "11111111111111111111111111111111" as Address,
  ): Promise<FullySignedTransaction> {
    return this.compliance.blacklistAdd(
      feePayer,
      blacklister,
      account,
      systemProgram,
    );
  }

  async initialize(
    feePayer: TransactionSigner,
    authority: TransactionSigner,
    mint: TransactionSigner,
    name: string,
    symbol: string,
    uri: string,
    decimals: number,
  ): Promise<FullySignedTransaction> {
    const configPda = await getStablecoinConfigPda(mint.address as Address);

    const inx = getInitializeInstruction({
      authority,
      config: configPda,
      mint,
      tokenProgram: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb" as Address,
      name,
      symbol,
      uri,
      decimals,
    });

    const { value: latestBlockhash } = await this.client.rpc
      .getLatestBlockhash()
      .send();

    const tx = createTransaction({
      feePayer,
      version: "auto",
      instructions: [inx],
      latestBlockhash,
    });

    return signTransactionMessageWithSigners(tx);
  }

  async initializePermanentDelegate(
    feePayer: TransactionSigner,
    authority: TransactionSigner,
    mint: TransactionSigner,
    name: string,
    symbol: string,
    uri: string,
    decimals: number,
  ): Promise<FullySignedTransaction> {
    const configPda = await getStablecoinConfigPda(mint.address as Address);

    const inx = getInitializePermanentDelegateInstruction({
      authority,
      config: configPda,
      mint,
      tokenProgram: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb" as Address,
      name,
      symbol,
      uri,
      decimals,
    });

    const { value: latestBlockhash } = await this.client.rpc
      .getLatestBlockhash()
      .send();

    const tx = createTransaction({
      feePayer,
      version: "auto",
      instructions: [inx],
      latestBlockhash,
    });

    return signTransactionMessageWithSigners(tx);
  }

  async initializeSss2(
    feePayer: TransactionSigner,
    authority: TransactionSigner,
    mint: TransactionSigner,
    transferHookProgram: Address,
    name: string,
    symbol: string,
    uri: string,
    decimals: number,
  ): Promise<FullySignedTransaction> {
    const configPda = await getStablecoinConfigPda(mint.address as Address);

    const inx = getInitializeSss2Instruction({
      authority,
      config: configPda,
      mint,
      tokenProgram: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb" as Address,
      transferHookProgram,
      name,
      symbol,
      uri,
      decimals,
    });

    const { value: latestBlockhash } = await this.client.rpc
      .getLatestBlockhash()
      .send();

    const tx = createTransaction({
      feePayer,
      version: "auto",
      instructions: [inx],
      latestBlockhash,
    });

    return signTransactionMessageWithSigners(tx);
  }

  async pause(
    feePayer: TransactionSigner,
    pauser: TransactionSigner,
  ): Promise<FullySignedTransaction> {
    const configPda = await getStablecoinConfigPda(this.mint);
    const rolePda = await getRolePda(
      this.mint,
      pauser.address as Address,
      RoleType.Pauser,
    );

    const inx = getPauseInstruction({
      pauser,
      config: configPda,
      roleAccount: rolePda,
    });

    const { value: latestBlockhash } = await this.client.rpc
      .getLatestBlockhash()
      .send();

    const tx = createTransaction({
      feePayer,
      version: "auto",
      instructions: [inx],
      latestBlockhash,
    });

    return signTransactionMessageWithSigners(tx);
  }

  async unpause(
    feePayer: TransactionSigner,
    pauser: TransactionSigner,
  ): Promise<FullySignedTransaction> {
    const configPda = await getStablecoinConfigPda(this.mint);
    const rolePda = await getRolePda(
      this.mint,
      pauser.address as Address,
      RoleType.Pauser,
    );

    const inx = getUnpauseInstruction({
      pauser,
      config: configPda,
      roleAccount: rolePda,
    });

    const { value: latestBlockhash } = await this.client.rpc
      .getLatestBlockhash()
      .send();

    const tx = createTransaction({
      feePayer,
      version: "auto",
      instructions: [inx],
      latestBlockhash,
    });

    return signTransactionMessageWithSigners(tx);
  }

  async freezeAccount(
    feePayer: TransactionSigner,
    authority: TransactionSigner,
    tokenAccount: Address,
  ): Promise<FullySignedTransaction> {
    const configPda = await getStablecoinConfigPda(this.mint);

    const inx = getFreezeAccountInstruction({
      authority,
      config: configPda,
      mint: this.mint,
      tokenAccount,
    });

    const { value: latestBlockhash } = await this.client.rpc
      .getLatestBlockhash()
      .send();

    const tx = createTransaction({
      feePayer,
      version: "auto",
      instructions: [inx],
      latestBlockhash,
    });

    return signTransactionMessageWithSigners(tx);
  }

  async thawAccount(
    feePayer: TransactionSigner,
    authority: TransactionSigner,
    tokenAccount: Address,
  ): Promise<FullySignedTransaction> {
    const configPda = await getStablecoinConfigPda(this.mint);

    const inx = getThawAccountInstruction({
      authority,
      config: configPda,
      mint: this.mint,
      tokenAccount,
    });

    const { value: latestBlockhash } = await this.client.rpc
      .getLatestBlockhash()
      .send();

    const tx = createTransaction({
      feePayer,
      version: "auto",
      instructions: [inx],
      latestBlockhash,
    });

    return signTransactionMessageWithSigners(tx);
  }

  async transferAuthority(
    feePayer: TransactionSigner,
    authority: TransactionSigner,
    newAuthority: Address,
  ): Promise<FullySignedTransaction> {
    const configPda = await getStablecoinConfigPda(this.mint);

    const inx = getTransferAuthorityInstruction({
      authority,
      config: configPda,
      newAuthority,
    });

    const { value: latestBlockhash } = await this.client.rpc
      .getLatestBlockhash()
      .send();

    const tx = createTransaction({
      feePayer,
      version: "auto",
      instructions: [inx],
      latestBlockhash,
    });

    return signTransactionMessageWithSigners(tx);
  }

  async removeFromBlacklist(
    feePayer: TransactionSigner,
    blacklister: TransactionSigner,
    addressToRemove: Address,
  ): Promise<FullySignedTransaction> {
    return this.compliance.blacklistRemove(
      feePayer,
      blacklister,
      addressToRemove,
    );
  }

  async updateMinter(
    feePayer: TransactionSigner,
    authority: TransactionSigner,
    minter: Address,
    isActive: boolean,
    quotaLimit: bigint,
  ): Promise<FullySignedTransaction> {
    const configPda = await getStablecoinConfigPda(this.mint);
    const rolePda = await getRolePda(this.mint, minter, RoleType.Minter);
    const minterQuotaPda = await getMinterQuotaPda(this.mint, minter);

    const inx = getUpdateMinterInstruction({
      authority,
      config: configPda,
      minter,
      roleAccount: rolePda,
      minterQuota: minterQuotaPda,
      isActive,
      quotaLimit,
    });

    const { value: latestBlockhash } = await this.client.rpc
      .getLatestBlockhash()
      .send();

    const tx = createTransaction({
      feePayer,
      version: "auto",
      instructions: [inx],
      latestBlockhash,
    });

    return signTransactionMessageWithSigners(tx);
  }

  async updateRoles(
    feePayer: TransactionSigner,
    authority: TransactionSigner,
    assignee: Address,
    roleType: number,
    isActive: boolean,
  ): Promise<FullySignedTransaction> {
    const configPda = await getStablecoinConfigPda(this.mint);
    const rolePda = await getRolePda(this.mint, assignee, roleType);

    const inx = getUpdateRolesInstruction({
      authority,
      config: configPda,
      assignee,
      roleAccount: rolePda,
      roleType,
      isActive,
    });

    const { value: latestBlockhash } = await this.client.rpc
      .getLatestBlockhash()
      .send();

    const tx = createTransaction({
      feePayer,
      version: "auto",
      instructions: [inx],
      latestBlockhash,
    });

    return signTransactionMessageWithSigners(tx);
  }
}
