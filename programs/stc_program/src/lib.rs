pub mod errors;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use instructions::*;
pub use state::*;

declare_id!("3nqtxhZZdpV5W2TPaa1hbWbeM3bhhsMg3Fy9oLdAHKfH");

#[program]
pub mod stc_program {
    use super::*;

    // ============================================================
    // Core Instructions (All Presets — SSS-1 & SSS-2)
    // ============================================================

    /// Initialize a new stablecoin with Token-2022 extensions.
    pub fn initialize(ctx: Context<Initialize>, args: InitializeArgs) -> Result<()> {
        instructions::initialize::handler_initialize(ctx, args)
    }

    /// Mint tokens to a recipient. Requires Minter role with quota.
    pub fn mint(ctx: Context<MintTokens>, amount: u64) -> Result<()> {
        instructions::mint::handler_mint(ctx, amount)
    }

    /// Burn tokens from a token account. Requires Burner role.
    pub fn burn(ctx: Context<BurnTokens>, amount: u64) -> Result<()> {
        instructions::burn::handler_burn(ctx, amount)
    }

    /// Freeze a token account. Requires master authority.
    pub fn freeze_account(ctx: Context<FreezeAccount>) -> Result<()> {
        instructions::freeze::handler_freeze(ctx)
    }

    /// Thaw a frozen token account. Requires master authority.
    pub fn thaw_account(ctx: Context<ThawAccount>) -> Result<()> {
        instructions::freeze::handler_thaw(ctx)
    }

    /// Pause all operations. Requires Pauser role.
    pub fn pause(ctx: Context<Pause>) -> Result<()> {
        instructions::pause::handler_pause(ctx)
    }

    /// Unpause operations. Requires Pauser role.
    pub fn unpause(ctx: Context<Unpause>) -> Result<()> {
        instructions::pause::handler_unpause(ctx)
    }

    /// Assign or revoke a minter role with quota. Requires master authority.
    pub fn update_minter(
        ctx: Context<UpdateMinter>,
        is_active: bool,
        quota_limit: u64,
    ) -> Result<()> {
        instructions::roles::handler_update_minter(ctx, is_active, quota_limit)
    }

    /// Assign or revoke any role. Requires master authority.
    pub fn update_roles(ctx: Context<UpdateRoles>, args: UpdateRolesArgs) -> Result<()> {
        instructions::roles::handler_update_roles(ctx, args)
    }

    /// Transfer the master authority to a new wallet. Requires current master authority.
    pub fn transfer_authority(ctx: Context<TransferAuthority>) -> Result<()> {
        instructions::transfer_authority::handler_transfer_authority(ctx)
    }

    // ============================================================
    // SSS-2 Additional Instructions (Compliance Module)
    // ============================================================

    /// Add an address to the blacklist. Requires Blacklister role. SSS-2 only.
    pub fn add_to_blacklist(ctx: Context<AddToBlacklist>) -> Result<()> {
        instructions::blacklist::handler_add_to_blacklist(ctx)
    }

    /// Remove an address from the blacklist. Requires Blacklister role. SSS-2 only.
    pub fn remove_from_blacklist(ctx: Context<RemoveFromBlacklist>) -> Result<()> {
        instructions::blacklist::handler_remove_from_blacklist(ctx)
    }

    /// Seize tokens from an account using permanent delegate. Requires Seizer role. SSS-2 only.
    pub fn seize(ctx: Context<Seize>, amount: u64) -> Result<()> {
        instructions::seize::handler_seize(ctx, amount)
    }
}
