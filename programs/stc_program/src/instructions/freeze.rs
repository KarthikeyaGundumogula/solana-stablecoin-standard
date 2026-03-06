use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke_signed;
use anchor_spl::token_2022::spl_token_2022::{
    self,
    instruction::{freeze_account, thaw_account},
};

use crate::errors::StablecoinError;
use crate::state::*;

// ============================================================
// freeze_account
// ============================================================

#[derive(Accounts)]
pub struct FreezeAccount<'info> {
    /// The authority executing the freeze (must be master authority)
    #[account(mut)]
    pub authority: Signer<'info>,

    /// The stablecoin config PDA (freeze authority)
    #[account(
        seeds = [b"stablecoin_config", config.mint.as_ref()],
        bump = config.bump,
        constraint = config.master_authority == authority.key() @ StablecoinError::Unauthorized,
    )]
    pub config: Account<'info, StablecoinConfig>,

    /// The Token-2022 mint
    /// CHECK: Validated via config.mint
    #[account(address = config.mint)]
    pub mint: UncheckedAccount<'info>,

    /// The token account to freeze
    /// CHECK: Validated by the token program
    #[account(mut)]
    pub token_account: UncheckedAccount<'info>,

    /// Token-2022 program
    /// CHECK: Token-2022 program ID
    #[account(address = spl_token_2022::ID)]
    pub token_program: UncheckedAccount<'info>,
}

pub fn handler_freeze(ctx: Context<FreezeAccount>) -> Result<()> {
    let config = &ctx.accounts.config;
    require!(!config.is_paused, StablecoinError::Paused);

    let mint_key = config.mint;
    let seeds: &[&[u8]] = &[b"stablecoin_config", mint_key.as_ref(), &[config.bump]];
    let signer_seeds = &[seeds];

    invoke_signed(
        &freeze_account(
            &spl_token_2022::ID,
            ctx.accounts.token_account.key,
            ctx.accounts.mint.key,
            &ctx.accounts.config.key(), // freeze authority = config PDA
            &[],
        )?,
        &[
            ctx.accounts.token_account.to_account_info(),
            ctx.accounts.mint.to_account_info(),
            ctx.accounts.config.to_account_info(),
        ],
        signer_seeds,
    )?;

    msg!("Froze account {}", ctx.accounts.token_account.key());
    Ok(())
}

// ============================================================
// thaw_account
// ============================================================

#[derive(Accounts)]
pub struct ThawAccount<'info> {
    /// The authority executing the thaw (must be master authority)
    #[account(mut)]
    pub authority: Signer<'info>,

    /// The stablecoin config PDA (freeze authority)
    #[account(
        seeds = [b"stablecoin_config", config.mint.as_ref()],
        bump = config.bump,
        constraint = config.master_authority == authority.key() @ StablecoinError::Unauthorized,
    )]
    pub config: Account<'info, StablecoinConfig>,

    /// The Token-2022 mint
    /// CHECK: Validated via config.mint
    #[account(address = config.mint)]
    pub mint: UncheckedAccount<'info>,

    /// The token account to thaw
    /// CHECK: Validated by the token program
    #[account(mut)]
    pub token_account: UncheckedAccount<'info>,

    /// Token-2022 program
    /// CHECK: Token-2022 program ID
    #[account(address = spl_token_2022::ID)]
    pub token_program: UncheckedAccount<'info>,
}

pub fn handler_thaw(ctx: Context<ThawAccount>) -> Result<()> {
    let config = &ctx.accounts.config;

    let mint_key = config.mint;
    let seeds: &[&[u8]] = &[b"stablecoin_config", mint_key.as_ref(), &[config.bump]];
    let signer_seeds = &[seeds];

    invoke_signed(
        &thaw_account(
            &spl_token_2022::ID,
            ctx.accounts.token_account.key,
            ctx.accounts.mint.key,
            &ctx.accounts.config.key(), // freeze authority = config PDA
            &[],
        )?,
        &[
            ctx.accounts.token_account.to_account_info(),
            ctx.accounts.mint.to_account_info(),
            ctx.accounts.config.to_account_info(),
        ],
        signer_seeds,
    )?;

    msg!("Thawed account {}", ctx.accounts.token_account.key());
    Ok(())
}
