use litesvm::LiteSVM;
use solana_sdk::{pubkey::Pubkey, signature::Keypair, signer::Signer};
use std::path::PathBuf;

use stc_program::ID as STC_PROGRAM_ID;

use super::fixtures::*;

pub struct Setup {
    pub svm: LiteSVM,
    pub authority: Keypair,
    pub minter: Keypair,
    pub burner: Keypair,
    pub pauser: Keypair,
    pub blacklister: Keypair,
    pub seizer: Keypair,
    pub user: Keypair,
    pub mint_signer: Keypair,
    pub mint: Pubkey,
    pub config: Pubkey,
}

impl Setup {
    pub fn new() -> Self {
        let mut svm = LiteSVM::new();

        // Create keypairs for all roles
        let authority = Keypair::new();
        let minter = Keypair::new();
        let burner = Keypair::new();
        let pauser = Keypair::new();
        let blacklister = Keypair::new();
        let seizer = Keypair::new();
        let user = Keypair::new();

        // Airdrop SOL to all accounts
        for kp in [
            &authority,
            &minter,
            &burner,
            &pauser,
            &blacklister,
            &seizer,
            &user,
        ] {
            svm.airdrop(&kp.pubkey(), AIRDROP_AMOUNT)
                .expect("Failed to airdrop SOL");
        }

        let program_id = Pubkey::from_str_const(&STC_PROGRAM_ID.to_string());

        // Load stc_program
        Self::load_program(&mut svm, program_id, "stc_program.so");

        let mint_signer = Keypair::new();
        let mint = mint_signer.pubkey();

        // Derive config PDA
        let (config, _) =
            Pubkey::find_program_address(&[b"stablecoin_config", mint.as_ref()], &program_id);

        Setup {
            svm,
            authority,
            minter,
            burner,
            pauser,
            blacklister,
            seizer,
            user,
            mint_signer,
            mint,
            config,
        }
    }

    fn load_program(svm: &mut LiteSVM, program_id: Pubkey, so_name: &str) {
        let so_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("../../target/deploy")
            .join(so_name);
        let program_data = std::fs::read(&so_path)
            .unwrap_or_else(|_| panic!("Failed to read program SO file: {:?}", so_path));
        let _ = svm.add_program(program_id, &program_data);
    }

    /// Derive a role PDA
    pub fn role_pda(&self, assignee: &Pubkey, role_type: u8) -> Pubkey {
        let program_id = Pubkey::from_str_const(&STC_PROGRAM_ID.to_string());
        Pubkey::find_program_address(
            &[b"role", self.mint.as_ref(), assignee.as_ref(), &[role_type]],
            &program_id,
        )
        .0
    }

    /// Derive a minter quota PDA
    pub fn minter_quota_pda(&self, minter: &Pubkey) -> Pubkey {
        let program_id = Pubkey::from_str_const(&STC_PROGRAM_ID.to_string());
        Pubkey::find_program_address(
            &[b"minter_quota", self.mint.as_ref(), minter.as_ref()],
            &program_id,
        )
        .0
    }

    /// Derive a blacklist entry PDA
    pub fn blacklist_pda(&self, address: &Pubkey) -> Pubkey {
        let program_id = Pubkey::from_str_const(&STC_PROGRAM_ID.to_string());
        Pubkey::find_program_address(
            &[b"blacklist", self.mint.as_ref(), address.as_ref()],
            &program_id,
        )
        .0
    }
}
