use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke_signed;
use anchor_spl::token_2022::spl_token_2022::{self, instruction::transfer_checked};

use crate::errors::StablecoinError;
use crate::state::*;

/// Seize tokens from a frozen account using the permanent delegate (SSS-2 only).
/// This transfers tokens from the target account to the treasury without the owner's consent.
#[derive(Accounts)]
pub struct Seize<'info> {
    /// The seizer (must hold Seizer role)
    pub seizer: Signer<'info>,

    /// The stablecoin config PDA (permanent delegate)
    #[account(
        seeds = [b"stablecoin_config", config.mint.as_ref()],
        bump = config.bump,
    )]
    pub config: Account<'info, StablecoinConfig>,

    /// The seizer's role PDA
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

    /// The Token-2022 mint
    /// CHECK: Validated via config.mint
    #[account(address = config.mint)]
    pub mint: UncheckedAccount<'info>,

    /// The token account to seize from
    /// CHECK: Validated by the token program during transfer CPI
    #[account(mut)]
    pub source_token_account: UncheckedAccount<'info>,

    /// The treasury token account to transfer seized tokens to
    /// CHECK: Validated by the token program during transfer CPI
    #[account(mut)]
    pub treasury_token_account: UncheckedAccount<'info>,

    /// Token-2022 program
    /// CHECK: Token-2022 program ID
    #[account(address = spl_token_2022::ID)]
    pub token_program: UncheckedAccount<'info>,
}

pub fn handler_seize(ctx: Context<Seize>, amount: u64) -> Result<()> {
    let config = &ctx.accounts.config;

    // SSS-2 compliance check — must fail gracefully if permanent delegate not enabled
    require!(
        config.enable_permanent_delegate,
        StablecoinError::ComplianceNotEnabled
    );

    let mint_key = config.mint;
    let seeds: &[&[u8]] = &[b"stablecoin_config", mint_key.as_ref(), &[config.bump]];
    let signer_seeds = &[seeds];

    // The config PDA is the permanent delegate, so it can transfer
    // tokens out of any account without owner consent.
    invoke_signed(
        &transfer_checked(
            &spl_token_2022::ID,
            ctx.accounts.source_token_account.key,
            ctx.accounts.mint.key,
            ctx.accounts.treasury_token_account.key,
            &ctx.accounts.config.key(), // permanent delegate = config PDA
            &[],
            amount,
            config.decimals,
        )?,
        &[
            ctx.accounts.source_token_account.to_account_info(),
            ctx.accounts.mint.to_account_info(),
            ctx.accounts.treasury_token_account.to_account_info(),
            ctx.accounts.config.to_account_info(),
        ],
        signer_seeds,
    )?;

    msg!(
        "Seized {} tokens from {} to treasury {}",
        amount,
        ctx.accounts.source_token_account.key(),
        ctx.accounts.treasury_token_account.key()
    );
    Ok(())
}
