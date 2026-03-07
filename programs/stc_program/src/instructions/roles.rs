use anchor_lang::prelude::*;

use crate::errors::StablecoinError;
use crate::state::*;

// ============================================================
// update_roles — assign or revoke a role for a given wallet
// ============================================================

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct UpdateRolesArgs {
    pub role_type: RoleType,
    pub is_active: bool,
}

#[derive(Accounts)]
#[instruction(args: UpdateRolesArgs)]
pub struct UpdateRoles<'info> {
    /// Must be the master authority
    #[account(mut)]
    pub authority: Signer<'info>,

    /// The stablecoin config PDA
    #[account(
        seeds = [b"stablecoin_config", config.mint.as_ref()],
        bump = config.bump,
        constraint = config.master_authority == authority.key() @ StablecoinError::Unauthorized,
    )]
    pub config: Account<'info, StablecoinConfig>,

    /// The wallet being assigned or revoked a role
    /// CHECK: This is the assignee for the role. No specific validation needed.
    pub assignee: UncheckedAccount<'info>,

    /// The role PDA to create or update
    #[account(
        init_if_needed,
        payer = authority,
        space = 8 + RoleAccount::INIT_SPACE,
        seeds = [
            b"role",
            config.mint.as_ref(),
            assignee.key().as_ref(),
            &[args.role_type as u8],
        ],
        bump,
    )]
    pub role_account: Account<'info, RoleAccount>,

    pub system_program: Program<'info, System>,
}

pub fn handler_update_roles(ctx: Context<UpdateRoles>, args: UpdateRolesArgs) -> Result<()> {
    let config = &ctx.accounts.config;

    // SSS-2 roles require their respective compliance flags to be enabled
    match args.role_type {
        RoleType::Blacklister => {
            require!(
                config.enable_transfer_hook,
                StablecoinError::ComplianceNotEnabled
            );
        }
        RoleType::Seizer => {
            require!(
                config.enable_permanent_delegate,
                StablecoinError::ComplianceNotEnabled
            );
        }
        _ => {}
    }

    let role = &mut ctx.accounts.role_account;
    role.mint = config.mint;
    role.assignee = ctx.accounts.assignee.key();
    role.role_type = args.role_type;
    role.is_active = args.is_active;
    role.bump = ctx.bumps.role_account;

    msg!(
        "Role {:?} for {} set to active={}",
        args.role_type,
        ctx.accounts.assignee.key(),
        args.is_active
    );
    Ok(())
}

// ============================================================
// update_minter — assign minter role + quota in one instruction
// ============================================================

#[derive(Accounts)]
pub struct UpdateMinter<'info> {
    /// Must be the master authority
    #[account(mut)]
    pub authority: Signer<'info>,

    /// The stablecoin config PDA
    #[account(
        seeds = [b"stablecoin_config", config.mint.as_ref()],
        bump = config.bump,
        constraint = config.master_authority == authority.key() @ StablecoinError::Unauthorized,
    )]
    pub config: Account<'info, StablecoinConfig>,

    /// The minter wallet
    /// CHECK: assignee for the minter role
    pub minter: UncheckedAccount<'info>,

    /// The minter role PDA (always uses RoleType::Minter = 0)
    #[account(
        init_if_needed,
        payer = authority,
        space = 8 + RoleAccount::INIT_SPACE,
        seeds = [
            b"role",
            config.mint.as_ref(),
            minter.key().as_ref(),
            &[RoleType::Minter as u8],
        ],
        bump,
    )]
    pub role_account: Account<'info, RoleAccount>,

    /// The minter quota PDA
    #[account(
        init_if_needed,
        payer = authority,
        space = 8 + MinterQuota::INIT_SPACE,
        seeds = [b"minter_quota", config.mint.as_ref(), minter.key().as_ref()],
        bump,
    )]
    pub minter_quota: Account<'info, MinterQuota>,

    pub system_program: Program<'info, System>,
}

pub fn handler_update_minter(
    ctx: Context<UpdateMinter>,
    is_active: bool,
    quota_limit: u64,
) -> Result<()> {
    let config = &ctx.accounts.config;

    // Set up role
    let role = &mut ctx.accounts.role_account;
    role.mint = config.mint;
    role.assignee = ctx.accounts.minter.key();
    role.role_type = RoleType::Minter;
    role.is_active = is_active;
    role.bump = ctx.bumps.role_account;

    // Set up quota
    let quota = &mut ctx.accounts.minter_quota;
    quota.mint = config.mint;
    quota.minter = ctx.accounts.minter.key();
    quota.quota_limit = quota_limit;
    // Do not reset minted_amount — preserves existing usage
    quota.bump = ctx.bumps.minter_quota;

    msg!(
        "Minter {} set: active={}, quota={}",
        ctx.accounts.minter.key(),
        is_active,
        quota_limit
    );
    Ok(())
}
