use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke;
use anchor_spl::token_2022::spl_token_2022::{self, instruction::set_authority};
use anchor_spl::token_interface::{
    token_metadata_initialize, Mint, TokenInterface, TokenMetadataInitialize,
};

use crate::state::*;

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct InitializePermanentDelegateArgs {
    pub name: String,
    pub symbol: String,
    pub uri: String,
    pub decimals: u8,
}

/// SSS-2 Seize-Only variant: MetadataPointer + PermanentDelegate, no TransferHook.
///
/// Follows the same pattern as the Token-2022 docs:
///   1. Anchor creates the account with the right size
///   2. Anchor initializes extensions in order (PermanentDelegate before initialize_mint)
///   3. Anchor runs initialize_mint
///   4. We then run token_metadata_initialize (still signed by `authority`)
///   5. We transfer mint authority → config PDA via set_authority
///
/// The config PDA is registered as the permanent_delegate, so it can sign
/// transfer_checked as the authority for any token account of this mint.
#[derive(Accounts)]
#[instruction(args: InitializePermanentDelegateArgs)]
pub struct InitializePermanentDelegate<'info> {
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

    /// Mint with MetadataPointer + PermanentDelegate extensions.
    /// Anchor initializes extensions BEFORE initialize_mint — matching the docs order.
    #[account(
        init,
        payer = authority,
        mint::decimals = args.decimals,
        mint::authority = authority,         // temporarily authority; transferred to config below
        mint::freeze_authority = config,
        extensions::metadata_pointer::authority = authority,
        extensions::metadata_pointer::metadata_address = mint.key(),
        extensions::permanent_delegate::delegate = config,  // config PDA is the delegate
    )]
    pub mint: InterfaceAccount<'info, Mint>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

pub fn handler_initialize_permanent_delegate(
    ctx: Context<InitializePermanentDelegate>,
    args: InitializePermanentDelegateArgs,
) -> Result<()> {
    use anchor_spl::token_interface::spl_token_metadata_interface::state::TokenMetadata;

    // Token-2022 docs pattern: calculate space including metadata bytes and top up rent.
    // Anchor's `init` only funds the account for the base extension types —
    // `token_metadata_initialize` appends variable-length strings which need extra lamports.
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

    // The account needs to be reallocated to hold ExtensionType::TokenMetadata base+strings.
    // Instead of rebuilding the size from scratch, just add the new bytes we're appending
    // (with a small 16-byte safety padding for alignment) to the current length.
    let required_lamports = Rent::get()?.minimum_balance(current_data_len + metadata_len + 16);

    if required_lamports > current_lamports {
        anchor_lang::system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.authority.to_account_info(),
                    to: ctx.accounts.mint.to_account_info(),
                },
            ),
            required_lamports - current_lamports,
        )?;
    }

    // Step 1: Initialize token metadata (while authority is still the signer)

    token_metadata_initialize(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            TokenMetadataInitialize {
                program_id: ctx.accounts.token_program.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                metadata: ctx.accounts.mint.to_account_info(), // metadata_address = mint
                mint_authority: ctx.accounts.authority.to_account_info(),
                update_authority: ctx.accounts.authority.to_account_info(),
            },
        ),
        args.name,
        args.symbol,
        args.uri,
    )?;

    // Step 2: Transfer mint authority from `authority` → config PDA
    // From this point on, only config PDA (via CPI from our program) can mint tokens.
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

    // Step 3: Populate config
    let config = &mut ctx.accounts.config;
    config.mint = ctx.accounts.mint.key();
    config.master_authority = ctx.accounts.authority.key();
    config.decimals = args.decimals;
    config.is_paused = false;
    config.enable_permanent_delegate = true;
    config.enable_transfer_hook = false;
    config.bump = ctx.bumps.config;

    msg!(
        "PermanentDelegate mint initialized: {}",
        ctx.accounts.mint.key()
    );
    Ok(())
}
