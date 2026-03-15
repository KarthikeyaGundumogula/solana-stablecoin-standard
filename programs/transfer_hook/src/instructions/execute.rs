use anchor_lang::prelude::*;

use crate::error::TransferHookError;

/// Called automatically by Token-2022 on every transfer.
/// Checks both source and destination owners against blacklist PDAs.
#[derive(Accounts)]
pub struct Execute<'info> {
    /// Source token account
    /// CHECK: Passed by Token-2022
    pub source_token_account: UncheckedAccount<'info>,

    /// Mint
    /// CHECK: Passed by Token-2022
    pub mint: UncheckedAccount<'info>,

    /// Destination token account
    /// CHECK: Passed by Token-2022
    pub destination_token_account: UncheckedAccount<'info>,

    /// Source authority (owner or delegate)
    /// CHECK: Passed by Token-2022
    pub source_authority: UncheckedAccount<'info>,

    /// Extra account meta list PDA
    /// CHECK: Passed by Token-2022
    pub extra_account_meta_list: UncheckedAccount<'info>,

    // ---- Extra accounts resolved by Token-2022 from the meta list ---- //
    /// The stc_program
    /// CHECK: Validated as stc_program ID
    #[account(address = stc_program::ID)]
    pub stc_program_id: UncheckedAccount<'info>,
    /// Blacklist PDA for the source owner.
    /// Derived: ["blacklist", mint, source_authority] on stc_program.
    /// If the account exists and is owned by stc_program, the source is blacklisted.
    /// CHECK: We only check existence and ownership.
    pub source_blacklist_entry: UncheckedAccount<'info>,

    /// Blacklist PDA for the destination owner.
    /// Derived: ["blacklist", mint, destination_owner] on stc_program.
    /// CHECK: We only check existence and ownership.
    pub destination_blacklist_entry: UncheckedAccount<'info>,
}

pub fn handler_execute(ctx: Context<Execute>, _amount: u64) -> Result<()> {
    // Check if source owner is blacklisted
    let source_bl = &ctx.accounts.source_blacklist_entry;
    if source_bl.data_len() > 0 && source_bl.owner == &stc_program::ID {
        msg!(
            "Transfer blocked: source {} is blacklisted",
            ctx.accounts.source_authority.key()
        );
        return Err(TransferHookError::SourceBlacklisted.into());
    }

    // Check if destination owner is blacklisted
    let dest_bl = &ctx.accounts.destination_blacklist_entry;
    if dest_bl.data_len() > 0 && dest_bl.owner == &stc_program::ID {
        msg!("Transfer blocked: destination is blacklisted");
        return Err(TransferHookError::DestinationBlacklisted.into());
    }

    msg!("Transfer hook: OK");
    Ok(())
}
