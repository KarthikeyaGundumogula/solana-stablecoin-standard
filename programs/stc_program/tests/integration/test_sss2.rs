use anchor_lang::prelude::msg;
use anchor_spl::token_2022::spl_token_2022::{extension::StateWithExtensionsOwned, state::Account};
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
    let mut setup = Setup::new();
    let authority = setup.authority.pubkey().to_pubkey();

    let hook_program_id = transfer_hook_program_id();
    let ix = initialize_sss2_builder(&setup, &hook_program_id);
    send_transaction(
        &[ix],
        &mut setup.svm,
        &[
            setup.authority.insecure_clone(),
            setup.mint_signer.insecure_clone(),
        ],
        authority,
    );
    msg!("✅ SSS-2 Stablecoin initialized with TransferHook + PermanentDelegate extensions");
}

#[test]
fn test_blacklist_flow() {
    let mut setup = Setup::new();
    let authority = setup.authority.pubkey().to_pubkey();

    // 1. Initialize SSS-2
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

    // 1. Initialize SSS-1 (no compliance flags)
    let init_ix = initialize_builder(&setup);
    send_transaction(
        &[init_ix],
        &mut setup.svm,
        &[
            setup.authority.insecure_clone(),
            setup.mint_signer.insecure_clone(),
        ],
        authority,
    );

    // 2. Blacklister role on SSS-1 should fail
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

    // 3. Seizer role on SSS-1 should fail
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
fn test_seize_via_permanent_delegate() {
    let mut setup = Setup::new();
    let authority = setup.authority.pubkey().to_pubkey();

    // 1. Initialize with PermanentDelegate only (no TransferHook)
    //    This avoids LiteSVM CPI depth limitations testing seize independently
    let init_ix = initialize_permanent_delegate_builder(&setup);

    // DEBUG: log account balances before the transaction
    let authority_lamports = setup
        .svm
        .get_account(&setup.authority.pubkey())
        .map(|a| a.lamports)
        .unwrap_or(0);
    let mint_before = setup
        .svm
        .get_account(&setup.mint_signer.pubkey())
        .map(|a| a.lamports)
        .unwrap_or(0);
    let config_before = setup
        .svm
        .get_account(&setup.config)
        .map(|a| a.lamports)
        .unwrap_or(0);
    println!("=== BEFORE INIT ===");
    println!(
        "authority ({}) lamports: {}",
        setup.authority.pubkey(),
        authority_lamports
    );
    println!(
        "mint ({}) lamports: {}",
        setup.mint_signer.pubkey(),
        mint_before
    );
    println!(
        "config ({}) lamports: {}",
        setup.config.to_pubkey(),
        config_before
    );

    // Accounts in the instruction in order (account_index in the transaction)
    println!(
        "Instruction accounts order: [authority, mint, config, token_program, system_program]"
    );
    println!("  [0] authority = {}", setup.authority.pubkey());
    println!("  [1] mint      = {}", setup.mint_signer.pubkey());
    println!("  [2] config    = {}", setup.config.to_pubkey());

    send_transaction(
        &[init_ix],
        &mut setup.svm,
        &[
            setup.authority.insecure_clone(),
            setup.mint_signer.insecure_clone(),
        ],
        authority,
    );

    // DEBUG: log balances after to confirm rent
    let mint_after = setup
        .svm
        .get_account(&setup.mint_signer.pubkey())
        .map(|a| a.lamports)
        .unwrap_or(0);
    println!("=== AFTER INIT ===");
    println!("mint lamports after: {}", mint_after);

    msg!("PermanentDelegate mint initialized");

    // 2. Assign Minter
    let minter_pubkey = setup.minter.pubkey().to_pubkey();
    let minter_ix = update_minter_builder(&setup, &minter_pubkey, true, MINTER_QUOTA);
    send_transaction(
        &[minter_ix],
        &mut setup.svm,
        &[setup.authority.insecure_clone()],
        authority,
    );

    // 3. Assign Seizer
    let seizer_pubkey = setup.seizer.pubkey().to_pubkey();
    let seizer_ix =
        update_roles_builder(&setup, &seizer_pubkey, stc_program::RoleType::Seizer, true);
    send_transaction(
        &[seizer_ix],
        &mut setup.svm,
        &[setup.authority.insecure_clone()],
        authority,
    );
    msg!("seizer role assigned");

    // 4. Create user ATA — Note: SSS-2 accounts start frozen (DefaultAccountState)
    //    so we must thaw before minting
    let user_ata = CreateAssociatedTokenAccount::new(
        &mut setup.svm,
        &setup.authority.insecure_clone(),
        &setup.mint,
    )
    .owner(&setup.user.pubkey())
    .token_program_id(&TOKEN_2022_PROGRAM_ID.to_address())
    .send()
    .expect("Failed to create user ATA");

    // Note: litesvm-token creates accounts without DefaultAccountState(Frozen) enforcement,
    // so no thaw needed; account is already usable.

    // 5. Mint tokens to user
    let mint_ix = mint_builder(&setup, &user_ata.to_pubkey(), MINT_AMOUNT);
    send_transaction(
        &[mint_ix],
        &mut setup.svm,
        &[setup.minter.insecure_clone()],
        setup.minter.pubkey().to_pubkey(),
    );
    msg!("minted {} to user", MINT_AMOUNT);

    // 6. Create treasury ATA
    let treasury_ata = CreateAssociatedTokenAccount::new(
        &mut setup.svm,
        &setup.authority.insecure_clone(),
        &setup.mint,
    )
    .owner(&setup.authority.pubkey())
    .token_program_id(&TOKEN_2022_PROGRAM_ID.to_address())
    .send()
    .expect("Failed to create treasury ATA");

    // 7. Seize tokens from user → treasury using permanent delegate
    let seize_ix = seize_builder(
        &setup,
        &user_ata.to_pubkey(),
        &treasury_ata.to_pubkey(),
        MINT_AMOUNT,
    );
    send_transaction(
        &[seize_ix],
        &mut setup.svm,
        &[setup.seizer.insecure_clone()],
        setup.seizer.pubkey().to_pubkey(),
    );
    msg!("seize executed");

    // 8. Verify treasury received the tokens
    let treasury_raw = setup.svm.get_account(&treasury_ata).unwrap();
    let treasury_state = StateWithExtensionsOwned::<Account>::unpack(treasury_raw.data).unwrap();
    assert_eq!(
        treasury_state.base.amount, MINT_AMOUNT,
        "Treasury should hold seized tokens"
    );

    let user_raw = setup.svm.get_account(&user_ata).unwrap();
    let user_state = StateWithExtensionsOwned::<Account>::unpack(user_raw.data).unwrap();
    assert_eq!(
        user_state.base.amount, 0,
        "User balance should be zero after seize"
    );

    msg!("✅ Seize via permanent delegate passed!");
}

#[test]
fn test_sss2_full_compliance_flow() {
    let mut setup = Setup::new();
    let authority = setup.authority.pubkey().to_pubkey();

    // 1. Initialize SSS-2
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

    // 2. Assign all roles
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

    let pauser_pubkey = setup.pauser.pubkey().to_pubkey();
    send_transaction(
        &[update_roles_builder(
            &setup,
            &pauser_pubkey,
            stc_program::RoleType::Pauser,
            true,
        )],
        &mut setup.svm,
        &[setup.authority.insecure_clone()],
        authority,
    );

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

    let seizer_pubkey = setup.seizer.pubkey().to_pubkey();
    send_transaction(
        &[update_roles_builder(
            &setup,
            &seizer_pubkey,
            stc_program::RoleType::Seizer,
            true,
        )],
        &mut setup.svm,
        &[setup.authority.insecure_clone()],
        authority,
    );
    msg!("all roles assigned");

    // 3. Create and thaw user ATA, mint tokens
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

    // 4. Blacklist the user
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
