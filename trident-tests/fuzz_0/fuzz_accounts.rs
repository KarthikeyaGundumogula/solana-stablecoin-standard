// fuzz_accounts.rs
//
// Implements InstructionSetters for every stc_program instruction.
// This is the ONLY place that touches AddressStorage — test_fuzz.rs
// calls XxxTransaction::build() which dispatches here.
//
// AddressStorage slots (stable integer IDs):
//   0 = authority / payer
//   1 = mint keypair
//   2 = minter
//   3 = burner
//   4 = pauser
//   5 = blacklister
//   6 = seizer
//   7 = user (token account owner)
//   8 = attacker (always a fresh, unprivileged keypair)
//
// PDA accounts (no keypair needed) are stored by calling
// trident.set_account_data / derived in-place each time.

use trident_fuzz::fuzzing::*;
use types::stc_program::*;
use types::*;

// ── program IDs ──────────────────────────────────────────────
pub const TOKEN_2022_PROGRAM_ID: Pubkey =
    pubkey!("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");
pub const ASSOCIATED_TOKEN_PROGRAM_ID: Pubkey =
    pubkey!("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJe1bRS");
pub const STC_PROGRAM_ID: Pubkey =
    pubkey!("3nqtxhZZdpV5W2TPaa1hbWbeM3bhhsMg3Fy9oLdAHKfH");

// ── slot constants ────────────────────────────────────────────
pub const SLOT_AUTHORITY: u8 = 0;
pub const SLOT_MINT: u8 = 1;
pub const SLOT_MINTER: u8 = 2;
pub const SLOT_BURNER: u8 = 3;
pub const SLOT_PAUSER: u8 = 4;
pub const SLOT_BLACKLISTER: u8 = 5;
pub const SLOT_SEIZER: u8 = 6;
pub const SLOT_USER: u8 = 7;
pub const SLOT_ATTACKER: u8 = 8;

// ── PDA helpers ───────────────────────────────────────────────

pub fn config_pda(mint: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(
        &[b"stablecoin_config", mint.as_ref()],
        &STC_PROGRAM_ID,
    )
    .0
}

/// role_disc: Minter=0, Burner=1, Pauser=2, Blacklister=3, Seizer=4
pub fn role_pda(mint: &Pubkey, assignee: &Pubkey, role_disc: u8) -> Pubkey {
    Pubkey::find_program_address(
        &[b"role", mint.as_ref(), assignee.as_ref(), &[role_disc]],
        &STC_PROGRAM_ID,
    )
    .0
}

pub fn quota_pda(mint: &Pubkey, minter: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(
        &[b"minter_quota", mint.as_ref(), minter.as_ref()],
        &STC_PROGRAM_ID,
    )
    .0
}

pub fn blacklist_entry_pda(mint: &Pubkey, address: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(
        &[b"blacklist", mint.as_ref(), address.as_ref()],
        &STC_PROGRAM_ID,
    )
    .0
}

pub fn ata(owner: &Pubkey, mint: &Pubkey) -> Pubkey {
    spl_associated_token_account::get_associated_token_address_with_program_id(
        owner,
        mint,
        &TOKEN_2022_PROGRAM_ID,
    )
}

// ═══════════════════════════════════════════════════════════════
// initialize_permanent_delegate
// ═══════════════════════════════════════════════════════════════
impl InstructionSetters for InitializePermanentDelegateInstruction {
    type IxAccounts = FuzzAccounts;

    fn set_accounts(&mut self, trident: &mut Trident, fuzz_accounts: &mut Self::IxAccounts) {
        let authority = fuzz_accounts
            .authority
            .get_or_create(SLOT_AUTHORITY, trident, None, None);
        let mint = fuzz_accounts
            .mint
            .get_or_create(SLOT_MINT, trident, None, None);
        let config = config_pda(&mint);
        fuzz_accounts.config.get_or_create(0, trident, None, None); // keep slot occupied
        // Override with PDA
        self.accounts.authority = authority;
        self.accounts.config = config;
        self.accounts.mint = mint;
        self.accounts.token_program = TOKEN_2022_PROGRAM_ID;
        self.accounts.system_program = solana_sdk::system_program::ID;
    }

    fn set_data(&mut self, _trident: &mut Trident, _fuzz_accounts: &mut Self::IxAccounts) {
        self.data = InitializePermanentDelegateInstructionData {
            args: InitializePermanentDelegateArgs {
                name: "FuzzToken".to_string(),
                symbol: "FUZZ".to_string(),
                uri: "https://fuzz.test".to_string(),
                decimals: 6,
            },
        };
    }

    fn set_signers(&mut self, fuzz_accounts: &mut Self::IxAccounts, signers: &mut Vec<Keypair>) {
        let authority_kp = fuzz_accounts.authority.get_keypair(SLOT_AUTHORITY);
        let mint_kp = fuzz_accounts.mint.get_keypair(SLOT_MINT);
        signers.push(authority_kp);
        signers.push(mint_kp);
    }
}

// ═══════════════════════════════════════════════════════════════
// update_minter
// ═══════════════════════════════════════════════════════════════
impl InstructionSetters for UpdateMinterInstruction {
    type IxAccounts = FuzzAccounts;

    fn set_accounts(&mut self, trident: &mut Trident, fuzz_accounts: &mut Self::IxAccounts) {
        let authority = fuzz_accounts
            .authority
            .get_or_create(SLOT_AUTHORITY, trident, None, None);
        let mint = fuzz_accounts
            .mint
            .get_or_create(SLOT_MINT, trident, None, None);
        let minter = fuzz_accounts
            .minter
            .get_or_create(SLOT_MINTER, trident, None, None);
        let config = config_pda(&mint);
        let role_account = role_pda(&mint, &minter, 0);
        let minter_quota = quota_pda(&mint, &minter);

        self.accounts.authority = authority;
        self.accounts.config = config;
        self.accounts.minter = minter;
        self.accounts.role_account = role_account;
        self.accounts.minter_quota = minter_quota;
        self.accounts.system_program = solana_sdk::system_program::ID;
    }

    fn set_data(&mut self, _trident: &mut Trident, _fuzz_accounts: &mut Self::IxAccounts) {
        self.data = UpdateMinterInstructionData {
            is_active: true,
            quota_limit: 1_000_000_000_000,
        };
    }

    fn set_signers(&mut self, fuzz_accounts: &mut Self::IxAccounts, signers: &mut Vec<Keypair>) {
        signers.push(fuzz_accounts.authority.get_keypair(SLOT_AUTHORITY));
    }
}

// ═══════════════════════════════════════════════════════════════
// update_roles  (burner / pauser / blacklister / seizer)
// ═══════════════════════════════════════════════════════════════
impl InstructionSetters for UpdateRolesInstruction {
    type IxAccounts = FuzzAccounts;

    fn set_accounts(&mut self, trident: &mut Trident, fuzz_accounts: &mut Self::IxAccounts) {
        let authority = fuzz_accounts
            .authority
            .get_or_create(SLOT_AUTHORITY, trident, None, None);
        let mint = fuzz_accounts
            .mint
            .get_or_create(SLOT_MINT, trident, None, None);
        // Slot for assignee comes from the data's role_type — pick deterministically.
        let role_disc = self.data.args.role_type as u8;
        let assignee_slot = match role_disc {
            1 => SLOT_BURNER,
            2 => SLOT_PAUSER,
            3 => SLOT_BLACKLISTER,
            4 => SLOT_SEIZER,
            _ => SLOT_MINTER,
        };
        let assignee = fuzz_accounts
            .assignee
            .get_or_create(assignee_slot, trident, None, None);
        let config = config_pda(&mint);
        let role_account = role_pda(&mint, &assignee, role_disc);

        self.accounts.authority = authority;
        self.accounts.config = config;
        self.accounts.assignee = assignee;
        self.accounts.role_account = role_account;
        self.accounts.system_program = solana_sdk::system_program::ID;
    }

    fn set_data(&mut self, _trident: &mut Trident, _fuzz_accounts: &mut Self::IxAccounts) {
        // data already set by caller; default to Burner/true if unset
        if self.data.args.role_type as u8 == 0 {
            self.data.args.role_type = RoleType::Burner;
            self.data.args.is_active = true;
        }
    }

    fn set_signers(&mut self, fuzz_accounts: &mut Self::IxAccounts, signers: &mut Vec<Keypair>) {
        signers.push(fuzz_accounts.authority.get_keypair(SLOT_AUTHORITY));
    }
}

// ═══════════════════════════════════════════════════════════════
// mint
// ═══════════════════════════════════════════════════════════════
impl InstructionSetters for MintInstruction {
    type IxAccounts = FuzzAccounts;

    fn set_accounts(&mut self, trident: &mut Trident, fuzz_accounts: &mut Self::IxAccounts) {
        let mint_pub = fuzz_accounts
            .mint
            .get_or_create(SLOT_MINT, trident, None, None);
        let minter = fuzz_accounts
            .minter
            .get_or_create(SLOT_MINTER, trident, None, None);
        let user = fuzz_accounts
            .token_account_owner
            .get_or_create(SLOT_USER, trident, None, None);
        let config = config_pda(&mint_pub);
        let role_account = role_pda(&mint_pub, &minter, 0);
        let minter_quota = quota_pda(&mint_pub, &minter);
        let recipient_token_account = ata(&user, &mint_pub);

        self.accounts.minter = minter;
        self.accounts.config = config;
        self.accounts.role_account = role_account;
        self.accounts.minter_quota = minter_quota;
        self.accounts.mint = mint_pub;
        self.accounts.recipient_token_account = recipient_token_account;
        self.accounts.token_program = TOKEN_2022_PROGRAM_ID;
    }

    fn set_data(&mut self, _trident: &mut Trident, _fuzz_accounts: &mut Self::IxAccounts) {
        self.data.amount = 1_000_000_000; // 1000 tokens (6 dec)
    }

    fn set_signers(&mut self, fuzz_accounts: &mut Self::IxAccounts, signers: &mut Vec<Keypair>) {
        signers.push(fuzz_accounts.minter.get_keypair(SLOT_MINTER));
    }
}

// ═══════════════════════════════════════════════════════════════
// burn
// ═══════════════════════════════════════════════════════════════
impl InstructionSetters for BurnInstruction {
    type IxAccounts = FuzzAccounts;

    fn set_accounts(&mut self, trident: &mut Trident, fuzz_accounts: &mut Self::IxAccounts) {
        let mint_pub = fuzz_accounts
            .mint
            .get_or_create(SLOT_MINT, trident, None, None);
        let burner = fuzz_accounts
            .burner
            .get_or_create(SLOT_BURNER, trident, None, None);
        let user = fuzz_accounts
            .token_account_owner
            .get_or_create(SLOT_USER, trident, None, None);
        let config = config_pda(&mint_pub);
        let role_account = role_pda(&mint_pub, &burner, 1);
        let token_account = ata(&user, &mint_pub);

        self.accounts.burner = burner;
        self.accounts.config = config;
        self.accounts.role_account = role_account;
        self.accounts.mint = mint_pub;
        self.accounts.token_account = token_account;
        self.accounts.token_account_owner = user;
        self.accounts.token_program = TOKEN_2022_PROGRAM_ID;
    }

    fn set_data(&mut self, _trident: &mut Trident, _fuzz_accounts: &mut Self::IxAccounts) {
        self.data.amount = 1_000_000; // burn 1 token
    }

    fn set_signers(&mut self, fuzz_accounts: &mut Self::IxAccounts, signers: &mut Vec<Keypair>) {
        signers.push(fuzz_accounts.burner.get_keypair(SLOT_BURNER));
        signers.push(fuzz_accounts.token_account_owner.get_keypair(SLOT_USER));
    }
}

// ═══════════════════════════════════════════════════════════════
// pause / unpause
// ═══════════════════════════════════════════════════════════════
impl InstructionSetters for PauseInstruction {
    type IxAccounts = FuzzAccounts;

    fn set_accounts(&mut self, trident: &mut Trident, fuzz_accounts: &mut Self::IxAccounts) {
        let mint_pub = fuzz_accounts
            .mint
            .get_or_create(SLOT_MINT, trident, None, None);
        let pauser = fuzz_accounts
            .pauser
            .get_or_create(SLOT_PAUSER, trident, None, None);
        self.accounts.pauser = pauser;
        self.accounts.config = config_pda(&mint_pub);
        self.accounts.role_account = role_pda(&mint_pub, &pauser, 2);
    }

    fn set_signers(&mut self, fuzz_accounts: &mut Self::IxAccounts, signers: &mut Vec<Keypair>) {
        signers.push(fuzz_accounts.pauser.get_keypair(SLOT_PAUSER));
    }
}

impl InstructionSetters for UnpauseInstruction {
    type IxAccounts = FuzzAccounts;

    fn set_accounts(&mut self, trident: &mut Trident, fuzz_accounts: &mut Self::IxAccounts) {
        let mint_pub = fuzz_accounts
            .mint
            .get_or_create(SLOT_MINT, trident, None, None);
        let pauser = fuzz_accounts
            .pauser
            .get_or_create(SLOT_PAUSER, trident, None, None);
        self.accounts.pauser = pauser;
        self.accounts.config = config_pda(&mint_pub);
        self.accounts.role_account = role_pda(&mint_pub, &pauser, 2);
    }

    fn set_signers(&mut self, fuzz_accounts: &mut Self::IxAccounts, signers: &mut Vec<Keypair>) {
        signers.push(fuzz_accounts.pauser.get_keypair(SLOT_PAUSER));
    }
}

// ═══════════════════════════════════════════════════════════════
// freeze_account / thaw_account
// ═══════════════════════════════════════════════════════════════
impl InstructionSetters for FreezeAccountInstruction {
    type IxAccounts = FuzzAccounts;

    fn set_accounts(&mut self, trident: &mut Trident, fuzz_accounts: &mut Self::IxAccounts) {
        let authority = fuzz_accounts
            .authority
            .get_or_create(SLOT_AUTHORITY, trident, None, None);
        let mint_pub = fuzz_accounts
            .mint
            .get_or_create(SLOT_MINT, trident, None, None);
        let user = fuzz_accounts
            .token_account_owner
            .get_or_create(SLOT_USER, trident, None, None);
        let token_account = ata(&user, &mint_pub);

        self.accounts.authority = authority;
        self.accounts.config = config_pda(&mint_pub);
        self.accounts.mint = mint_pub;
        self.accounts.token_account = token_account;
        self.accounts.token_program =
            solana_sdk::pubkey!("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");
    }

    fn set_signers(&mut self, fuzz_accounts: &mut Self::IxAccounts, signers: &mut Vec<Keypair>) {
        signers.push(fuzz_accounts.authority.get_keypair(SLOT_AUTHORITY));
    }
}

impl InstructionSetters for ThawAccountInstruction {
    type IxAccounts = FuzzAccounts;

    fn set_accounts(&mut self, trident: &mut Trident, fuzz_accounts: &mut Self::IxAccounts) {
        let authority = fuzz_accounts
            .authority
            .get_or_create(SLOT_AUTHORITY, trident, None, None);
        let mint_pub = fuzz_accounts
            .mint
            .get_or_create(SLOT_MINT, trident, None, None);
        let user = fuzz_accounts
            .token_account_owner
            .get_or_create(SLOT_USER, trident, None, None);
        let token_account = ata(&user, &mint_pub);

        self.accounts.authority = authority;
        self.accounts.config = config_pda(&mint_pub);
        self.accounts.mint = mint_pub;
        self.accounts.token_account = token_account;
        self.accounts.token_program =
            solana_sdk::pubkey!("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");
    }

    fn set_signers(&mut self, fuzz_accounts: &mut Self::IxAccounts, signers: &mut Vec<Keypair>) {
        signers.push(fuzz_accounts.authority.get_keypair(SLOT_AUTHORITY));
    }
}

// ═══════════════════════════════════════════════════════════════
// seize
// ═══════════════════════════════════════════════════════════════
impl InstructionSetters for SeizeInstruction {
    type IxAccounts = FuzzAccounts;

    fn set_accounts(&mut self, trident: &mut Trident, fuzz_accounts: &mut Self::IxAccounts) {
        let mint_pub = fuzz_accounts
            .mint
            .get_or_create(SLOT_MINT, trident, None, None);
        let seizer = fuzz_accounts
            .seizer
            .get_or_create(SLOT_SEIZER, trident, None, None);
        let authority = fuzz_accounts
            .authority
            .get_or_create(SLOT_AUTHORITY, trident, None, None);
        let user = fuzz_accounts
            .token_account_owner
            .get_or_create(SLOT_USER, trident, None, None);

        self.accounts.seizer = seizer;
        self.accounts.config = config_pda(&mint_pub);
        self.accounts.role_account = role_pda(&mint_pub, &seizer, 4);
        self.accounts.mint = mint_pub;
        self.accounts.source_token_account = ata(&user, &mint_pub);
        self.accounts.treasury_token_account = ata(&authority, &mint_pub);
        self.accounts.token_program = TOKEN_2022_PROGRAM_ID;
    }

    fn set_data(&mut self, _trident: &mut Trident, _fuzz_accounts: &mut Self::IxAccounts) {
        self.data.amount = 1_000_000_000;
    }

    fn set_signers(&mut self, fuzz_accounts: &mut Self::IxAccounts, signers: &mut Vec<Keypair>) {
        signers.push(fuzz_accounts.seizer.get_keypair(SLOT_SEIZER));
    }
}

// ═══════════════════════════════════════════════════════════════
// add_to_blacklist / remove_from_blacklist
// ═══════════════════════════════════════════════════════════════
impl InstructionSetters for AddToBlacklistInstruction {
    type IxAccounts = FuzzAccounts;

    fn set_accounts(&mut self, trident: &mut Trident, fuzz_accounts: &mut Self::IxAccounts) {
        let mint_pub = fuzz_accounts
            .mint
            .get_or_create(SLOT_MINT, trident, None, None);
        let blacklister = fuzz_accounts
            .blacklister
            .get_or_create(SLOT_BLACKLISTER, trident, None, None);
        let user = fuzz_accounts
            .address_to_blacklist
            .get_or_create(SLOT_USER, trident, None, None);

        self.accounts.blacklister = blacklister;
        self.accounts.config = config_pda(&mint_pub);
        self.accounts.role_account = role_pda(&mint_pub, &blacklister, 3);
        self.accounts.address_to_blacklist = user;
        self.accounts.blacklist_entry = blacklist_entry_pda(&mint_pub, &user);
        self.accounts.system_program = solana_sdk::system_program::ID;
    }

    fn set_signers(&mut self, fuzz_accounts: &mut Self::IxAccounts, signers: &mut Vec<Keypair>) {
        signers.push(fuzz_accounts.blacklister.get_keypair(SLOT_BLACKLISTER));
    }
}

impl InstructionSetters for RemoveFromBlacklistInstruction {
    type IxAccounts = FuzzAccounts;

    fn set_accounts(&mut self, trident: &mut Trident, fuzz_accounts: &mut Self::IxAccounts) {
        let mint_pub = fuzz_accounts
            .mint
            .get_or_create(SLOT_MINT, trident, None, None);
        let blacklister = fuzz_accounts
            .blacklister
            .get_or_create(SLOT_BLACKLISTER, trident, None, None);
        let user = fuzz_accounts
            .address_to_remove
            .get_or_create(SLOT_USER, trident, None, None);

        self.accounts.blacklister = blacklister;
        self.accounts.config = config_pda(&mint_pub);
        self.accounts.role_account = role_pda(&mint_pub, &blacklister, 3);
        self.accounts.address_to_remove = user;
        self.accounts.blacklist_entry = blacklist_entry_pda(&mint_pub, &user);
    }

    fn set_signers(&mut self, fuzz_accounts: &mut Self::IxAccounts, signers: &mut Vec<Keypair>) {
        signers.push(fuzz_accounts.blacklister.get_keypair(SLOT_BLACKLISTER));
    }
}

// ═══════════════════════════════════════════════════════════════
// transfer_authority
// ═══════════════════════════════════════════════════════════════
impl InstructionSetters for TransferAuthorityInstruction {
    type IxAccounts = FuzzAccounts;

    fn set_accounts(&mut self, trident: &mut Trident, fuzz_accounts: &mut Self::IxAccounts) {
        let authority = fuzz_accounts
            .authority
            .get_or_create(SLOT_AUTHORITY, trident, None, None);
        let mint_pub = fuzz_accounts
            .mint
            .get_or_create(SLOT_MINT, trident, None, None);
        // Default new_authority = attacker slot (we expect this to fail in tests)
        let new_authority = fuzz_accounts
            .new_authority
            .get_or_create(SLOT_ATTACKER, trident, None, None);

        self.accounts.authority = authority;
        self.accounts.config = config_pda(&mint_pub);
        self.accounts.new_authority = new_authority;
    }

    fn set_signers(&mut self, fuzz_accounts: &mut Self::IxAccounts, signers: &mut Vec<Keypair>) {
        signers.push(fuzz_accounts.authority.get_keypair(SLOT_AUTHORITY));
    }
}

// ═══════════════════════════════════════════════════════════════
// FuzzAccounts — one AddressStorage field per named account role.
// Field names must match what trident-fuzz's derive macro expects,
// but can be arbitrary — we use them in InstructionSetters above.
// ═══════════════════════════════════════════════════════════════
#[derive(Default)]
pub struct FuzzAccounts {
    // signers / keypair-backed
    pub authority: AddressStorage,
    pub mint: AddressStorage,
    pub minter: AddressStorage,
    pub burner: AddressStorage,
    pub pauser: AddressStorage,
    pub blacklister: AddressStorage,
    pub seizer: AddressStorage,
    pub token_account_owner: AddressStorage,
    pub assignee: AddressStorage,
    pub new_authority: AddressStorage,

    // pubkey-only (PDAs, ATAs, program IDs — set via get_or_create with fixed slot 0
    // because their pubkey is always derived, never random)
    pub config: AddressStorage,

    // used as blacklist target
    pub address_to_blacklist: AddressStorage,
    pub address_to_remove: AddressStorage,
}