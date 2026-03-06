use litesvm::LiteSVM;
use solana_sdk::{message::Message, pubkey::Pubkey, signature::Keypair, transaction::Transaction};

use anchor_lang::prelude::AccountMeta as AnchorAccountMeta;
use anchor_lang::prelude::Pubkey as AnchorPubkey;
use solana_sdk::instruction::AccountMeta as SdkAccountMeta;
use solana_sdk::message::Instruction;

/// Convert anchor AccountMetas to solana-sdk AccountMetas
pub fn convert_account_metas(anchor_metas: Vec<AnchorAccountMeta>) -> Vec<SdkAccountMeta> {
    anchor_metas
        .into_iter()
        .map(|meta| SdkAccountMeta {
            pubkey: Pubkey::from(meta.pubkey.to_bytes()),
            is_signer: meta.is_signer,
            is_writable: meta.is_writable,
        })
        .collect()
}

/// Send a transaction to the LiteSVM — expects success
pub fn send_transaction(
    instructions: &[Instruction],
    svm: &mut LiteSVM,
    signers: &[Keypair],
    payer: AnchorPubkey,
) {
    let message = Message::new(instructions, Some(&Pubkey::from(payer.to_bytes())));
    let recent_blockhash = svm.latest_blockhash();
    let transaction = Transaction::new(signers, message, recent_blockhash);

    let result = svm
        .send_transaction(transaction)
        .expect("Transaction should succeed");

    println!("\n✅ Transaction successful");
    println!("   CUs consumed: {}", result.compute_units_consumed);
}

/// Send a transaction and expect failure — returns the error
pub fn send_transaction_expect_fail(
    instructions: &[Instruction],
    svm: &mut LiteSVM,
    signers: &[Keypair],
    payer: AnchorPubkey,
) {
    let message = Message::new(instructions, Some(&Pubkey::from(payer.to_bytes())));
    let recent_blockhash = svm.latest_blockhash();
    let transaction = Transaction::new(signers, message, recent_blockhash);

    let result = svm.send_transaction(transaction);
    assert!(
        result.is_err(),
        "Expected transaction to fail but it succeeded"
    );
    println!("\n❌ Transaction correctly failed as expected");
}
