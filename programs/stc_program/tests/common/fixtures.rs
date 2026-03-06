use anchor_lang::prelude::Pubkey;
use solana_sdk::{native_token::LAMPORTS_PER_SOL, pubkey::Pubkey as Address};

pub const MINT_DECIMALS: u8 = 6;
pub const MINT_AMOUNT: u64 = 1_000_000_000; // 1000 tokens with 6 decimals
pub const AIRDROP_AMOUNT: u64 = 10 * LAMPORTS_PER_SOL;
pub const MINTER_QUOTA: u64 = 10_000_000_000; // 10,000 tokens

pub const TOKEN_2022_PROGRAM_ID: Pubkey =
    Pubkey::from_str_const("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");
pub const ASSOCIATED_TOKEN_PROGRAM_ID: Pubkey =
    Pubkey::from_str_const("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
pub const SYSTEM_PROGRAM_ID: Pubkey = Pubkey::from_str_const("11111111111111111111111111111111");

pub trait ToPubkey {
    fn to_pubkey(&self) -> Pubkey;
}

pub trait ToAddress {
    fn to_address(&self) -> Address;
}

impl ToPubkey for Address {
    fn to_pubkey(&self) -> Pubkey {
        Pubkey::from(self.to_bytes())
    }
}

impl ToAddress for Pubkey {
    fn to_address(&self) -> Address {
        Address::from(self.to_bytes())
    }
}
