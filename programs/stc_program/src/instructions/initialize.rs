use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke;
use anchor_spl::token_2022::spl_token_2022::{
    self, extension::ExtensionType, instruction::set_authority, state::Mint as MintState,
};
use anchor_spl::token_interface::{
    spl_token_metadata_interface::state::TokenMetadata, token_metadata_initialize, Mint,
    TokenInterface, TokenMetadataInitialize,
};

use crate::state::*;

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct InitializeArgs {
    pub name: String,
    pub symbol: String,
    pub uri: String,
    pub decimals: u8,
    // SSS-2 compliance options
    pub enable_permanent_delegate: bool,
    pub enable_transfer_hook: bool,
}

#[derive(Accounts)]
#[instruction(args: InitializeArgs)]
pub struct Initialize<'info> {
    /// The master authority who is initializing this stablecoin
    #[account(mut)]
    pub authority: Signer<'info>,

    /// The stablecoin config PDA
    #[account(
        init,
        payer = authority,
        space = 8 + StablecoinConfig::INIT_SPACE,
        seeds = [b"stablecoin_config", mint.key().as_ref()],
        bump,
    )]
    pub config: Account<'info, StablecoinConfig>,

    /// The Token-2022 mint account — Anchor creates it with extensions.
    /// Authority wallet is initially the mint authority (needed for metadata init).
    /// After metadata init, we transfer mint authority to the config PDA.
    #[account(
        init,
        payer = authority,
        mint::decimals = args.decimals,
        mint::authority = authority,
        mint::freeze_authority = config,
        extensions::metadata_pointer::authority = authority,
        extensions::metadata_pointer::metadata_address = mint.key(),
    )]
    pub mint: InterfaceAccount<'info, Mint>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

pub fn handler_initialize(ctx: Context<Initialize>, args: InitializeArgs) -> Result<()> {
    // ----- 1. Transfer extra lamports for metadata storage -----
    let token_metadata = TokenMetadata {
        update_authority: Some(ctx.accounts.authority.key()).try_into().unwrap(),
        mint: ctx.accounts.mint.key(),
        name: args.name.clone(),
        symbol: args.symbol.clone(),
        uri: args.uri.clone(),
        additional_metadata: vec![],
    };

    let mut ext_types = vec![ExtensionType::MetadataPointer];
    if args.enable_permanent_delegate {
        ext_types.push(ExtensionType::PermanentDelegate);
    }
    if args.enable_transfer_hook {
        ext_types.push(ExtensionType::TransferHook);
    }

    let mint_space = ExtensionType::try_calculate_account_len::<MintState>(&ext_types)?;
    let metadata_len = token_metadata.tlv_size_of()?;
    let rent = Rent::get()?;
    let required_rent = rent.minimum_balance(mint_space + metadata_len);
    let current_lamports = ctx.accounts.mint.to_account_info().lamports();

    if required_rent > current_lamports {
        let lamports_needed = required_rent - current_lamports;
        anchor_lang::system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.authority.to_account_info(),
                    to: ctx.accounts.mint.to_account_info(),
                },
            ),
            lamports_needed,
        )?;
    }

    // ----- 2. Initialize on-chain metadata (authority wallet is mint authority) -----
    let cpi_accounts = TokenMetadataInitialize {
        program_id: ctx.accounts.token_program.to_account_info(),
        mint: ctx.accounts.mint.to_account_info(),
        metadata: ctx.accounts.mint.to_account_info(),
        mint_authority: ctx.accounts.authority.to_account_info(),
        update_authority: ctx.accounts.authority.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    token_metadata_initialize(cpi_ctx, args.name, args.symbol, args.uri)?;

    // ----- 3. Transfer mint authority from wallet → config PDA -----
    // This enables the program to control minting via RBAC
    let set_auth_ix = set_authority(
        &spl_token_2022::ID,
        &ctx.accounts.mint.key(),
        Some(&ctx.accounts.config.key()),
        spl_token_2022::instruction::AuthorityType::MintTokens,
        &ctx.accounts.authority.key(),
        &[],
    )?;
    invoke(
        &set_auth_ix,
        &[
            ctx.accounts.mint.to_account_info(),
            ctx.accounts.authority.to_account_info(),
        ],
    )?;

    // ----- 4. Initialize the config PDA -----
    let config = &mut ctx.accounts.config;
    config.mint = ctx.accounts.mint.key();
    config.master_authority = ctx.accounts.authority.key();
    config.decimals = args.decimals;
    config.is_paused = false;
    config.enable_permanent_delegate = args.enable_permanent_delegate;
    config.enable_transfer_hook = args.enable_transfer_hook;
    config.bump = ctx.bumps.config;

    msg!(
        "Stablecoin initialized: mint={}, sss2={}",
        ctx.accounts.mint.key(),
        args.enable_permanent_delegate && args.enable_transfer_hook
    );

    Ok(())
}
