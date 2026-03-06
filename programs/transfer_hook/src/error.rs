use anchor_lang::prelude::*;

#[error_code]
pub enum TransferHookError {
    #[msg("Transfer blocked: source address is blacklisted.")]
    SourceBlacklisted,

    #[msg("Transfer blocked: destination address is blacklisted.")]
    DestinationBlacklisted,
}
