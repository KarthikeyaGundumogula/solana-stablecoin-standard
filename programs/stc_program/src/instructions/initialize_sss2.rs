use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke;
use anchor_spl::token_2022::spl_token_2022::{self, instruction::set_authority};
use anchor_spl::token_interface::{
    spl_token_metadata_interface::state::TokenMetadata, token_metadata_initialize, Mint,
    TokenInterface, TokenMetadataInitialize,
};

use crate::state::*;

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct InitializeSss2Args {
    pub name: String,
    pub symbol: String,
    pub uri: String,
    pub decimals: u8,
}

/// SSS-2 Initialize: creates a Token-2022 mint with MetadataPointer + TransferHook +
/// PermanentDelegate + DefaultAccountState(Frozen).
#[derive(Accounts)]
#[instruction(args: InitializeSss2Args)]
pub struct InitializeSss2<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + StablecoinConfig::INIT_SPACE,
        seeds = [b"stablecoin_config", mint.key().as_ref()],
        bump,
    )]
    pub config: Account<'info, StablecoinConfig>,

    /// Token-2022 mint with all SSS-2 extensions.
    /// - MetadataPointer: on-chain metadata stored in the mint
    /// - TransferHook: calls transfer_hook_program on every transfer
    /// - PermanentDelegate: config PDA can seize tokens from any account
    /// - DefaultAccountState: new token accounts start Frozen
    #[account(
        init,
        payer = authority,
        mint::decimals = args.decimals,
        mint::authority = authority,
        mint::freeze_authority = config,
        extensions::metadata_pointer::authority = authority,
        extensions::metadata_pointer::metadata_address = mint.key(),
        extensions::transfer_hook::authority = authority,
        extensions::transfer_hook::program_id = transfer_hook_program.key(),
        extensions::permanent_delegate::delegate = config,
    )]
    pub mint: InterfaceAccount<'info, Mint>,

    /// The transfer hook program that enforces blacklist checks
    /// CHECK: Stored in the mint's TransferHook extension
    pub transfer_hook_program: UncheckedAccount<'info>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

pub fn handler_initialize_sss2(
    ctx: Context<InitializeSss2>,
    args: InitializeSss2Args,
) -> Result<()> {
    // 1. Transfer extra lamports for metadata storage
    let token_metadata = TokenMetadata {
        update_authority: Some(ctx.accounts.authority.key()).try_into().unwrap(),
        mint: ctx.accounts.mint.key(),
        name: args.name.clone(),
        symbol: args.symbol.clone(),
        uri: args.uri.clone(),
        additional_metadata: vec![],
    };

    let metadata_len = token_metadata.tlv_size_of()?;
    let current_data_len = ctx.accounts.mint.to_account_info().data_len();
    let current_lamports = ctx.accounts.mint.to_account_info().lamports();

    let required_rent = Rent::get()?.minimum_balance(current_data_len + metadata_len + 16);

    if required_rent > current_lamports {
        anchor_lang::system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.authority.to_account_info(),
                    to: ctx.accounts.mint.to_account_info(),
                },
            ),
            required_rent - current_lamports,
        )?;
    }

    // 2. Initialize on-chain metadata
    let cpi_accounts = TokenMetadataInitialize {
        program_id: ctx.accounts.token_program.to_account_info(),
        mint: ctx.accounts.mint.to_account_info(),
        metadata: ctx.accounts.mint.to_account_info(),
        mint_authority: ctx.accounts.authority.to_account_info(),
        update_authority: ctx.accounts.authority.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    token_metadata_initialize(cpi_ctx, args.name, args.symbol, args.uri)?;

    // 3. Transfer mint authority → config PDA (for RBAC minting)
    invoke(
        &set_authority(
            &spl_token_2022::ID,
            &ctx.accounts.mint.key(),
            Some(&ctx.accounts.config.key()),
            spl_token_2022::instruction::AuthorityType::MintTokens,
            &ctx.accounts.authority.key(),
            &[],
        )?,
        &[
            ctx.accounts.mint.to_account_info(),
            ctx.accounts.authority.to_account_info(),
        ],
    )?;

    // 4. Initialize config PDA with SSS-2 flags enabled
    let config = &mut ctx.accounts.config;
    config.mint = ctx.accounts.mint.key();
    config.master_authority = ctx.accounts.authority.key();
    config.decimals = args.decimals;
    config.is_paused = false;
    config.enable_permanent_delegate = true;
    config.enable_transfer_hook = true;
    config.bump = ctx.bumps.config;

    msg!(
        "SSS-2 Stablecoin initialized: mint={}, transfer_hook={}",
        ctx.accounts.mint.key(),
        ctx.accounts.transfer_hook_program.key()
    );
    Ok(())
}
