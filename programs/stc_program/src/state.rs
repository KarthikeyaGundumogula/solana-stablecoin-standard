use anchor_lang::prelude::*;

/// The main configuration account for a stablecoin deployment.
/// Seeded: ["stablecoin_config", mint.key()]
#[account]
#[derive(InitSpace)]
pub struct StablecoinConfig {
    /// The mint address this config governs
    pub mint: Pubkey,
    /// Master authority — can reassign all other roles
    pub master_authority: Pubkey,
    /// Token decimals
    pub decimals: u8,
    /// Whether the token is currently paused (no mints, burns, or transfers)
    pub is_paused: bool,

    // ---- SSS-2 Compliance Flags ----
    /// Whether permanent delegate is enabled (allows seize)
    pub enable_permanent_delegate: bool,
    /// Whether transfer hook is enabled (blacklist enforcement)
    pub enable_transfer_hook: bool,

    /// Bump seed for this PDA
    pub bump: u8,
}

/// Role types supported by the program
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace, Debug)]
#[repr(u8)]
pub enum RoleType {
    Minter = 0,
    Burner = 1,
    Pauser = 2,
    Blacklister = 3,
    Seizer = 4,
}

impl RoleType {
    pub fn to_seed(&self) -> [u8; 1] {
        [*self as u8]
    }
}

/// A role assignment PDA.
/// Seeded: ["role", mint.key(), assignee.key(), &[role_type as u8]]
#[account]
#[derive(InitSpace)]
pub struct RoleAccount {
    /// The mint this role is associated with
    pub mint: Pubkey,
    /// The wallet that holds this role
    pub assignee: Pubkey,
    /// The type of role
    pub role_type: RoleType,
    /// Whether this role is currently active
    pub is_active: bool,
    /// Bump seed for this PDA
    pub bump: u8,
}

/// Extended minter data — tracks per-minter quotas.
/// Seeded: ["minter_quota", mint.key(), minter.key()]
#[account]
#[derive(InitSpace)]
pub struct MinterQuota {
    /// The mint this quota applies to
    pub mint: Pubkey,
    /// The minter wallet
    pub minter: Pubkey,
    /// Maximum amount this minter is allowed to mint (lifetime or resettable)
    pub quota_limit: u64,
    /// Amount already minted against the quota
    pub minted_amount: u64,
    /// Bump seed for this PDA
    pub bump: u8,
}

/// A blacklist entry PDA (SSS-2 only).
/// Seeded: ["blacklist", mint.key(), blacklisted_address.key()]
#[account]
#[derive(InitSpace)]
pub struct BlacklistEntry {
    /// The mint this blacklist entry is associated with
    pub mint: Pubkey,
    /// The blacklisted wallet address
    pub blacklisted_address: Pubkey,
    /// Bump seed for this PDA
    pub bump: u8,
}
