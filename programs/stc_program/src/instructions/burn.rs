use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke_signed;
use anchor_spl::token_2022::spl_token_2022::{self, instruction::burn};

use crate::errors::StablecoinError;
use crate::state::*;

#[derive(Accounts)]
pub struct BurnTokens<'info> {
    /// The burner (must hold Burner role)
    #[account(mut)]
    pub burner: Signer<'info>,

    /// The stablecoin config PDA
    #[account(
        seeds = [b"stablecoin_config", config.mint.as_ref()],
        bump = config.bump,
    )]
    pub config: Account<'info, StablecoinConfig>,

    /// The burner's role PDA
    #[account(
        seeds = [
            b"role",
            config.mint.as_ref(),
            burner.key().as_ref(),
            &[RoleType::Burner as u8],
        ],
        bump = role_account.bump,
        constraint = role_account.is_active @ StablecoinError::Unauthorized,
        constraint = role_account.role_type == RoleType::Burner @ StablecoinError::Unauthorized,
    )]
    pub role_account: Account<'info, RoleAccount>,

    /// The Token-2022 mint account
    /// CHECK: Validated via config.mint
    #[account(
        mut,
        address = config.mint,
    )]
    pub mint: UncheckedAccount<'info>,

    /// The token account to burn from (must be signer-owned or delegated)
    /// CHECK: Validated by the token program during burn CPI
    #[account(mut)]
    pub token_account: UncheckedAccount<'info>,

    /// The owner of the token account (the burner burns from their own account)
    /// CHECK: Validated by the token program
    pub token_account_owner: Signer<'info>,

    /// Token-2022 program
    /// CHECK: This is the Token-2022 program ID
    #[account(address = spl_token_2022::ID)]
    pub token_program: UncheckedAccount<'info>,
}

pub fn handler_burn(ctx: Context<BurnTokens>, amount: u64) -> Result<()> {
    let config = &ctx.accounts.config;
    require!(!config.is_paused, StablecoinError::Paused);

    invoke_signed(
        &burn(
            &spl_token_2022::ID,
            ctx.accounts.token_account.key,
            ctx.accounts.mint.key,
            ctx.accounts.token_account_owner.key,
            &[],
            amount,
        )?,
        &[
            ctx.accounts.token_account.to_account_info(),
            ctx.accounts.mint.to_account_info(),
            ctx.accounts.token_account_owner.to_account_info(),
        ],
        &[],
    )?;

    msg!(
        "Burned {} tokens from {}",
        amount,
        ctx.accounts.token_account.key()
    );
    Ok(())
}
