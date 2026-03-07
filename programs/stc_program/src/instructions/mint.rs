use anchor_lang::prelude::*;
use anchor_spl::token_2022::MintTo;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface};

use crate::errors::StablecoinError;
use crate::state::*;

#[derive(Accounts)]
pub struct MintTokens<'info> {
    /// The minter (must hold Minter role)
    #[account(mut)]
    pub minter: Signer<'info>,

    /// Stablecoin config PDA — is the mint authority
    #[account(
        seeds = [b"stablecoin_config", config.mint.as_ref()],
        bump = config.bump,
    )]
    pub config: Account<'info, StablecoinConfig>,

    /// Minter role PDA — verifies authorization
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

    /// Minter quota PDA — tracks usage against the limit
    #[account(
        mut,
        seeds = [b"minter_quota", config.mint.as_ref(), minter.key().as_ref()],
        bump = minter_quota.bump,
    )]
    pub minter_quota: Account<'info, MinterQuota>,

    /// Token-2022 mint (mint authority = config PDA)
    #[account(
        mut,
        address = config.mint,
    )]
    pub mint: InterfaceAccount<'info, Mint>,

    /// Recipient token account
    #[account(mut)]
    pub recipient_token_account: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
}

pub fn handler_mint(ctx: Context<MintTokens>, amount: u64) -> Result<()> {
    let config = &ctx.accounts.config;

    require!(!config.is_paused, StablecoinError::Paused);

    // Check and update quota
    let quota = &mut ctx.accounts.minter_quota;
    let new_minted = quota
        .minted_amount
        .checked_add(amount)
        .ok_or(StablecoinError::Overflow)?;
    require!(
        new_minted <= quota.quota_limit,
        StablecoinError::MinterQuotaExceeded
    );
    quota.minted_amount = new_minted;

    // CPI: mint_to signed by config PDA (mint authority)
    let mint_key = config.mint;
    let seeds: &[&[u8]] = &[b"stablecoin_config", mint_key.as_ref(), &[config.bump]];
    let signer_seeds: &[&[&[u8]]] = &[seeds];

    let cpi = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.recipient_token_account.to_account_info(),
            authority: ctx.accounts.config.to_account_info(),
        },
        signer_seeds,
    );
    token_interface::mint_to(cpi, amount)?;

    msg!(
        "Minted {} to {}",
        amount,
        ctx.accounts.recipient_token_account.key()
    );
    Ok(())
}
