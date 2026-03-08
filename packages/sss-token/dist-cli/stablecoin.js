"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SolanaStablecoin = exports.ComplianceModule = exports.Presets = void 0;
const gill_1 = require("gill");
const pda_1 = require("./pda");
const generated_1 = require("./generated");
var Presets;
(function (Presets) {
    Presets["SSS_1"] = "sss-1";
    Presets["SSS_2"] = "sss-2";
})(Presets || (exports.Presets = Presets = {}));
class ComplianceModule {
    stablecoin;
    constructor(stablecoin) {
        this.stablecoin = stablecoin;
    }
    async blacklistAdd(feePayer, blacklister, account, systemProgram = "11111111111111111111111111111111") {
        if (!this.stablecoin.transferHookProgramId) {
            throw new Error("Transfer Hook Program ID is required for SSS-2 blacklist operations");
        }
        const configPda = await (0, pda_1.getStablecoinConfigPda)(this.stablecoin.mint);
        const rolePda = await (0, pda_1.getRolePda)(this.stablecoin.mint, blacklister.address, generated_1.RoleType.Blacklister);
        const blacklistPda = await (0, pda_1.getBlacklistPda)(this.stablecoin.mint, account, this.stablecoin.transferHookProgramId);
        const inx = (0, generated_1.getAddToBlacklistInstruction)({
            blacklister,
            config: configPda,
            roleAccount: rolePda,
            blacklistEntry: blacklistPda,
            addressToBlacklist: account,
            systemProgram,
        });
        const { value: latestBlockhash } = await this.stablecoin.client.rpc
            .getLatestBlockhash()
            .send();
        const tx = (0, gill_1.createTransaction)({
            feePayer,
            version: "auto",
            instructions: [inx],
            latestBlockhash,
        });
        return (0, gill_1.signTransactionMessageWithSigners)(tx);
    }
    async blacklistRemove(feePayer, blacklister, addressToRemove) {
        if (!this.stablecoin.transferHookProgramId) {
            throw new Error("Transfer Hook Program ID is required for SSS-2 blacklist operations");
        }
        const configPda = await (0, pda_1.getStablecoinConfigPda)(this.stablecoin.mint);
        const rolePda = await (0, pda_1.getRolePda)(this.stablecoin.mint, blacklister.address, generated_1.RoleType.Blacklister);
        const blacklistPda = await (0, pda_1.getBlacklistPda)(this.stablecoin.mint, addressToRemove, this.stablecoin.transferHookProgramId);
        const inx = (0, generated_1.getRemoveFromBlacklistInstruction)({
            blacklister,
            config: configPda,
            roleAccount: rolePda,
            addressToRemove,
            blacklistEntry: blacklistPda,
        });
        const { value: latestBlockhash } = await this.stablecoin.client.rpc
            .getLatestBlockhash()
            .send();
        const tx = (0, gill_1.createTransaction)({
            feePayer,
            version: "auto",
            instructions: [inx],
            latestBlockhash,
        });
        return (0, gill_1.signTransactionMessageWithSigners)(tx);
    }
    async seize(feePayer, seizer, sourceTokenAccount, treasuryTokenAccount, tokenProgram = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb") {
        const configPda = await (0, pda_1.getStablecoinConfigPda)(this.stablecoin.mint);
        const rolePda = await (0, pda_1.getRolePda)(this.stablecoin.mint, seizer.address, generated_1.RoleType.Seizer);
        const inx = (0, generated_1.getSeizeInstruction)({
            seizer,
            config: configPda,
            roleAccount: rolePda,
            mint: this.stablecoin.mint,
            sourceTokenAccount,
            treasuryTokenAccount,
            tokenProgram,
            amount: 0, // NOTE: you might want 'amount' as an arg, adding it now to signature
        });
        // Let's fix seize args: seize(feePayer, seizer, source, treasury, amount, tokenProgram)
        throw new Error("Implementation partially overridden, please see outer class.");
    }
}
exports.ComplianceModule = ComplianceModule;
class SolanaStablecoin {
    client;
    mint;
    transferHookProgramId;
    compliance;
    constructor(client, mint, transferHookProgramId) {
        this.client = client;
        this.mint = mint;
        this.transferHookProgramId = transferHookProgramId;
        this.compliance = new ComplianceModule(this);
    }
    static async create(client, options) {
        const stablecoin = new SolanaStablecoin(client, options.mint.address, options.transferHookProgramId);
        let tx;
        if (options.preset === Presets.SSS_2) {
            if (!options.transferHookProgramId) {
                throw new Error("SSS-2 requires a transferHookProgramId");
            }
            tx = await stablecoin.initializeSss2(options.authority, // fee payer
            options.authority, options.mint, options.transferHookProgramId, options.name, options.symbol, options.uri, options.decimals);
        }
        else if (options.preset === Presets.SSS_1) {
            tx = await stablecoin.initialize(options.authority, options.authority, options.mint, options.name, options.symbol, options.uri, options.decimals);
        }
        else if (options.extensions?.permanentDelegate &&
            !options.extensions?.transferHook) {
            tx = await stablecoin.initializePermanentDelegate(options.authority, options.authority, options.mint, options.name, options.symbol, options.uri, options.decimals);
        }
        else {
            // Default to basic initialize
            tx = await stablecoin.initialize(options.authority, options.authority, options.mint, options.name, options.symbol, options.uri, options.decimals);
        }
        return { stablecoin, tx };
    }
    /**
     * Fetches the stablecoin config on-chain
     */
    async getConfig() {
        const configPda = await (0, pda_1.getStablecoinConfigPda)(this.mint);
        return (await (0, generated_1.fetchStablecoinConfig)(this.client.rpc, configPda)).data;
    }
    /**
     * Checks if an account holds an active role
     */
    async hasRole(account, roleType) {
        const rolePda = await (0, pda_1.getRolePda)(this.mint, account, roleType);
        try {
            const roleAccount = await (0, generated_1.fetchRoleAccount)(this.client.rpc, rolePda);
            return roleAccount.data.isActive;
        }
        catch {
            return false;
        }
    }
    async mintTo(minter, recipient, amount, tokenProgram = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA") {
        const configPda = await (0, pda_1.getStablecoinConfigPda)(this.mint);
        const rolePda = await (0, pda_1.getRolePda)(this.mint, minter.address, generated_1.RoleType.Minter);
        const minterQuotaPda = await (0, pda_1.getMinterQuotaPda)(this.mint, minter.address);
        return (0, generated_1.getMintInstruction)({
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
    async burn(feePayer, owner, source, amount, tokenProgram = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA") {
        const configPda = await (0, pda_1.getStablecoinConfigPda)(this.mint);
        const inx = (0, generated_1.getBurnInstruction)({
            burner: owner,
            config: configPda,
            roleAccount: configPda,
            mint: this.mint,
            tokenAccount: source,
            tokenAccountOwner: owner,
            tokenProgram,
            amount,
        });
        const { value: latestBlockhash } = await this.client.rpc
            .getLatestBlockhash()
            .send();
        const tx = (0, gill_1.createTransaction)({
            feePayer,
            version: "auto",
            instructions: [inx],
            latestBlockhash,
        });
        return (0, gill_1.signTransactionMessageWithSigners)(tx);
    }
    async seize(feePayer, seizer, source, destination, amount, tokenProgram = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb") {
        const configPda = await (0, pda_1.getStablecoinConfigPda)(this.mint);
        const rolePda = await (0, pda_1.getRolePda)(this.mint, seizer.address, generated_1.RoleType.Seizer);
        const inx = (0, generated_1.getSeizeInstruction)({
            seizer,
            config: configPda,
            roleAccount: rolePda,
            mint: this.mint,
            sourceTokenAccount: source,
            treasuryTokenAccount: destination,
            tokenProgram,
            amount,
        });
        const { value: latestBlockhash } = await this.client.rpc
            .getLatestBlockhash()
            .send();
        const tx = (0, gill_1.createTransaction)({
            feePayer,
            version: "auto",
            instructions: [inx],
            latestBlockhash,
        });
        return (0, gill_1.signTransactionMessageWithSigners)(tx);
    }
    // Backwards compatibility or alternative for compliance module
    async blacklist(feePayer, blacklister, account, systemProgram = "11111111111111111111111111111111") {
        return this.compliance.blacklistAdd(feePayer, blacklister, account, systemProgram);
    }
    async initialize(feePayer, authority, mint, name, symbol, uri, decimals) {
        const configPda = await (0, pda_1.getStablecoinConfigPda)(mint.address);
        const inx = (0, generated_1.getInitializeInstruction)({
            authority,
            config: configPda,
            mint,
            tokenProgram: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
            name,
            symbol,
            uri,
            decimals,
        });
        const { value: latestBlockhash } = await this.client.rpc
            .getLatestBlockhash()
            .send();
        const tx = (0, gill_1.createTransaction)({
            feePayer,
            version: "auto",
            instructions: [inx],
            latestBlockhash,
        });
        return (0, gill_1.signTransactionMessageWithSigners)(tx);
    }
    async initializePermanentDelegate(feePayer, authority, mint, name, symbol, uri, decimals) {
        const configPda = await (0, pda_1.getStablecoinConfigPda)(mint.address);
        const inx = (0, generated_1.getInitializePermanentDelegateInstruction)({
            authority,
            config: configPda,
            mint,
            tokenProgram: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
            name,
            symbol,
            uri,
            decimals,
        });
        const { value: latestBlockhash } = await this.client.rpc
            .getLatestBlockhash()
            .send();
        const tx = (0, gill_1.createTransaction)({
            feePayer,
            version: "auto",
            instructions: [inx],
            latestBlockhash,
        });
        return (0, gill_1.signTransactionMessageWithSigners)(tx);
    }
    async initializeSss2(feePayer, authority, mint, transferHookProgram, name, symbol, uri, decimals) {
        const configPda = await (0, pda_1.getStablecoinConfigPda)(mint.address);
        const inx = (0, generated_1.getInitializeSss2Instruction)({
            authority,
            config: configPda,
            mint,
            tokenProgram: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
            transferHookProgram,
            name,
            symbol,
            uri,
            decimals,
        });
        const { value: latestBlockhash } = await this.client.rpc
            .getLatestBlockhash()
            .send();
        const tx = (0, gill_1.createTransaction)({
            feePayer,
            version: "auto",
            instructions: [inx],
            latestBlockhash,
        });
        return (0, gill_1.signTransactionMessageWithSigners)(tx);
    }
    async pause(feePayer, pauser) {
        const configPda = await (0, pda_1.getStablecoinConfigPda)(this.mint);
        const rolePda = await (0, pda_1.getRolePda)(this.mint, pauser.address, generated_1.RoleType.Pauser);
        const inx = (0, generated_1.getPauseInstruction)({
            pauser,
            config: configPda,
            roleAccount: rolePda,
        });
        const { value: latestBlockhash } = await this.client.rpc
            .getLatestBlockhash()
            .send();
        const tx = (0, gill_1.createTransaction)({
            feePayer,
            version: "auto",
            instructions: [inx],
            latestBlockhash,
        });
        return (0, gill_1.signTransactionMessageWithSigners)(tx);
    }
    async unpause(feePayer, pauser) {
        const configPda = await (0, pda_1.getStablecoinConfigPda)(this.mint);
        const rolePda = await (0, pda_1.getRolePda)(this.mint, pauser.address, generated_1.RoleType.Pauser);
        const inx = (0, generated_1.getUnpauseInstruction)({
            pauser,
            config: configPda,
            roleAccount: rolePda,
        });
        const { value: latestBlockhash } = await this.client.rpc
            .getLatestBlockhash()
            .send();
        const tx = (0, gill_1.createTransaction)({
            feePayer,
            version: "auto",
            instructions: [inx],
            latestBlockhash,
        });
        return (0, gill_1.signTransactionMessageWithSigners)(tx);
    }
    async freezeAccount(feePayer, authority, tokenAccount) {
        const configPda = await (0, pda_1.getStablecoinConfigPda)(this.mint);
        const inx = (0, generated_1.getFreezeAccountInstruction)({
            authority,
            config: configPda,
            mint: this.mint,
            tokenAccount,
        });
        const { value: latestBlockhash } = await this.client.rpc
            .getLatestBlockhash()
            .send();
        const tx = (0, gill_1.createTransaction)({
            feePayer,
            version: "auto",
            instructions: [inx],
            latestBlockhash,
        });
        return (0, gill_1.signTransactionMessageWithSigners)(tx);
    }
    async thawAccount(feePayer, authority, tokenAccount) {
        const configPda = await (0, pda_1.getStablecoinConfigPda)(this.mint);
        const inx = (0, generated_1.getThawAccountInstruction)({
            authority,
            config: configPda,
            mint: this.mint,
            tokenAccount,
        });
        const { value: latestBlockhash } = await this.client.rpc
            .getLatestBlockhash()
            .send();
        const tx = (0, gill_1.createTransaction)({
            feePayer,
            version: "auto",
            instructions: [inx],
            latestBlockhash,
        });
        return (0, gill_1.signTransactionMessageWithSigners)(tx);
    }
    async transferAuthority(feePayer, authority, newAuthority) {
        const configPda = await (0, pda_1.getStablecoinConfigPda)(this.mint);
        const inx = (0, generated_1.getTransferAuthorityInstruction)({
            authority,
            config: configPda,
            newAuthority,
        });
        const { value: latestBlockhash } = await this.client.rpc
            .getLatestBlockhash()
            .send();
        const tx = (0, gill_1.createTransaction)({
            feePayer,
            version: "auto",
            instructions: [inx],
            latestBlockhash,
        });
        return (0, gill_1.signTransactionMessageWithSigners)(tx);
    }
    async removeFromBlacklist(feePayer, blacklister, addressToRemove) {
        return this.compliance.blacklistRemove(feePayer, blacklister, addressToRemove);
    }
    async updateMinter(feePayer, authority, minter, isActive, quotaLimit) {
        const configPda = await (0, pda_1.getStablecoinConfigPda)(this.mint);
        const rolePda = await (0, pda_1.getRolePda)(this.mint, minter, generated_1.RoleType.Minter);
        const minterQuotaPda = await (0, pda_1.getMinterQuotaPda)(this.mint, minter);
        const inx = (0, generated_1.getUpdateMinterInstruction)({
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
        const tx = (0, gill_1.createTransaction)({
            feePayer,
            version: "auto",
            instructions: [inx],
            latestBlockhash,
        });
        return (0, gill_1.signTransactionMessageWithSigners)(tx);
    }
    async updateRoles(feePayer, authority, assignee, roleType, isActive) {
        const configPda = await (0, pda_1.getStablecoinConfigPda)(this.mint);
        const rolePda = await (0, pda_1.getRolePda)(this.mint, assignee, roleType);
        const inx = (0, generated_1.getUpdateRolesInstruction)({
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
        const tx = (0, gill_1.createTransaction)({
            feePayer,
            version: "auto",
            instructions: [inx],
            latestBlockhash,
        });
        return (0, gill_1.signTransactionMessageWithSigners)(tx);
    }
}
exports.SolanaStablecoin = SolanaStablecoin;
