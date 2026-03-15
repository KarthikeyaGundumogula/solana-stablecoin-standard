pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use instructions::*;

use spl_discriminator::SplDiscriminate;
use spl_transfer_hook_interface::instruction::ExecuteInstruction;
declare_id!("FtPdSNiQ8ieM4yE1V8FekUk7WDbgZrx9ehb3CyaXzHtG");

#[program]
pub mod transfer_hook {

    use super::*;

    /// Called by Token-2022 on every transfer. Checks both the source owner and
    /// destination owner against the blacklist PDAs managed by stc_program.
    /// If either is blacklisted, the transfer is rejected.
    #[instruction(discriminator = ExecuteInstruction::SPL_DISCRIMINATOR_SLICE)]
    pub fn execute(ctx: Context<Execute>, amount: u64) -> Result<()> {
        instructions::execute::handler_execute(ctx, amount)
    }

    /// Initialize the ExtraAccountMetaList PDA. This tells Token-2022
    /// which additional accounts to resolve and pass during transfers.
    pub fn initialize_extra_account_meta_list(
        ctx: Context<InitializeExtraAccountMetaList>,
    ) -> Result<()> {
        instructions::initialize_extra_account_meta_list::handler_init_extra_metas(ctx)
    }
}
