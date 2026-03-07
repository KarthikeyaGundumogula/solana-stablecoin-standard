use anchor_lang::prelude::*;
use anchor_spl::token_2022::Burn;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface};

use crate::errors::StablecoinError;
use crate::state::*;

#[derive(Accounts)]
pub struct BurnTokens<'info> {
    /// The burner (must hold Burner role)
    #[account(mut)]
    pub burner: Signer<'info>,

    /// Stablecoin config PDA
    #[account(
        seeds = [b"stablecoin_config", config.mint.as_ref()],
        bump = config.bump,
    )]
    pub config: Account<'info, StablecoinConfig>,

    /// Burner role PDA
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

    /// Token-2022 mint
    #[account(
        mut,
        address = config.mint,
    )]
    pub mint: InterfaceAccount<'info, Mint>,

    /// Token account to burn from
    #[account(
        mut,
        token::mint = mint,
        token::authority = token_account_owner,
    )]
    pub token_account: InterfaceAccount<'info, TokenAccount>,

    /// Owner of the token account — signs to authorise the burn
    pub token_account_owner: Signer<'info>,

    pub token_program: Interface<'info, TokenInterface>,
}

pub fn handler_burn(ctx: Context<BurnTokens>, amount: u64) -> Result<()> {
    require!(!ctx.accounts.config.is_paused, StablecoinError::Paused);

    let cpi = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Burn {
            mint: ctx.accounts.mint.to_account_info(),
            from: ctx.accounts.token_account.to_account_info(),
            authority: ctx.accounts.token_account_owner.to_account_info(),
        },
    );
    token_interface::burn(cpi, amount)?;

    msg!(
        "Burned {} from {}",
        amount,
        ctx.accounts.token_account.key()
    );
    Ok(())
}
