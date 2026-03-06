use anchor_lang::{system_program::ID as SYSTEM_PROGRAM, InstructionData, ToAccountMetas};
use solana_sdk::{message::Instruction, signer::Signer};

use stc_program;

use super::fixtures::*;
use super::setup::Setup;
use crate::helpers::convert_account_metas;

/// Build the initialize instruction (SSS-1 or SSS-2 depending on flags)
pub fn initialize_builder(
    setup: &Setup,
    enable_permanent_delegate: bool,
    enable_transfer_hook: bool,
) -> Instruction {
    let anchor_accounts = stc_program::accounts::Initialize {
        authority: setup.authority.pubkey().to_pubkey(),
        config: setup.config.to_pubkey(),
        mint: setup.mint_signer.pubkey().to_pubkey(),
        token_program: TOKEN_2022_PROGRAM_ID,
        system_program: SYSTEM_PROGRAM,
    }
    .to_account_metas(None);
    let sdk_accounts = convert_account_metas(anchor_accounts);

    let data = stc_program::instruction::Initialize {
        args: stc_program::InitializeArgs {
            name: "Test Stablecoin".to_string(),
            symbol: "TUSD".to_string(),
            uri: "https://example.com/tusd".to_string(),
            decimals: MINT_DECIMALS,
            enable_permanent_delegate,
            enable_transfer_hook,
        },
    }
    .data();

    Instruction {
        program_id: stc_program::ID.to_address(),
        accounts: sdk_accounts,
        data,
    }
}

/// Build the update_minter instruction
pub fn update_minter_builder(
    setup: &Setup,
    minter_pubkey: &anchor_lang::prelude::Pubkey,
    is_active: bool,
    quota_limit: u64,
) -> Instruction {
    let role_pda = setup.role_pda(
        &solana_sdk::pubkey::Pubkey::from(minter_pubkey.to_bytes()),
        0,
    ); // Minter = 0
    let quota_pda =
        setup.minter_quota_pda(&solana_sdk::pubkey::Pubkey::from(minter_pubkey.to_bytes()));

    let anchor_accounts = stc_program::accounts::UpdateMinter {
        authority: setup.authority.pubkey().to_pubkey(),
        config: setup.config.to_pubkey(),
        minter: *minter_pubkey,
        role_account: role_pda.to_pubkey(),
        minter_quota: quota_pda.to_pubkey(),
        system_program: SYSTEM_PROGRAM,
    }
    .to_account_metas(None);
    let sdk_accounts = convert_account_metas(anchor_accounts);

    let data = stc_program::instruction::UpdateMinter {
        is_active,
        quota_limit,
    }
    .data();

    Instruction {
        program_id: stc_program::ID.to_address(),
        accounts: sdk_accounts,
        data,
    }
}

/// Build the update_roles instruction
pub fn update_roles_builder(
    setup: &Setup,
    assignee: &anchor_lang::prelude::Pubkey,
    role_type: stc_program::RoleType,
    is_active: bool,
) -> Instruction {
    let role_pda = setup.role_pda(
        &solana_sdk::pubkey::Pubkey::from(assignee.to_bytes()),
        role_type as u8,
    );

    let anchor_accounts = stc_program::accounts::UpdateRoles {
        authority: setup.authority.pubkey().to_pubkey(),
        config: setup.config.to_pubkey(),
        assignee: *assignee,
        role_account: role_pda.to_pubkey(),
        system_program: SYSTEM_PROGRAM,
    }
    .to_account_metas(None);
    let sdk_accounts = convert_account_metas(anchor_accounts);

    let data = stc_program::instruction::UpdateRoles {
        args: stc_program::UpdateRolesArgs {
            role_type,
            is_active,
        },
    }
    .data();

    Instruction {
        program_id: stc_program::ID.to_address(),
        accounts: sdk_accounts,
        data,
    }
}

/// Build the mint instruction
pub fn mint_builder(
    setup: &Setup,
    recipient_token_account: &anchor_lang::prelude::Pubkey,
    amount: u64,
) -> Instruction {
    let minter_pubkey = setup.minter.pubkey().to_pubkey();
    let role_pda = setup.role_pda(&setup.minter.pubkey(), 0); // Minter = 0
    let quota_pda = setup.minter_quota_pda(&setup.minter.pubkey());

    let anchor_accounts = stc_program::accounts::MintTokens {
        minter: minter_pubkey,
        config: setup.config.to_pubkey(),
        role_account: role_pda.to_pubkey(),
        minter_quota: quota_pda.to_pubkey(),
        mint: setup.mint.to_pubkey(),
        recipient_token_account: *recipient_token_account,
        token_program: TOKEN_2022_PROGRAM_ID,
    }
    .to_account_metas(None);
    let sdk_accounts = convert_account_metas(anchor_accounts);

    let data = stc_program::instruction::Mint { amount }.data();

    Instruction {
        program_id: stc_program::ID.to_address(),
        accounts: sdk_accounts,
        data,
    }
}

/// Build the pause instruction
pub fn pause_builder(setup: &Setup) -> Instruction {
    let role_pda = setup.role_pda(&setup.pauser.pubkey(), 2); // Pauser = 2

    let anchor_accounts = stc_program::accounts::Pause {
        pauser: setup.pauser.pubkey().to_pubkey(),
        config: setup.config.to_pubkey(),
        role_account: role_pda.to_pubkey(),
    }
    .to_account_metas(None);
    let sdk_accounts = convert_account_metas(anchor_accounts);

    let data = stc_program::instruction::Pause {}.data();

    Instruction {
        program_id: stc_program::ID.to_address(),
        accounts: sdk_accounts,
        data,
    }
}

/// Build the unpause instruction
pub fn unpause_builder(setup: &Setup) -> Instruction {
    let role_pda = setup.role_pda(&setup.pauser.pubkey(), 2); // Pauser = 2

    let anchor_accounts = stc_program::accounts::Unpause {
        pauser: setup.pauser.pubkey().to_pubkey(),
        config: setup.config.to_pubkey(),
        role_account: role_pda.to_pubkey(),
    }
    .to_account_metas(None);
    let sdk_accounts = convert_account_metas(anchor_accounts);

    let data = stc_program::instruction::Unpause {}.data();

    Instruction {
        program_id: stc_program::ID.to_address(),
        accounts: sdk_accounts,
        data,
    }
}

/// Build the freeze_account instruction
pub fn freeze_account_builder(
    setup: &Setup,
    token_account: &anchor_lang::prelude::Pubkey,
) -> Instruction {
    let anchor_accounts = stc_program::accounts::FreezeAccount {
        authority: setup.authority.pubkey().to_pubkey(),
        config: setup.config.to_pubkey(),
        mint: setup.mint.to_pubkey(),
        token_account: *token_account,
        token_program: TOKEN_2022_PROGRAM_ID,
    }
    .to_account_metas(None);
    let sdk_accounts = convert_account_metas(anchor_accounts);

    let data = stc_program::instruction::FreezeAccount {}.data();

    Instruction {
        program_id: stc_program::ID.to_address(),
        accounts: sdk_accounts,
        data,
    }
}

/// Build the thaw_account instruction
pub fn thaw_account_builder(
    setup: &Setup,
    token_account: &anchor_lang::prelude::Pubkey,
) -> Instruction {
    let anchor_accounts = stc_program::accounts::ThawAccount {
        authority: setup.authority.pubkey().to_pubkey(),
        config: setup.config.to_pubkey(),
        mint: setup.mint.to_pubkey(),
        token_account: *token_account,
        token_program: TOKEN_2022_PROGRAM_ID,
    }
    .to_account_metas(None);
    let sdk_accounts = convert_account_metas(anchor_accounts);

    let data = stc_program::instruction::ThawAccount {}.data();

    Instruction {
        program_id: stc_program::ID.to_address(),
        accounts: sdk_accounts,
        data,
    }
}

/// Build the add_to_blacklist instruction (SSS-2)
pub fn add_to_blacklist_builder(
    setup: &Setup,
    address: &anchor_lang::prelude::Pubkey,
) -> Instruction {
    let role_pda = setup.role_pda(&setup.blacklister.pubkey(), 3); // Blacklister = 3
    let blacklist_pda = setup.blacklist_pda(&solana_sdk::pubkey::Pubkey::from(address.to_bytes()));

    let anchor_accounts = stc_program::accounts::AddToBlacklist {
        blacklister: setup.blacklister.pubkey().to_pubkey(),
        config: setup.config.to_pubkey(),
        role_account: role_pda.to_pubkey(),
        address_to_blacklist: *address,
        blacklist_entry: blacklist_pda.to_pubkey(),
        system_program: SYSTEM_PROGRAM,
    }
    .to_account_metas(None);
    let sdk_accounts = convert_account_metas(anchor_accounts);

    let data = stc_program::instruction::AddToBlacklist {}.data();

    Instruction {
        program_id: stc_program::ID.to_address(),
        accounts: sdk_accounts,
        data,
    }
}

/// Build the transfer_authority instruction
pub fn transfer_authority_builder(
    setup: &Setup,
    new_authority: &anchor_lang::prelude::Pubkey,
) -> Instruction {
    let anchor_accounts = stc_program::accounts::TransferAuthority {
        authority: setup.authority.pubkey().to_pubkey(),
        config: setup.config.to_pubkey(),
        new_authority: *new_authority,
    }
    .to_account_metas(None);
    let sdk_accounts = convert_account_metas(anchor_accounts);

    let data = stc_program::instruction::TransferAuthority {}.data();

    Instruction {
        program_id: stc_program::ID.to_address(),
        accounts: sdk_accounts,
        data,
    }
}
