use anchor_lang::prelude::msg;
use litesvm_token::CreateAssociatedTokenAccount;
use solana_sdk::{pubkey::Pubkey, signer::Signer};

use crate::{
    builders::*,
    common::setup::Setup,
    helpers::{send_transaction, send_transaction_expect_fail},
    ToAddress, ToPubkey, MINTER_QUOTA, MINT_AMOUNT, MINT_DECIMALS, TOKEN_2022_PROGRAM_ID,
};

#[test]
fn test_transfer_hook_blocks_blacklisted_destination() {
    use anchor_spl::token_2022::spl_token_2022::{
        extension::StateWithExtensionsOwned, instruction::transfer_checked, state::Account,
    };
    use solana_sdk::{instruction::Instruction, message::AccountMeta};

    let mut setup = Setup::new();
    let authority = setup.authority.pubkey().to_pubkey();

    let hook_program_id = transfer_hook_program_id();
    let init_ix = initialize_sss2_builder(&setup, &hook_program_id);
    send_transaction(
        &[init_ix],
        &mut setup.svm,
        &[
            setup.authority.insecure_clone(),
            setup.mint_signer.insecure_clone(),
        ],
        authority,
    );
    msg!("SSS-2 initialized");

    let init_metas = init_hook_meta_builder(&setup);
    send_transaction(
        &[init_metas],
        &mut setup.svm,
        &[setup.authority.insecure_clone()],
        authority,
    );

    msg!("metas initialized");

    let minter_pubkey = setup.minter.pubkey().to_pubkey();
    send_transaction(
        &[update_minter_builder(
            &setup,
            &minter_pubkey,
            true,
            MINTER_QUOTA,
        )],
        &mut setup.svm,
        &[setup.authority.insecure_clone()],
        authority,
    );
    msg!("minter role assigned");

    let blacklister_pubkey = setup.blacklister.pubkey().to_pubkey();
    send_transaction(
        &[update_roles_builder(
            &setup,
            &blacklister_pubkey,
            stc_program::RoleType::Blacklister,
            true,
        )],
        &mut setup.svm,
        &[setup.authority.insecure_clone()],
        authority,
    );
    msg!("blacklister role assigned");

    let sender_ata = CreateAssociatedTokenAccount::new(
        &mut setup.svm,
        &setup.authority.insecure_clone(),
        &setup.mint,
    )
    .owner(&setup.minter.pubkey())
    .token_program_id(&TOKEN_2022_PROGRAM_ID.to_address())
    .send()
    .expect("Failed to create sender ATA");

    let receiver_ata = CreateAssociatedTokenAccount::new(
        &mut setup.svm,
        &setup.authority.insecure_clone(),
        &setup.mint,
    )
    .owner(&setup.user.pubkey())
    .token_program_id(&TOKEN_2022_PROGRAM_ID.to_address())
    .send()
    .expect("Failed to create receiver ATA");

    let mint_ix = mint_builder(&setup, &sender_ata.to_pubkey(), MINT_AMOUNT);
    send_transaction(
        &[mint_ix],
        &mut setup.svm,
        &[setup.minter.insecure_clone()],
        setup.minter.pubkey().to_pubkey(),
    );
    msg!("minted {} tokens to sender", MINT_AMOUNT);

    let (sender_blacklist_pda, _) = Pubkey::find_program_address(
        &[
            b"blacklist",
            setup.mint.as_ref(),
            setup.minter.pubkey().as_ref(),
        ],
        &stc_program::ID.to_address(),
    );

    let (receiver_blacklist_pda, _) = Pubkey::find_program_address(
        &[
            b"blacklist",
            setup.mint.as_ref(),
            setup.user.pubkey().as_ref(),
        ],
        &stc_program::ID.to_address(),
    );

    fn build_transfer_ix(
        amount: u64,
        sender_ata: &Pubkey,
        receiver_ata: &Pubkey,
        sender_blacklist_pda: &Pubkey,
        receiver_blacklist_pda: &Pubkey,
        setup: &Setup,
    ) -> Instruction {
        let raw = transfer_checked(
            &TOKEN_2022_PROGRAM_ID,
            &sender_ata.to_pubkey(),
            &setup.mint.to_pubkey(),
            &receiver_ata.to_pubkey(),
            &setup.minter.pubkey().to_pubkey(),
            &[],
            amount,
            MINT_DECIMALS,
        )
        .expect("Failed to build transfer_checked");

        let mut ix = Instruction {
            program_id: raw.program_id.to_address(),
            accounts: raw
                .accounts
                .into_iter()
                .map(|meta| AccountMeta {
                    pubkey: meta.pubkey.to_address(),
                    is_signer: meta.is_signer,
                    is_writable: meta.is_writable,
                })
                .collect(),
            data: raw.data,
        };
        ix.accounts.push(AccountMeta {
            pubkey: transfer_hook_program_id().to_address(),
            is_signer: false,
            is_writable: false,
        });

        ix.accounts.push(AccountMeta {
            pubkey: setup.extra_meta_pda(),
            is_signer: false,
            is_writable: false,
        });

        ix.accounts.push(AccountMeta {
            pubkey: stc_program::ID.to_address(),
            is_signer: false,
            is_writable: false,
        });

        ix.accounts.push(AccountMeta {
            pubkey: *sender_blacklist_pda,
            is_signer: false,
            is_writable: false,
        });

        ix.accounts.push(AccountMeta {
            pubkey: *receiver_blacklist_pda,
            is_signer: false,
            is_writable: false,
        });

        ix
    }

    send_transaction(
        &[build_transfer_ix(
            MINT_AMOUNT / 2,
            &sender_ata,
            &receiver_ata,
            &sender_blacklist_pda,
            &receiver_blacklist_pda,
            &setup,
        )],
        &mut setup.svm,
        &[setup.minter.insecure_clone()],
        setup.minter.pubkey().to_pubkey(),
    );
    msg!("✅ Transfer to non-blacklisted destination succeeded (expected)");

    let receiver_pubkey = setup.user.pubkey().to_pubkey();
    let blacklist_ix = add_to_blacklist_builder(&setup, &receiver_pubkey);
    send_transaction(
        &[blacklist_ix],
        &mut setup.svm,
        &[setup.blacklister.insecure_clone()],
        setup.blacklister.pubkey().to_pubkey(),
    );
    msg!("receiver blacklisted");

    send_transaction_expect_fail(
        &[build_transfer_ix(
            MINT_AMOUNT / 4,
            &sender_ata,
            &receiver_ata,
            &sender_blacklist_pda,
            &receiver_blacklist_pda,
            &setup,
        )],
        &mut setup.svm,
        &[setup.minter.insecure_clone()],
        setup.minter.pubkey().to_pubkey(),
    );
    msg!("✅ Transfer to blacklisted destination correctly rejected by transfer hook");

    let sender_raw = setup.svm.get_account(&sender_ata).unwrap();
    let sender_state = StateWithExtensionsOwned::<Account>::unpack(sender_raw.data).unwrap();
    assert_eq!(
        sender_state.base.amount,
        MINT_AMOUNT / 2,
        "Sender balance must be unchanged after the rejected transfer"
    );
    msg!("✅ Sender balance unchanged — no tokens leaked through rejected transfer");
}
