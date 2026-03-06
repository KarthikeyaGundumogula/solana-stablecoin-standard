use anchor_lang::prelude::*;

use crate::errors::StablecoinError;
use crate::state::*;

// ============================================================
// pause
// ============================================================

#[derive(Accounts)]
pub struct Pause<'info> {
    /// The pauser (must hold Pauser role)
    pub pauser: Signer<'info>,

    /// The stablecoin config PDA
    #[account(
        mut,
        seeds = [b"stablecoin_config", config.mint.as_ref()],
        bump = config.bump,
    )]
    pub config: Account<'info, StablecoinConfig>,

    /// The pauser's role PDA
    #[account(
        seeds = [
            b"role",
            config.mint.as_ref(),
            pauser.key().as_ref(),
            &[RoleType::Pauser as u8],
        ],
        bump = role_account.bump,
        constraint = role_account.is_active @ StablecoinError::Unauthorized,
        constraint = role_account.role_type == RoleType::Pauser @ StablecoinError::Unauthorized,
    )]
    pub role_account: Account<'info, RoleAccount>,
}

pub fn handler_pause(ctx: Context<Pause>) -> Result<()> {
    ctx.accounts.config.is_paused = true;
    msg!("Token paused");
    Ok(())
}

// ============================================================
// unpause
// ============================================================

#[derive(Accounts)]
pub struct Unpause<'info> {
    /// The pauser (must hold Pauser role)
    pub pauser: Signer<'info>,

    /// The stablecoin config PDA
    #[account(
        mut,
        seeds = [b"stablecoin_config", config.mint.as_ref()],
        bump = config.bump,
    )]
    pub config: Account<'info, StablecoinConfig>,

    /// The pauser's role PDA
    #[account(
        seeds = [
            b"role",
            config.mint.as_ref(),
            pauser.key().as_ref(),
            &[RoleType::Pauser as u8],
        ],
        bump = role_account.bump,
        constraint = role_account.is_active @ StablecoinError::Unauthorized,
        constraint = role_account.role_type == RoleType::Pauser @ StablecoinError::Unauthorized,
    )]
    pub role_account: Account<'info, RoleAccount>,
}

pub fn handler_unpause(ctx: Context<Unpause>) -> Result<()> {
    ctx.accounts.config.is_paused = false;
    msg!("Token unpaused");
    Ok(())
}
