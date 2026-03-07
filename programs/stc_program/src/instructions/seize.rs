use anchor_lang::prelude::*;
use anchor_spl::token_2022::TransferChecked;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface};

use crate::errors::StablecoinError;
use crate::state::*;

/// Seize tokens from an account using the permanent delegate (SSS-2 only).
/// The config PDA is the permanent delegate registered on the mint.
/// Token-2022 automatically resolves and invokes the transfer hook from
/// the accounts appended to the transaction instruction by the caller.
#[derive(Accounts)]
pub struct Seize<'info> {
    /// The seizer (must hold Seizer role)
    pub seizer: Signer<'info>,

    /// Stablecoin config PDA — registered as permanent delegate on the mint
    #[account(
        seeds = [b"stablecoin_config", config.mint.as_ref()],
        bump = config.bump,
    )]
    pub config: Account<'info, StablecoinConfig>,

    /// Seizer role PDA
    #[account(
        seeds = [
            b"role",
            config.mint.as_ref(),
            seizer.key().as_ref(),
            &[RoleType::Seizer as u8],
        ],
        bump = role_account.bump,
        constraint = role_account.is_active @ StablecoinError::Unauthorized,
        constraint = role_account.role_type == RoleType::Seizer @ StablecoinError::Unauthorized,
    )]
    pub role_account: Account<'info, RoleAccount>,

    /// Token-2022 mint
    #[account(address = config.mint)]
    pub mint: InterfaceAccount<'info, Mint>,

    /// Token account to seize from
    #[account(
        mut,
        token::mint = mint,
    )]
    pub source_token_account: InterfaceAccount<'info, TokenAccount>,

    /// Treasury token account to receive seized tokens
    #[account(
        mut,
        token::mint = mint,
    )]
    pub treasury_token_account: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
}

pub fn handler_seize(ctx: Context<Seize>, amount: u64) -> Result<()> {
    require!(
        ctx.accounts.config.enable_permanent_delegate,
        StablecoinError::ComplianceNotEnabled
    );

    let mint_key = ctx.accounts.config.mint;
    let seeds: &[&[u8]] = &[
        b"stablecoin_config",
        mint_key.as_ref(),
        &[ctx.accounts.config.bump],
    ];
    let signer_seeds: &[&[&[u8]]] = &[seeds];

    let cpi = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        TransferChecked {
            from: ctx.accounts.source_token_account.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.treasury_token_account.to_account_info(),
            authority: ctx.accounts.config.to_account_info(),
        },
        signer_seeds,
    );
    token_interface::transfer_checked(cpi, amount, ctx.accounts.config.decimals)?;

    msg!(
        "Seized {} from {} to {}",
        amount,
        ctx.accounts.source_token_account.key(),
        ctx.accounts.treasury_token_account.key()
    );
    Ok(())
}
