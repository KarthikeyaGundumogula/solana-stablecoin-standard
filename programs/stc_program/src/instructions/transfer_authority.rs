use anchor_lang::prelude::*;

use crate::errors::StablecoinError;
use crate::state::*;

/// Transfer the master authority to a new wallet.
#[derive(Accounts)]
pub struct TransferAuthority<'info> {
    /// Current master authority
    pub authority: Signer<'info>,

    /// The stablecoin config PDA
    #[account(
        mut,
        seeds = [b"stablecoin_config", config.mint.as_ref()],
        bump = config.bump,
        constraint = config.master_authority == authority.key() @ StablecoinError::Unauthorized,
    )]
    pub config: Account<'info, StablecoinConfig>,

    /// The new master authority
    /// CHECK: This is the new authority being assigned
    pub new_authority: UncheckedAccount<'info>,
}

pub fn handler_transfer_authority(ctx: Context<TransferAuthority>) -> Result<()> {
    let old = ctx.accounts.config.master_authority;
    ctx.accounts.config.master_authority = ctx.accounts.new_authority.key();

    msg!(
        "Master authority transferred from {} to {}",
        old,
        ctx.accounts.new_authority.key()
    );
    Ok(())
}
