use anchor_lang::prelude::*;

use crate::errors::StablecoinError;
use crate::state::*;

// ============================================================
// add_to_blacklist (SSS-2 only)
// ============================================================

#[derive(Accounts)]
pub struct AddToBlacklist<'info> {
    /// The blacklister (must hold Blacklister role)
    #[account(mut)]
    pub blacklister: Signer<'info>,

    /// The stablecoin config PDA
    #[account(
        seeds = [b"stablecoin_config", config.mint.as_ref()],
        bump = config.bump,
    )]
    pub config: Account<'info, StablecoinConfig>,

    /// The blacklister's role PDA
    #[account(
        seeds = [
            b"role",
            config.mint.as_ref(),
            blacklister.key().as_ref(),
            &[RoleType::Blacklister as u8],
        ],
        bump = role_account.bump,
        constraint = role_account.is_active @ StablecoinError::Unauthorized,
        constraint = role_account.role_type == RoleType::Blacklister @ StablecoinError::Unauthorized,
    )]
    pub role_account: Account<'info, RoleAccount>,

    /// The address to blacklist
    /// CHECK: This is the wallet being blacklisted
    pub address_to_blacklist: UncheckedAccount<'info>,

    /// The blacklist entry PDA (created if it doesn't exist)
    #[account(
        init,
        payer = blacklister,
        space = 8 + BlacklistEntry::INIT_SPACE,
        seeds = [
            b"blacklist",
            config.mint.as_ref(),
            address_to_blacklist.key().as_ref(),
        ],
        bump,
    )]
    pub blacklist_entry: Account<'info, BlacklistEntry>,

    pub system_program: Program<'info, System>,
}

pub fn handler_add_to_blacklist(ctx: Context<AddToBlacklist>) -> Result<()> {
    let config = &ctx.accounts.config;

    // SSS-2 compliance check — must fail gracefully if not enabled
    require!(
        config.enable_transfer_hook,
        StablecoinError::ComplianceNotEnabled
    );

    let entry = &mut ctx.accounts.blacklist_entry;
    entry.mint = config.mint;
    entry.blacklisted_address = ctx.accounts.address_to_blacklist.key();
    entry.bump = ctx.bumps.blacklist_entry;

    msg!(
        "Added {} to blacklist",
        ctx.accounts.address_to_blacklist.key()
    );
    Ok(())
}

// ============================================================
// remove_from_blacklist (SSS-2 only)
// ============================================================

#[derive(Accounts)]
pub struct RemoveFromBlacklist<'info> {
    /// The blacklister (must hold Blacklister role)
    #[account(mut)]
    pub blacklister: Signer<'info>,

    /// The stablecoin config PDA
    #[account(
        seeds = [b"stablecoin_config", config.mint.as_ref()],
        bump = config.bump,
    )]
    pub config: Account<'info, StablecoinConfig>,

    /// The blacklister's role PDA
    #[account(
        seeds = [
            b"role",
            config.mint.as_ref(),
            blacklister.key().as_ref(),
            &[RoleType::Blacklister as u8],
        ],
        bump = role_account.bump,
        constraint = role_account.is_active @ StablecoinError::Unauthorized,
        constraint = role_account.role_type == RoleType::Blacklister @ StablecoinError::Unauthorized,
    )]
    pub role_account: Account<'info, RoleAccount>,

    /// The address to remove from blacklist
    /// CHECK: This is the wallet being removed from blacklist
    pub address_to_remove: UncheckedAccount<'info>,

    /// The blacklist entry PDA (will be closed / reclaimed)
    #[account(
        mut,
        close = blacklister,
        seeds = [
            b"blacklist",
            config.mint.as_ref(),
            address_to_remove.key().as_ref(),
        ],
        bump = blacklist_entry.bump,
    )]
    pub blacklist_entry: Account<'info, BlacklistEntry>,
}

pub fn handler_remove_from_blacklist(ctx: Context<RemoveFromBlacklist>) -> Result<()> {
    let config = &ctx.accounts.config;

    // SSS-2 compliance check
    require!(
        config.enable_transfer_hook,
        StablecoinError::ComplianceNotEnabled
    );

    msg!(
        "Removed {} from blacklist",
        ctx.accounts.address_to_remove.key()
    );
    Ok(())
}
