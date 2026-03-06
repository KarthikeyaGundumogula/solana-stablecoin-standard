use anchor_lang::prelude::msg;
use litesvm_token::CreateAssociatedTokenAccount;
use solana_sdk::signer::Signer;

use crate::{
    builders::*,
    common::setup::Setup,
    helpers::{send_transaction, send_transaction_expect_fail},
    ToAddress, ToPubkey, MINTER_QUOTA, MINT_AMOUNT, TOKEN_2022_PROGRAM_ID,
};

// =============================================================
// SSS-2 Compliance Tests
// =============================================================

#[test]
fn test_initialize_sss2() {
    let setup = Setup::new();
    let authority = setup.authority.pubkey().to_pubkey();

    let ix = initialize_builder(&setup, true, true);
    send_transaction(
        &[ix],
        &mut setup.svm.clone(),
        &[
            setup.authority.insecure_clone(),
            setup.mint_signer.insecure_clone(),
        ],
        authority,
    );
    msg!("✅ SSS-2 Stablecoin initialized with compliance extensions");
}

#[test]
fn test_blacklist_flow() {
    let mut setup = Setup::new();
    let authority = setup.authority.pubkey().to_pubkey();

    // 1. Initialize SSS-2 stablecoin (with permanent delegate + transfer hook)
    let init_ix = initialize_builder(&setup, true, true);
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

    // 2. Assign Blacklister role
    let blacklister_pubkey = setup.blacklister.pubkey().to_pubkey();
    let role_ix = update_roles_builder(
        &setup,
        &blacklister_pubkey,
        stc_program::RoleType::Blacklister,
        true,
    );
    send_transaction(
        &[role_ix],
        &mut setup.svm,
        &[setup.authority.insecure_clone()],
        authority,
    );
    msg!("blacklister role assigned");

    // 3. Add user to blacklist
    let user_pubkey = setup.user.pubkey().to_pubkey();
    let blacklist_ix = add_to_blacklist_builder(&setup, &user_pubkey);
    send_transaction(
        &[blacklist_ix],
        &mut setup.svm,
        &[setup.blacklister.insecure_clone()],
        setup.blacklister.pubkey().to_pubkey(),
    );
    msg!("✅ User added to blacklist");
}

#[test]
fn test_sss2_roles_fail_on_sss1() {
    let mut setup = Setup::new();
    let authority = setup.authority.pubkey().to_pubkey();

    // 1. Initialize SSS-1 stablecoin (NO compliance)
    let init_ix = initialize_builder(&setup, false, false);
    send_transaction(
        &[init_ix],
        &mut setup.svm,
        &[
            setup.authority.insecure_clone(),
            setup.mint_signer.insecure_clone(),
        ],
        authority,
    );

    // 2. Try to assign Blacklister role on SSS-1 — should fail
    let blacklister_pubkey = setup.blacklister.pubkey().to_pubkey();
    let role_ix = update_roles_builder(
        &setup,
        &blacklister_pubkey,
        stc_program::RoleType::Blacklister,
        true,
    );
    send_transaction_expect_fail(
        &[role_ix],
        &mut setup.svm,
        &[setup.authority.insecure_clone()],
        authority,
    );
    msg!("✅ Blacklister role correctly rejected on SSS-1 config");

    // 3. Try to assign Seizer role on SSS-1 — should fail
    let seizer_pubkey = setup.seizer.pubkey().to_pubkey();
    let seizer_ix =
        update_roles_builder(&setup, &seizer_pubkey, stc_program::RoleType::Seizer, true);
    send_transaction_expect_fail(
        &[seizer_ix],
        &mut setup.svm,
        &[setup.authority.insecure_clone()],
        authority,
    );
    msg!("✅ Seizer role correctly rejected on SSS-1 config");
}

#[test]
fn test_sss2_full_compliance_flow() {
    let mut setup = Setup::new();
    let authority = setup.authority.pubkey().to_pubkey();

    // 1. Initialize SSS-2
    let init_ix = initialize_builder(&setup, true, true);
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

    // 2. Assign Minter
    let minter_pubkey = setup.minter.pubkey().to_pubkey();
    let minter_ix = update_minter_builder(&setup, &minter_pubkey, true, MINTER_QUOTA);
    send_transaction(
        &[minter_ix],
        &mut setup.svm,
        &[setup.authority.insecure_clone()],
        authority,
    );
    msg!("minter assigned");

    // 3. Assign Pauser
    let pauser_pubkey = setup.pauser.pubkey().to_pubkey();
    let pauser_ix =
        update_roles_builder(&setup, &pauser_pubkey, stc_program::RoleType::Pauser, true);
    send_transaction(
        &[pauser_ix],
        &mut setup.svm,
        &[setup.authority.insecure_clone()],
        authority,
    );
    msg!("pauser assigned");

    // 4. Assign Blacklister
    let blacklister_pubkey = setup.blacklister.pubkey().to_pubkey();
    let blacklister_ix = update_roles_builder(
        &setup,
        &blacklister_pubkey,
        stc_program::RoleType::Blacklister,
        true,
    );
    send_transaction(
        &[blacklister_ix],
        &mut setup.svm,
        &[setup.authority.insecure_clone()],
        authority,
    );
    msg!("blacklister assigned");

    // 5. Assign Seizer
    let seizer_pubkey = setup.seizer.pubkey().to_pubkey();
    let seizer_ix =
        update_roles_builder(&setup, &seizer_pubkey, stc_program::RoleType::Seizer, true);
    send_transaction(
        &[seizer_ix],
        &mut setup.svm,
        &[setup.authority.insecure_clone()],
        authority,
    );
    msg!("seizer assigned");

    // 6. Create user ATA and mint tokens
    let user_ata = CreateAssociatedTokenAccount::new(
        &mut setup.svm,
        &setup.authority.insecure_clone(),
        &setup.mint,
    )
    .owner(&setup.user.pubkey())
    .token_program_id(&TOKEN_2022_PROGRAM_ID.to_address())
    .send()
    .expect("Failed to create user ATA");

    let mint_ix = mint_builder(&setup, &user_ata.to_pubkey(), MINT_AMOUNT);
    send_transaction(
        &[mint_ix],
        &mut setup.svm,
        &[setup.minter.insecure_clone()],
        setup.minter.pubkey().to_pubkey(),
    );
    msg!("minted tokens to user");

    // 7. Blacklist the user
    let user_pubkey = setup.user.pubkey().to_pubkey();
    let blacklist_ix = add_to_blacklist_builder(&setup, &user_pubkey);
    send_transaction(
        &[blacklist_ix],
        &mut setup.svm,
        &[setup.blacklister.insecure_clone()],
        setup.blacklister.pubkey().to_pubkey(),
    );
    msg!("user blacklisted");

    msg!("✅ Full SSS-2 compliance flow passed!");
}
