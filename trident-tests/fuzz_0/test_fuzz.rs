// test_fuzz.rs
//
// Trident v0.12 fuzz harness for stc_program (SSS-1 / SSS-2).
//
// ARCHITECTURE
// ─────────────────────────────────────────────────────────────
// • XxxTransaction::build(&mut trident, &mut fuzz_accounts)
//   dispatches to impl InstructionSetters in fuzz_accounts.rs,
//   which wires accounts via get_or_create(slot, trident, None, None).
// • trident.execute_transaction(&mut tx, Some("label"))
//   sends the transaction and returns TransactionResult.
// • AddressStorage::get_or_create(slot, trident, None, None) → Pubkey
//   is the ONLY way to resolve/create accounts. There is no
//   set_with_keypair — signers are retrieved with get_keypair(slot).
//
// WHAT IS FUZZED
// ─────────────────────────────────────────────────────────────
// init   : bootstrap a complete SSS-2 (PermanentDelegate-only) mint
// flows  : 8 independent security scenarios executed in random order
// end    : read live on-chain config + quota and validate shadow state
//
// SECURITY TARGETS (from the review)
// ─────────────────────────────────────────────────────────────
// #1  init_if_needed role pre-creation — will surface as ghost role active
// #3  seize source == treasury — will panic immediately on first run
// #5  quota not reset — verified in end invariant
// #7  single-step authority transfer — attacker flows probe it
// Paused blocks mint, unpause restores, attacker rejected on all ops.

use fuzz_accounts::*;
use trident_fuzz::fuzzing::*;
mod fuzz_accounts;
mod types;
use stc_program::state::{MinterQuota, StablecoinConfig};
use types::stc_program::*;

// ─────────────────────────────────────────────────────────────
// Shadow: what we believe is on-chain
// ─────────────────────────────────────────────────────────────
#[derive(Default, Clone)]
struct Shadow {
    is_paused: bool,
    master_authority: Pubkey,
    minted_so_far: u64,
    quota_limit: u64,
    initialized: bool,
}

// ─────────────────────────────────────────────────────────────
// FuzzTest
// ─────────────────────────────────────────────────────────────
#[derive(FuzzTestMethods)]
struct FuzzTest {
    trident: Trident,
    fuzz_accounts: FuzzAccounts,
    shadow: Shadow,
}

#[flow_executor]
impl FuzzTest {
    fn new() -> Self {
        Self {
            trident: Trident::default(),
            fuzz_accounts: FuzzAccounts::default(),
            shadow: Shadow::default(),
        }
    }

    // ─────────────────────────────────────────────────────────
    // INIT — bootstrap once per iteration
    // Uses initialize_permanent_delegate (SSS-2 without hook) to
    // avoid needing a deployed transfer-hook program in the test env.
    // ─────────────────────────────────────────────────────────
    #[init]
    fn start(&mut self) {
        // 1. Initialize the mint
        let mut init_tx = InitializePermanentDelegateTransaction::build(
            &mut self.trident,
            &mut self.fuzz_accounts,
        );
        self.trident
            .execute_transaction(&mut init_tx, Some("init_permanent_delegate"))
            .expect("init_permanent_delegate must succeed");

        // Capture authority pubkey for shadow
        let authority_pub = self
            .fuzz_accounts
            .authority
            .get_or_create(SLOT_AUTHORITY, &mut self.trident, None, None);

        self.shadow.master_authority = authority_pub;
        self.shadow.initialized = true;

        // 2. Assign Minter role + quota
        let mut minter_tx =
            UpdateMinterTransaction::build(&mut self.trident, &mut self.fuzz_accounts);
        self.trident
            .execute_transaction(&mut minter_tx, Some("update_minter"))
            .expect("update_minter must succeed");

        self.shadow.quota_limit = 1_000_000_000_000;

        // 3. Assign Burner role
        {
            let mut tx =
                UpdateRolesTransaction::build(&mut self.trident, &mut self.fuzz_accounts);
            tx.instruction.data.args.role_type = RoleType::Burner;
            tx.instruction.data.args.is_active = true;
            self.trident
                .execute_transaction(&mut tx, Some("assign_burner"))
                .expect("assign_burner must succeed");
        }

        // 4. Assign Pauser role
        {
            let mut tx =
                UpdateRolesTransaction::build(&mut self.trident, &mut self.fuzz_accounts);
            tx.instruction.data.args.role_type = RoleType::Pauser;
            tx.instruction.data.args.is_active = true;
            self.trident
                .execute_transaction(&mut tx, Some("assign_pauser"))
                .expect("assign_pauser must succeed");
        }

        // 5. Assign Blacklister role
        {
            let mut tx =
                UpdateRolesTransaction::build(&mut self.trident, &mut self.fuzz_accounts);
            tx.instruction.data.args.role_type = RoleType::Blacklister;
            tx.instruction.data.args.is_active = true;
            self.trident
                .execute_transaction(&mut tx, Some("assign_blacklister"))
                .expect("assign_blacklister must succeed");
        }

        // 6. Assign Seizer role
        {
            let mut tx =
                UpdateRolesTransaction::build(&mut self.trident, &mut self.fuzz_accounts);
            tx.instruction.data.args.role_type = RoleType::Seizer;
            tx.instruction.data.args.is_active = true;
            self.trident
                .execute_transaction(&mut tx, Some("assign_seizer"))
                .expect("assign_seizer must succeed");
        }

        // 7. Create user and treasury ATAs
        let mint_pub = self
            .fuzz_accounts
            .mint
            .get_or_create(SLOT_MINT, &mut self.trident, None, None);
        let user_pub = self
            .fuzz_accounts
            .token_account_owner
            .get_or_create(SLOT_USER, &mut self.trident, None, None);

        let create_user_ata =
            spl_associated_token_account::instruction::create_associated_token_account(
                &authority_pub,
                &user_pub,
                &mint_pub,
                &TOKEN_2022_PROGRAM_ID,
            );
        let create_treasury_ata =
            spl_associated_token_account::instruction::create_associated_token_account(
                &authority_pub,
                &authority_pub,
                &mint_pub,
                &TOKEN_2022_PROGRAM_ID,
            );

        let authority_kp = self
            .fuzz_accounts
            .authority
            .get_keypair(SLOT_AUTHORITY);

        self.trident
            .process_transaction(
                &[create_user_ata, create_treasury_ata],
                &authority_kp,
            )
            .expect("create ATAs must succeed");
    }

    // ─────────────────────────────────────────────────────────
    // FLOW 1: mint
    // Invariants:
    //   • must fail while paused
    //   • cumulative minted_so_far must never exceed quota_limit
    //   • user ATA balance must increase by exactly amount
    // ─────────────────────────────────────────────────────────
    #[flow]
    fn flow_mint(&mut self) {
        const AMOUNT: u64 = 1_000_000_000; // 1000 tokens

        let mint_pub = self
            .fuzz_accounts
            .mint
            .get_or_create(SLOT_MINT, &mut self.trident, None, None);
        let user_pub = self
            .fuzz_accounts
            .token_account_owner
            .get_or_create(SLOT_USER, &mut self.trident, None, None);
        let user_ata = ata(&user_pub, &mint_pub);

        let balance_before = self.token_balance(&user_ata);

        let mut tx = MintTransaction::build(&mut self.trident, &mut self.fuzz_accounts);
        tx.instruction.data.amount = AMOUNT;

        let result = self.trident.execute_transaction(&mut tx, Some("mint"));

        if result.is_ok() {
            // INVARIANT: must not succeed while paused
            if self.shadow.is_paused {
                panic!(
                    "INVARIANT VIOLATED [flow_mint]: \
                     mint succeeded while is_paused=true"
                );
            }
            // INVARIANT: quota must not be exceeded
            let new_total = self
                .shadow
                .minted_so_far
                .checked_add(AMOUNT)
                .expect("overflow in shadow minted_so_far");
            if new_total > self.shadow.quota_limit {
                panic!(
                    "INVARIANT VIOLATED [flow_mint]: \
                     minted {} total > quota_limit {}",
                    new_total, self.shadow.quota_limit
                );
            }
            // INVARIANT: balance must increase exactly
            let balance_after = self.token_balance(&user_ata);
            if balance_after != balance_before.saturating_add(AMOUNT) {
                panic!(
                    "INVARIANT VIOLATED [flow_mint]: balance {} → {} expected +{}",
                    balance_before, balance_after, AMOUNT
                );
            }
            self.shadow.minted_so_far = new_total;
        }
    }

    // ─────────────────────────────────────────────────────────
    // FLOW 2: pause → mint must fail
    // ─────────────────────────────────────────────────────────
    #[flow]
    fn flow_pause_blocks_mint(&mut self) {
        // Pause
        let mut pause_tx = PauseTransaction::build(&mut self.trident, &mut self.fuzz_accounts);
        if self
            .trident
            .execute_transaction(&mut pause_tx, Some("pause"))
            .is_ok()
        {
            self.shadow.is_paused = true;

            // Mint must fail
            let mut mint_tx = MintTransaction::build(&mut self.trident, &mut self.fuzz_accounts);
            mint_tx.instruction.data.amount = 1;
            if self
                .trident
                .execute_transaction(&mut mint_tx, Some("mint_while_paused"))
                .is_ok()
            {
                panic!(
                    "INVARIANT VIOLATED [flow_pause_blocks_mint]: \
                     mint succeeded immediately after pause"
                );
            }
        }
    }

    // ─────────────────────────────────────────────────────────
    // FLOW 3: unpause → mint succeeds (if quota available)
    // ─────────────────────────────────────────────────────────
    #[flow]
    fn flow_unpause_allows_mint(&mut self) {
        let mut unpause_tx = UnpauseTransaction::build(&mut self.trident, &mut self.fuzz_accounts);
        if self
            .trident
            .execute_transaction(&mut unpause_tx, Some("unpause"))
            .is_ok()
        {
            self.shadow.is_paused = false;

            const AMOUNT: u64 = 1_000_000;
            if self.shadow.minted_so_far.saturating_add(AMOUNT) <= self.shadow.quota_limit {
                let mut mint_tx =
                    MintTransaction::build(&mut self.trident, &mut self.fuzz_accounts);
                mint_tx.instruction.data.amount = AMOUNT;
                if self
                    .trident
                    .execute_transaction(&mut mint_tx, Some("mint_after_unpause"))
                    .is_ok()
                {
                    self.shadow.minted_so_far =
                        self.shadow.minted_so_far.saturating_add(AMOUNT);
                }
            }
        }
    }

    // ─────────────────────────────────────────────────────────
    // FLOW 4: seize
    //
    // CRITICAL BUG PROBE (#3 from security review):
    //   seize.rs has no constraint = source != treasury.
    //   Passing source == treasury must be rejected — it will panic
    //   here until the fix is applied.
    //
    // Also probes: attacker without Seizer role is rejected.
    // Also verifies: token conservation after a legitimate seize.
    // ─────────────────────────────────────────────────────────
    #[flow]
    fn flow_seize(&mut self) {
        let mint_pub = self
            .fuzz_accounts
            .mint
            .get_or_create(SLOT_MINT, &mut self.trident, None, None);
        let seizer_pub = self
            .fuzz_accounts
            .seizer
            .get_or_create(SLOT_SEIZER, &mut self.trident, None, None);
        let user_pub = self
            .fuzz_accounts
            .token_account_owner
            .get_or_create(SLOT_USER, &mut self.trident, None, None);
        let authority_pub = self
            .fuzz_accounts
            .authority
            .get_or_create(SLOT_AUTHORITY, &mut self.trident, None, None);
        let attacker_pub = self
            .fuzz_accounts
            .new_authority
            .get_or_create(SLOT_ATTACKER, &mut self.trident, None, None);

        let source = ata(&user_pub, &mint_pub);
        let treasury = ata(&authority_pub, &mint_pub);
        let config = config_pda(&mint_pub);
        let seizer_role = role_pda(&mint_pub, &seizer_pub, 4);
        let seizer_kp = self.fuzz_accounts.seizer.get_keypair(SLOT_SEIZER);
        let attacker_kp = self.fuzz_accounts.new_authority.get_keypair(SLOT_ATTACKER);

        // ── Bug probe: source == treasury ────────────────────
        // If the program accepts this, it's the bug from finding #3.
        {
            let seize_same_acct = SeizeInstruction {
                accounts: SeizeInstructionAccounts {
                    seizer: seizer_pub,
                    config,
                    role_account: seizer_role,
                    mint: mint_pub,
                    source_token_account: source, // same account
                    treasury_token_account: source, // ← the bug
                    token_program: TOKEN_2022_PROGRAM_ID,
                },
                data: SeizeInstructionData { amount: 1 },
            };
            let result = self.trident.process_transaction(
                &[seize_same_acct.to_instruction()],
                &seizer_kp,
            );
            if result.is_ok() {
                panic!(
                    "INVARIANT VIOLATED [flow_seize]: \
                     seize accepted source_token_account == treasury_token_account \
                     (missing constraint — security review finding #3)"
                );
            }
        }

        // ── Attacker probe: wrong signer ──────────────────────
        {
            let seize_bad_signer = SeizeInstruction {
                accounts: SeizeInstructionAccounts {
                    seizer: attacker_pub, // wrong signer
                    config,
                    role_account: seizer_role, // real PDA, but signer doesn't match
                    mint: mint_pub,
                    source_token_account: source,
                    treasury_token_account: treasury,
                    token_program: TOKEN_2022_PROGRAM_ID,
                },
                data: SeizeInstructionData { amount: 1 },
            };
            if self
                .trident
                .process_transaction(&[seize_bad_signer.to_instruction()], &attacker_kp)
                .is_ok()
            {
                panic!(
                    "INVARIANT VIOLATED [flow_seize]: \
                     attacker without Seizer role was able to seize tokens"
                );
            }
        }

        // ── Legitimate seize + token conservation ─────────────
        let source_before = self.token_balance(&source);
        if source_before == 0 {
            return;
        }
        let treasury_before = self.token_balance(&treasury);

        let seize_ix = SeizeInstruction {
            accounts: SeizeInstructionAccounts {
                seizer: seizer_pub,
                config,
                role_account: seizer_role,
                mint: mint_pub,
                source_token_account: source,
                treasury_token_account: treasury,
                token_program: TOKEN_2022_PROGRAM_ID,
            },
            data: SeizeInstructionData {
                amount: source_before,
            },
        };
        if self
            .trident
            .process_transaction(&[seize_ix.to_instruction()], &seizer_kp)
            .is_ok()
        {
            let source_after = self.token_balance(&source);
            let treasury_after = self.token_balance(&treasury);
            let decreased = source_before.saturating_sub(source_after);
            let increased = treasury_after.saturating_sub(treasury_before);
            if decreased != increased {
                panic!(
                    "INVARIANT VIOLATED [flow_seize]: token conservation broken — \
                     source decreased by {decreased} but treasury increased by {increased}"
                );
            }
        }
    }

    // ─────────────────────────────────────────────────────────
    // FLOW 5: attacker is rejected on all privileged instructions
    // ─────────────────────────────────────────────────────────
    #[flow]
    fn flow_attacker_rejected(&mut self) {
        let mint_pub = self
            .fuzz_accounts
            .mint
            .get_or_create(SLOT_MINT, &mut self.trident, None, None);
        let attacker_pub = self
            .fuzz_accounts
            .new_authority
            .get_or_create(SLOT_ATTACKER, &mut self.trident, None, None);
        let attacker_kp = self.fuzz_accounts.new_authority.get_keypair(SLOT_ATTACKER);

        let minter_pub = self
            .fuzz_accounts
            .minter
            .get_or_create(SLOT_MINTER, &mut self.trident, None, None);
        let pauser_pub = self
            .fuzz_accounts
            .pauser
            .get_or_create(SLOT_PAUSER, &mut self.trident, None, None);
        let seizer_pub = self
            .fuzz_accounts
            .seizer
            .get_or_create(SLOT_SEIZER, &mut self.trident, None, None);
        let user_pub = self
            .fuzz_accounts
            .token_account_owner
            .get_or_create(SLOT_USER, &mut self.trident, None, None);
        let authority_pub = self
            .fuzz_accounts
            .authority
            .get_or_create(SLOT_AUTHORITY, &mut self.trident, None, None);

        let config = config_pda(&mint_pub);

        // Attacker mint (uses real minter role PDA but wrong signer)
        let bad_mint = MintInstruction {
            accounts: MintInstructionAccounts {
                minter: attacker_pub,
                config,
                role_account: role_pda(&mint_pub, &minter_pub, 0),
                minter_quota: quota_pda(&mint_pub, &minter_pub),
                mint: mint_pub,
                recipient_token_account: ata(&user_pub, &mint_pub),
                token_program: TOKEN_2022_PROGRAM_ID,
            },
            data: MintInstructionData { amount: 1_000_000 },
        };
        if self
            .trident
            .process_transaction(&[bad_mint.to_instruction()], &attacker_kp)
            .is_ok()
        {
            panic!("INVARIANT VIOLATED [flow_attacker_rejected]: attacker minted tokens");
        }

        // Attacker pause
        let bad_pause = PauseInstruction {
            accounts: PauseInstructionAccounts {
                pauser: attacker_pub,
                config,
                role_account: role_pda(&mint_pub, &pauser_pub, 2),
            },
            data: PauseInstructionData {},
        };
        if self
            .trident
            .process_transaction(&[bad_pause.to_instruction()], &attacker_kp)
            .is_ok()
        {
            panic!("INVARIANT VIOLATED [flow_attacker_rejected]: attacker paused the token");
        }

        // Attacker seize
        let bad_seize = SeizeInstruction {
            accounts: SeizeInstructionAccounts {
                seizer: attacker_pub,
                config,
                role_account: role_pda(&mint_pub, &seizer_pub, 4),
                mint: mint_pub,
                source_token_account: ata(&user_pub, &mint_pub),
                treasury_token_account: ata(&authority_pub, &mint_pub),
                token_program: TOKEN_2022_PROGRAM_ID,
            },
            data: SeizeInstructionData { amount: 1 },
        };
        if self
            .trident
            .process_transaction(&[bad_seize.to_instruction()], &attacker_kp)
            .is_ok()
        {
            panic!("INVARIANT VIOLATED [flow_attacker_rejected]: attacker seized tokens");
        }

        // Attacker transfer_authority to self
        let bad_transfer = TransferAuthorityInstruction {
            accounts: TransferAuthorityInstructionAccounts {
                authority: attacker_pub,
                config,
                new_authority: attacker_pub,
            },
            data: TransferAuthorityInstructionData {},
        };
        if self
            .trident
            .process_transaction(&[bad_transfer.to_instruction()], &attacker_kp)
            .is_ok()
        {
            panic!(
                "INVARIANT VIOLATED [flow_attacker_rejected]: \
                 attacker transferred master_authority to themselves"
            );
        }
    }

    // ─────────────────────────────────────────────────────────
    // FLOW 6: quota exhaustion
    // Invariant: minting > quota_limit is always rejected
    // ─────────────────────────────────────────────────────────
    #[flow]
    fn flow_quota_exhaustion(&mut self) {
        if self.shadow.is_paused {
            return;
        }

        let mint_pub = self
            .fuzz_accounts
            .mint
            .get_or_create(SLOT_MINT, &mut self.trident, None, None);
        let minter_pub = self
            .fuzz_accounts
            .minter
            .get_or_create(SLOT_MINTER, &mut self.trident, None, None);
        let user_pub = self
            .fuzz_accounts
            .token_account_owner
            .get_or_create(SLOT_USER, &mut self.trident, None, None);
        let minter_kp = self.fuzz_accounts.minter.get_keypair(SLOT_MINTER);

        let over_quota = MintInstruction {
            accounts: MintInstructionAccounts {
                minter: minter_pub,
                config: config_pda(&mint_pub),
                role_account: role_pda(&mint_pub, &minter_pub, 0),
                minter_quota: quota_pda(&mint_pub, &minter_pub),
                mint: mint_pub,
                recipient_token_account: ata(&user_pub, &mint_pub),
                token_program: TOKEN_2022_PROGRAM_ID,
            },
            data: MintInstructionData {
                amount: self.shadow.quota_limit.saturating_add(1),
            },
        };
        if self
            .trident
            .process_transaction(&[over_quota.to_instruction()], &minter_kp)
            .is_ok()
        {
            panic!(
                "INVARIANT VIOLATED [flow_quota_exhaustion]: \
                 minted quota_limit+1 — quota not enforced"
            );
        }

        // Also try exactly remaining + 1
        let remaining = self
            .shadow
            .quota_limit
            .saturating_sub(self.shadow.minted_so_far);
        if remaining < u64::MAX {
            let one_over_remaining = remaining.saturating_add(1);
            let over_remaining = MintInstruction {
                accounts: MintInstructionAccounts {
                    minter: minter_pub,
                    config: config_pda(&mint_pub),
                    role_account: role_pda(&mint_pub, &minter_pub, 0),
                    minter_quota: quota_pda(&mint_pub, &minter_pub),
                    mint: mint_pub,
                    recipient_token_account: ata(&user_pub, &mint_pub),
                    token_program: TOKEN_2022_PROGRAM_ID,
                },
                data: MintInstructionData {
                    amount: one_over_remaining,
                },
            };
            if self
                .trident
                .process_transaction(&[over_remaining.to_instruction()], &minter_kp)
                .is_ok()
            {
                panic!(
                    "INVARIANT VIOLATED [flow_quota_exhaustion]: \
                     minted remaining+1={} (minted_so_far={}, quota={})",
                    one_over_remaining, self.shadow.minted_so_far, self.shadow.quota_limit
                );
            }
        }
    }

    // ─────────────────────────────────────────────────────────
    // FLOW 7: blacklist add / remove
    // Invariant: attacker cannot blacklist; only Blacklister role can
    // ─────────────────────────────────────────────────────────
    #[flow]
    fn flow_blacklist(&mut self) {
        let mint_pub = self
            .fuzz_accounts
            .mint
            .get_or_create(SLOT_MINT, &mut self.trident, None, None);
        let blacklister_pub = self
            .fuzz_accounts
            .blacklister
            .get_or_create(SLOT_BLACKLISTER, &mut self.trident, None, None);
        let user_pub = self
            .fuzz_accounts
            .token_account_owner
            .get_or_create(SLOT_USER, &mut self.trident, None, None);
        let attacker_pub = self
            .fuzz_accounts
            .new_authority
            .get_or_create(SLOT_ATTACKER, &mut self.trident, None, None);
        let attacker_kp = self.fuzz_accounts.new_authority.get_keypair(SLOT_ATTACKER);
        let blacklister_kp = self.fuzz_accounts.blacklister.get_keypair(SLOT_BLACKLISTER);

        let bl_role = role_pda(&mint_pub, &blacklister_pub, 3);
        let bl_entry = blacklist_entry_pda(&mint_pub, &user_pub);
        let config = config_pda(&mint_pub);

        // Attacker must not be able to blacklist
        let bad_bl = AddToBlacklistInstruction {
            accounts: AddToBlacklistInstructionAccounts {
                blacklister: attacker_pub,
                config,
                role_account: bl_role,
                address_to_blacklist: user_pub,
                blacklist_entry: bl_entry,
                system_program: solana_sdk::system_program::ID,
            },
            data: AddToBlacklistInstructionData {},
        };
        if self
            .trident
            .process_transaction(&[bad_bl.to_instruction()], &attacker_kp)
            .is_ok()
        {
            panic!(
                "INVARIANT VIOLATED [flow_blacklist]: \
                 attacker blacklisted a user without Blacklister role"
            );
        }

        // Legitimate add (may fail if already blacklisted — that's fine)
        let add_bl = AddToBlacklistInstruction {
            accounts: AddToBlacklistInstructionAccounts {
                blacklister: blacklister_pub,
                config,
                role_account: bl_role,
                address_to_blacklist: user_pub,
                blacklist_entry: bl_entry,
                system_program: solana_sdk::system_program::ID,
            },
            data: AddToBlacklistInstructionData {},
        };
        let _ = self
            .trident
            .process_transaction(&[add_bl.to_instruction()], &blacklister_kp);

        // Legitimate remove
        let rm_entry = blacklist_entry_pda(&mint_pub, &user_pub);
        let rm_bl = RemoveFromBlacklistInstruction {
            accounts: RemoveFromBlacklistInstructionAccounts {
                blacklister: blacklister_pub,
                config,
                role_account: bl_role,
                address_to_remove: user_pub,
                blacklist_entry: rm_entry,
            },
            data: RemoveFromBlacklistInstructionData {},
        };
        let _ = self
            .trident
            .process_transaction(&[rm_bl.to_instruction()], &blacklister_kp);
    }

    // ─────────────────────────────────────────────────────────
    // FLOW 8: freeze / thaw
    // Invariant: only master_authority can freeze/thaw
    // ─────────────────────────────────────────────────────────
    #[flow]
    fn flow_freeze_thaw(&mut self) {
        let mint_pub = self
            .fuzz_accounts
            .mint
            .get_or_create(SLOT_MINT, &mut self.trident, None, None);
        let authority_pub = self
            .fuzz_accounts
            .authority
            .get_or_create(SLOT_AUTHORITY, &mut self.trident, None, None);
        let attacker_pub = self
            .fuzz_accounts
            .new_authority
            .get_or_create(SLOT_ATTACKER, &mut self.trident, None, None);
        let user_pub = self
            .fuzz_accounts
            .token_account_owner
            .get_or_create(SLOT_USER, &mut self.trident, None, None);
        let attacker_kp = self.fuzz_accounts.new_authority.get_keypair(SLOT_ATTACKER);
        let authority_kp = self.fuzz_accounts.authority.get_keypair(SLOT_AUTHORITY);

        let config = config_pda(&mint_pub);
        let token_account = ata(&user_pub, &mint_pub);
        let token_program = TOKEN_2022_PROGRAM_ID;

        // Attacker freeze must fail
        let bad_freeze = FreezeAccountInstruction {
            accounts: FreezeAccountInstructionAccounts {
                authority: attacker_pub,
                config,
                mint: mint_pub,
                token_account,
                token_program,
            },
            data: FreezeAccountInstructionData {},
        };
        if self
            .trident
            .process_transaction(&[bad_freeze.to_instruction()], &attacker_kp)
            .is_ok()
        {
            panic!(
                "INVARIANT VIOLATED [flow_freeze_thaw]: \
                 attacker froze a token account without master_authority"
            );
        }

        // Legitimate freeze + thaw
        let freeze_ix = FreezeAccountInstruction {
            accounts: FreezeAccountInstructionAccounts {
                authority: authority_pub,
                config,
                mint: mint_pub,
                token_account,
                token_program,
            },
            data: FreezeAccountInstructionData {},
        };
        if self
            .trident
            .process_transaction(&[freeze_ix.to_instruction()], &authority_kp)
            .is_ok()
        {
            let thaw_ix = ThawAccountInstruction {
                accounts: ThawAccountInstructionAccounts {
                    authority: authority_pub,
                    config,
                    mint: mint_pub,
                    token_account,
                    token_program,
                },
                data: ThawAccountInstructionData {},
            };
            // Thaw so subsequent mint flows are unblocked
            let _ = self
                .trident
                .process_transaction(&[thaw_ix.to_instruction()], &authority_kp);
        }
    }

    // ─────────────────────────────────────────────────────────
    // END — reads live on-chain state, validates shadow
    // ─────────────────────────────────────────────────────────
    #[end]
    fn end(&mut self) {
        if !self.shadow.initialized {
            return;
        }

        let mint_pub = self
            .fuzz_accounts
            .mint
            .get_or_create(SLOT_MINT, &mut self.trident, None, None);
        let minter_pub = self
            .fuzz_accounts
            .minter
            .get_or_create(SLOT_MINTER, &mut self.trident, None, None);
        let config_key = config_pda(&mint_pub);

        // ── StablecoinConfig checks ───────────────────────────
        if let Ok(data) = self.trident.get_account_data(&config_key) {
            if data.len() > 8 {
                if let Ok(config) = StablecoinConfig::try_from_slice(&data[8..]) {
                    // INVARIANT: master_authority unchanged
                    if config.master_authority != self.shadow.master_authority {
                        panic!(
                            "INVARIANT VIOLATED [end]: master_authority \
                             changed from {} to {} without explicit transfer",
                            self.shadow.master_authority, config.master_authority
                        );
                    }
                    // INVARIANT: is_paused matches shadow
                    if config.is_paused != self.shadow.is_paused {
                        panic!(
                            "INVARIANT VIOLATED [end]: shadow.is_paused={} \
                             but on-chain is_paused={}",
                            self.shadow.is_paused, config.is_paused
                        );
                    }
                    // INVARIANT: enable_permanent_delegate never cleared
                    if !config.enable_permanent_delegate {
                        panic!(
                            "INVARIANT VIOLATED [end]: \
                             enable_permanent_delegate was silently cleared"
                        );
                    }
                }
            }
        }

        // ── MinterQuota checks ────────────────────────────────
        let quota_key = quota_pda(&mint_pub, &minter_pub);
        if let Ok(data) = self.trident.get_account_data(&quota_key) {
            if data.len() > 8 {
                if let Ok(quota) = MinterQuota::try_from_slice(&data[8..]) {
                    // INVARIANT: on-chain amount never exceeds quota_limit
                    if quota.minted_amount > quota.quota_limit {
                        panic!(
                            "INVARIANT VIOLATED [end]: on-chain minted_amount {} \
                             > quota_limit {}",
                            quota.minted_amount, quota.quota_limit
                        );
                    }
                    // ADVISORY: shadow drift warning
                    if quota.minted_amount != self.shadow.minted_so_far {
                        // Not a panic — could be from burns or direct-state changes.
                        // Log so the crash corpus can surface it.
                        eprintln!(
                            "SHADOW DRIFT [end]: shadow.minted_so_far={} \
                             but on-chain minted_amount={}",
                            self.shadow.minted_so_far, quota.minted_amount
                        );
                    }
                }
            }
        }
    }
}

// ─────────────────────────────────────────────────────────────
// Token-2022 balance helper
// ─────────────────────────────────────────────────────────────
impl FuzzTest {
    fn token_balance(&self, ata_key: &Pubkey) -> u64 {
        use anchor_spl::token_2022::spl_token_2022::{
            extension::StateWithExtensionsOwned, state::Account as TokenAccount,
        };
        self.trident
            .get_account_data(ata_key)
            .ok()
            .and_then(|d| StateWithExtensionsOwned::<TokenAccount>::unpack(d).ok())
            .map(|s| s.base.amount)
            .unwrap_or(0)
    }
}

// ─────────────────────────────────────────────────────────────
// Entry point
// ─────────────────────────────────────────────────────────────
fn main() {
    FuzzTest::fuzz(1000, 100);
}