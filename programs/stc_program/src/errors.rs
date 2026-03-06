use anchor_lang::prelude::*;

#[error_code]
pub enum StablecoinError {
    #[msg("The token is currently paused.")]
    Paused,

    #[msg("Unauthorized: signer does not hold the required role.")]
    Unauthorized,

    #[msg("Minter quota exceeded.")]
    MinterQuotaExceeded,

    #[msg("Compliance module is not enabled for this token.")]
    ComplianceNotEnabled,

    #[msg("Address is already blacklisted.")]
    AlreadyBlacklisted,

    #[msg("Address is not blacklisted.")]
    NotBlacklisted,

    #[msg("Invalid role type for this operation.")]
    InvalidRoleType,

    #[msg("Role is already assigned.")]
    RoleAlreadyAssigned,

    #[msg("Arithmetic overflow.")]
    Overflow,

    #[msg("Cannot operate on the master authority with this instruction.")]
    CannotModifyMasterAuthority,
}
