use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke_signed;
use anchor_spl::token_2022::spl_token_2022::{self, instruction::mint_to};

use crate::errors::StablecoinError;
use crate::state::*;

#[derive(Accounts)]
pub struct MintTokens<'info> {
    /// The minter (must hold Minter role)
    #[account(mut)]
    pub minter: Signer<'info>,

    /// The stablecoin config PDA (mint authority)
    #[account(
        seeds = [b"stablecoin_config", config.mint.as_ref()],
        bump = config.bump,
    )]
    pub config: Account<'info, StablecoinConfig>,

    /// The minter's role PDA — verifies they are authorized
    #[account(
        seeds = [
            b"role",
            config.mint.as_ref(),
            minter.key().as_ref(),
            &[RoleType::Minter as u8],
        ],
        bump = role_account.bump,
        constraint = role_account.is_active @ StablecoinError::Unauthorized,
        constraint = role_account.role_type == RoleType::Minter @ StablecoinError::Unauthorized,
    )]
    pub role_account: Account<'info, RoleAccount>,

    /// The minter's quota PDA — tracks usage
    #[account(
        mut,
        seeds = [b"minter_quota", config.mint.as_ref(), minter.key().as_ref()],
        bump = minter_quota.bump,
    )]
    pub minter_quota: Account<'info, MinterQuota>,

    /// The Token-2022 mint account
    /// CHECK: Validated via config.mint constraint
    #[account(
        mut,
        address = config.mint,
    )]
    pub mint: UncheckedAccount<'info>,

    /// The recipient's token account
    /// CHECK: Validated by the token program during mint_to CPI
    #[account(mut)]
    pub recipient_token_account: UncheckedAccount<'info>,

    /// Token-2022 program
    /// CHECK: This is the Token-2022 program ID
    #[account(address = spl_token_2022::ID)]
    pub token_program: UncheckedAccount<'info>,
}

pub fn handler_mint(ctx: Context<MintTokens>, amount: u64) -> Result<()> {
    let config = &ctx.accounts.config;

    // Check not paused
    require!(!config.is_paused, StablecoinError::Paused);

    // Check minter quota
    let quota = &mut ctx.accounts.minter_quota;
    let new_minted = quota
        .minted_amount
        .checked_add(amount)
        .ok_or(StablecoinError::Overflow)?;
    require!(
        new_minted <= quota.quota_limit,
        StablecoinError::MinterQuotaExceeded
    );

    // CPI: mint_to via the config PDA (which is the mint authority)
    let mint_key = config.mint;
    let seeds: &[&[u8]] = &[b"stablecoin_config", mint_key.as_ref(), &[config.bump]];
    let signer_seeds = &[seeds];

    invoke_signed(
        &mint_to(
            &spl_token_2022::ID,
            ctx.accounts.mint.key,
            ctx.accounts.recipient_token_account.key,
            &ctx.accounts.config.key(), // mint authority = config PDA
            &[],
            amount,
        )?,
        &[
            ctx.accounts.mint.to_account_info(),
            ctx.accounts.recipient_token_account.to_account_info(),
            ctx.accounts.config.to_account_info(),
        ],
        signer_seeds,
    )?;

    // Update quota
    quota.minted_amount = new_minted;

    msg!(
        "Minted {} tokens to {}",
        amount,
        ctx.accounts.recipient_token_account.key()
    );
    Ok(())
}
