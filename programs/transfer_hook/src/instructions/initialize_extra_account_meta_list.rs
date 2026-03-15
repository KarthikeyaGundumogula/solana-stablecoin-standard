use anchor_lang::prelude::*;
use anchor_lang::system_program;
use spl_tlv_account_resolution::{
    account::ExtraAccountMeta, seeds::Seed, state::ExtraAccountMetaList,
};
use spl_transfer_hook_interface::instruction::ExecuteInstruction;

/// Initializes the ExtraAccountMetaList PDA explaining which extra accounts
/// Token-2022 should resolve and pass when calling execute().
#[derive(Accounts)]
pub struct InitializeExtraAccountMetaList<'info> {
    /// Payer for the PDA creation
    #[account(mut)]
    pub payer: Signer<'info>,

    /// The ExtraAccountMetaList PDA.
    /// Derived from: ["extra-account-metas", mint]
    /// CHECK: Initialized in this instruction
    #[account(
        mut,
        seeds = [b"extra-account-metas", mint.key().as_ref()],
        bump,
        seeds::program = crate::ID,
    )]
    pub extra_account_meta_list: UncheckedAccount<'info>,

    /// The Token-2022 mint this hook is configured for
    /// CHECK: The mint address
    pub mint: UncheckedAccount<'info>,

    /// The stc_program (for deriving blacklist PDA seeds)
    /// CHECK: Validated as stc_program ID
    #[account(address = stc_program::ID)]
    pub stc_program_id: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler_init_extra_metas(ctx: Context<InitializeExtraAccountMetaList>) -> Result<()> {
    // Define the extra accounts that Token-2022 should resolve:
    // 1. source_blacklist_entry PDA on stc_program
    // 2. destination_blacklist_entry PDA on stc_program
    // 3. stc_program itself

    let extra_account_metas = vec![
        // stc_program itself
        ExtraAccountMeta::new_with_pubkey(&ctx.accounts.stc_program_id.key().to_bytes().into(), false, false).unwrap(),
        // source_blacklist_entry: PDA("blacklist", mint, source_authority) on stc_program
        ExtraAccountMeta::new_external_pda_with_seeds(
            5, // stc_program_id index (index of stc_program in our execute accounts)
            &[
                Seed::Literal {
                    bytes: b"blacklist".to_vec(),
                },
                Seed::AccountKey { index: 1 }, // mint
                Seed::AccountKey { index: 3 }, // source_authority
            ],
            false, // is_signer
            false, // is_writable
        ).unwrap(),
        // destination_blacklist_entry: PDA("blacklist", mint, destination_owner) on stc_program
        // Note: destination_owner needs to be resolved from the ATA data
        ExtraAccountMeta::new_external_pda_with_seeds(
            5, // stc_program_id index
            &[
                Seed::Literal {
                    bytes: b"blacklist".to_vec(),
                },
                Seed::AccountKey { index: 1 }, // mint
                Seed::AccountData {
                    account_index: 2, // destination_token_account (ATA)
                    data_index: 32,   // owner field offset in SPL Token account layout
                    length: 32,       // Pubkey size
                },
            ],
            false,
            false,
        ).unwrap(),
    ];

    // Calculate the size and create the account
    let account_size = ExtraAccountMetaList::size_of(extra_account_metas.len()).unwrap();
    let lamports = Rent::get()?.minimum_balance(account_size);

    let mint_key = ctx.accounts.mint.key();
    let signer_seeds: &[&[u8]] = &[
        b"extra-account-metas",
        mint_key.as_ref(),
        &[ctx.bumps.extra_account_meta_list],
    ];

    // Create the PDA account
    system_program::create_account(
        CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            system_program::CreateAccount {
                from: ctx.accounts.payer.to_account_info(),
                to: ctx.accounts.extra_account_meta_list.to_account_info(),
            },
            &[signer_seeds],
        ),
        lamports,
        account_size as u64,
        &crate::ID,
    )?;

    // Initialize the account data with the extra metas
    let mut data = ctx.accounts.extra_account_meta_list.try_borrow_mut_data()?;
    ExtraAccountMetaList::init::<ExecuteInstruction>(&mut data, &extra_account_metas)
        .map_err(|_| ProgramError::InvalidAccountData)?;

    msg!(
        "ExtraAccountMetaList initialized with {} extra accounts",
        extra_account_metas.len()
    );
    Ok(())
}
