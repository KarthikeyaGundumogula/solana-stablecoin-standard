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
// SSS-1 Core Tests
// =============================================================

#[test]
fn test_initialize_sss1() {
    let setup = Setup::new();
    let authority = setup.authority.pubkey().to_pubkey();

    let ix = initialize_builder(&setup, false, false);
    send_transaction(
        &[ix],
        &mut setup.svm.clone(),
        &[
            setup.authority.insecure_clone(),
            setup.mint_signer.insecure_clone(),
        ],
        authority,
    );
    msg!("✅ SSS-1 Stablecoin initialized successfully");
}

#[test]
fn test_full_sss1_flow() {
    let mut setup = Setup::new();
    let authority = setup.authority.pubkey().to_pubkey();

    // 1. Initialize SSS-1 stablecoin
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
    msg!("initialized");

    // 2. Assign Minter role with quota
    let minter_pubkey = setup.minter.pubkey().to_pubkey();
    let minter_ix = update_minter_builder(&setup, &minter_pubkey, true, MINTER_QUOTA);
    send_transaction(
        &[minter_ix],
        &mut setup.svm,
        &[setup.authority.insecure_clone()],
        authority,
    );
    msg!("minter role assigned");

    // 3. Assign Burner role
    let burner_pubkey = setup.burner.pubkey().to_pubkey();
    let burner_ix =
        update_roles_builder(&setup, &burner_pubkey, stc_program::RoleType::Burner, true);
    send_transaction(
        &[burner_ix],
        &mut setup.svm,
        &[setup.authority.insecure_clone()],
        authority,
    );
    msg!("burner role assigned");

    // 4. Assign Pauser role
    let pauser_pubkey = setup.pauser.pubkey().to_pubkey();
    let pauser_ix =
        update_roles_builder(&setup, &pauser_pubkey, stc_program::RoleType::Pauser, true);
    send_transaction(
        &[pauser_ix],
        &mut setup.svm,
        &[setup.authority.insecure_clone()],
        authority,
    );
    msg!("pauser role assigned");

    // 5. Create user's ATA for the mint
    let user_ata = CreateAssociatedTokenAccount::new(
        &mut setup.svm,
        &setup.authority.insecure_clone(),
        &setup.mint,
    )
    .owner(&setup.user.pubkey())
    .token_program_id(&TOKEN_2022_PROGRAM_ID.to_address())
    .send()
    .expect("Failed to create user ATA");
    msg!("user ATA created at {}", user_ata);

    // 6. Mint tokens to user
    let mint_ix = mint_builder(&setup, &user_ata.to_pubkey(), MINT_AMOUNT);
    send_transaction(
        &[mint_ix],
        &mut setup.svm,
        &[setup.minter.insecure_clone()],
        setup.minter.pubkey().to_pubkey(),
    );
    msg!("minted {} tokens to user", MINT_AMOUNT);

    // 7. Pause the token
    let pause_ix = pause_builder(&setup);
    send_transaction(
        &[pause_ix],
        &mut setup.svm,
        &[setup.pauser.insecure_clone()],
        setup.pauser.pubkey().to_pubkey(),
    );
    msg!("token paused");

    // 8. Minting should fail while paused
    let mint_while_paused = mint_builder(&setup, &user_ata.to_pubkey(), MINT_AMOUNT);
    send_transaction_expect_fail(
        &[mint_while_paused],
        &mut setup.svm,
        &[setup.minter.insecure_clone()],
        setup.minter.pubkey().to_pubkey(),
    );
    msg!("mint correctly rejected while paused");

    // 9. Unpause the token
    let unpause_ix = unpause_builder(&setup);
    send_transaction(
        &[unpause_ix],
        &mut setup.svm,
        &[setup.pauser.insecure_clone()],
        setup.pauser.pubkey().to_pubkey(),
    );
    msg!("token unpaused");

    // 10. Minting should work again after unpause (different amount to avoid tx dedup)
    let mint_after_unpause = mint_builder(&setup, &user_ata.to_pubkey(), MINT_AMOUNT / 2);
    send_transaction(
        &[mint_after_unpause],
        &mut setup.svm,
        &[setup.minter.insecure_clone()],
        setup.minter.pubkey().to_pubkey(),
    );
    msg!("mint succeeded after unpause");

    msg!("✅ Full SSS-1 flow passed!");
}

#[test]
fn test_unauthorized_mint_fails() {
    let mut setup = Setup::new();
    let authority = setup.authority.pubkey().to_pubkey();

    // 1. Initialize
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

    // 2. Create ATA for user
    let user_ata = CreateAssociatedTokenAccount::new(
        &mut setup.svm,
        &setup.authority.insecure_clone(),
        &setup.mint,
    )
    .owner(&setup.user.pubkey())
    .token_program_id(&TOKEN_2022_PROGRAM_ID.to_address())
    .send()
    .expect("Failed to create user ATA");

    // 3. Try to mint WITHOUT assigning minter role — should fail
    let mint_ix = mint_builder(&setup, &user_ata.to_pubkey(), MINT_AMOUNT);
    send_transaction_expect_fail(
        &[mint_ix],
        &mut setup.svm,
        &[setup.minter.insecure_clone()],
        setup.minter.pubkey().to_pubkey(),
    );
    msg!("✅ Unauthorized mint correctly rejected");
}

#[test]
fn test_freeze_thaw() {
    let mut setup = Setup::new();
    let authority = setup.authority.pubkey().to_pubkey();

    // Initialize
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

    // Create ATA
    let user_ata = CreateAssociatedTokenAccount::new(
        &mut setup.svm,
        &setup.authority.insecure_clone(),
        &setup.mint,
    )
    .owner(&setup.user.pubkey())
    .token_program_id(&TOKEN_2022_PROGRAM_ID.to_address())
    .send()
    .expect("Failed to create user ATA");

    // Freeze the account
    let freeze_ix = freeze_account_builder(&setup, &user_ata.to_pubkey());
    send_transaction(
        &[freeze_ix],
        &mut setup.svm,
        &[setup.authority.insecure_clone()],
        authority,
    );
    msg!("account frozen");

    // Thaw the account
    let thaw_ix = thaw_account_builder(&setup, &user_ata.to_pubkey());
    send_transaction(
        &[thaw_ix],
        &mut setup.svm,
        &[setup.authority.insecure_clone()],
        authority,
    );
    msg!("✅ Freeze/Thaw flow passed!");
}

#[test]
fn test_transfer_authority() {
    let mut setup = Setup::new();
    let authority = setup.authority.pubkey().to_pubkey();
    let new_authority = setup.user.pubkey().to_pubkey();

    // Initialize
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

    // Transfer authority
    let transfer_ix = transfer_authority_builder(&setup, &new_authority);
    send_transaction(
        &[transfer_ix],
        &mut setup.svm,
        &[setup.authority.insecure_clone()],
        authority,
    );
    msg!("✅ Authority transfer passed!");
}
