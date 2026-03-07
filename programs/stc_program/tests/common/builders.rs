use anchor_lang::{system_program::ID as SYSTEM_PROGRAM, InstructionData, ToAccountMetas};
use solana_sdk::{message::Instruction, signer::Signer};

use stc_program;
use transfer_hook;

use super::fixtures::*;
use super::setup::Setup;
use crate::helpers::convert_account_metas;

/// Build the initialize_extra_account_meta_list instruction on the transfer_hook program.
/// Must be called after SSS-2 mint init, before any transfer_checked or seize on that mint.
pub fn init_hook_meta_builder(setup: &Setup) -> Instruction {
    let hook_program_id = transfer_hook_program_id();
    let extra_meta_pda = setup.extra_meta_pda();

    let anchor_accounts = transfer_hook::accounts::InitializeExtraAccountMetaList {
        payer: setup.authority.pubkey().to_pubkey(),
        extra_account_meta_list: extra_meta_pda.to_pubkey(),
        mint: setup.mint.to_pubkey(),
        stc_program_id: stc_program::ID.into(),
        system_program: SYSTEM_PROGRAM,
    }
    .to_account_metas(None);
    let sdk_accounts = convert_account_metas(anchor_accounts);

    let data = transfer_hook::instruction::InitializeExtraAccountMetaList {}.data();

    Instruction {
        program_id: hook_program_id.to_address(),
        accounts: sdk_accounts,
        data,
    }
}

pub fn transfer_hook_program_id() -> anchor_lang::prelude::Pubkey {
    anchor_lang::prelude::Pubkey::from_str_const(&transfer_hook::ID.to_string())
}

/// Build the SSS-1 initialize instruction (MetadataPointer only)
pub fn initialize_builder(setup: &Setup) -> Instruction {
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
        },
    }
    .data();

    Instruction {
        program_id: stc_program::ID.to_address(),
        accounts: sdk_accounts,
        data,
    }
}

/// Build the SSS-2 initialize instruction (MetadataPointer + TransferHook + PermanentDelegate)
pub fn initialize_sss2_builder(
    setup: &Setup,
    transfer_hook_program_id: &anchor_lang::prelude::Pubkey,
) -> Instruction {
    let anchor_accounts = stc_program::accounts::InitializeSss2 {
        authority: setup.authority.pubkey().to_pubkey(),
        config: setup.config.to_pubkey(),
        mint: setup.mint_signer.pubkey().to_pubkey(),
        transfer_hook_program: *transfer_hook_program_id,
        token_program: TOKEN_2022_PROGRAM_ID,
        system_program: SYSTEM_PROGRAM,
    }
    .to_account_metas(None);
    let sdk_accounts = convert_account_metas(anchor_accounts);

    let data = stc_program::instruction::InitializeSss2 {
        args: stc_program::InitializeSss2Args {
            name: "Test Stablecoin SSS2".to_string(),
            symbol: "TUSD2".to_string(),
            uri: "https://example.com/tusd2".to_string(),
            decimals: MINT_DECIMALS,
        },
    }
    .data();

    Instruction {
        program_id: stc_program::ID.to_address(),
        accounts: sdk_accounts,
        data,
    }
}

/// Build the initialize_permanent_delegate instruction (MetadataPointer + PermanentDelegate only).
/// Use this for seize tests — no TransferHook means no 3-level CPI depth into the hook.
pub fn initialize_permanent_delegate_builder(setup: &Setup) -> Instruction {
    let anchor_accounts = stc_program::accounts::InitializePermanentDelegate {
        authority: setup.authority.pubkey().to_pubkey(),
        config: setup.config.to_pubkey(),
        mint: setup.mint_signer.pubkey().to_pubkey(),
        token_program: TOKEN_2022_PROGRAM_ID,
        system_program: SYSTEM_PROGRAM,
    }
    .to_account_metas(None);
    let sdk_accounts = convert_account_metas(anchor_accounts);

    let data = stc_program::instruction::InitializePermanentDelegate {
        args: stc_program::InitializePermanentDelegateArgs {
            name: "Test Stablecoin PD".to_string(),
            symbol: "TUSDPD".to_string(),
            uri: "https://example.com/tusdpd".to_string(),
            decimals: MINT_DECIMALS,
        },
    }
    .data();

    Instruction {
        program_id: stc_program::ID.to_address(),
        accounts: sdk_accounts,
        data,
    }
}

/// Build the seize instruction (SSS-2 permanent delegate).
/// Works with PermanentDelegate-only mints (no TransferHook extension).
pub fn seize_builder(
    setup: &Setup,
    source_token_account: &anchor_lang::prelude::Pubkey,
    treasury_token_account: &anchor_lang::prelude::Pubkey,
    amount: u64,
) -> Instruction {
    let role_pda = setup.role_pda(&setup.seizer.pubkey(), 4); // Seizer = 4

    let sdk_accounts = convert_account_metas(
        stc_program::accounts::Seize {
            seizer: setup.seizer.pubkey().to_pubkey(),
            config: setup.config.to_pubkey(),
            role_account: role_pda.to_pubkey(),
            mint: setup.mint.to_pubkey(),
            source_token_account: *source_token_account,
            treasury_token_account: *treasury_token_account,
            token_program: TOKEN_2022_PROGRAM_ID,
        }
        .to_account_metas(None),
    );

    let data = stc_program::instruction::Seize { amount }.data();

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
