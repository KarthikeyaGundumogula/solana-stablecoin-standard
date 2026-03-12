use trident_fuzz::fuzzing::*;

/// Storage for all account addresses used in fuzz testing.
///
/// This struct serves as a centralized repository for account addresses,
/// enabling their reuse across different instruction flows and test scenarios.
///
/// Docs: https://ackee.xyz/trident/docs/latest/trident-api-macro/trident-types/fuzz-accounts/
#[derive(Default)]
pub struct AccountAddresses {
    pub source_token_account: AddressStorage,

    pub mint: AddressStorage,

    pub destination_token_account: AddressStorage,

    pub source_authority: AddressStorage,

    pub extra_account_meta_list: AddressStorage,

    pub source_blacklist_entry: AddressStorage,

    pub destination_blacklist_entry: AddressStorage,

    pub stc_program_id: AddressStorage,

    pub payer: AddressStorage,

    pub system_program: AddressStorage,

    pub blacklister: AddressStorage,

    pub config: AddressStorage,

    pub role_account: AddressStorage,

    pub address_to_blacklist: AddressStorage,

    pub blacklist_entry: AddressStorage,

    pub burner: AddressStorage,

    pub token_account: AddressStorage,

    pub token_account_owner: AddressStorage,

    pub token_program: AddressStorage,

    pub authority: AddressStorage,

    pub transfer_hook_program: AddressStorage,

    pub minter: AddressStorage,

    pub minter_quota: AddressStorage,

    pub recipient_token_account: AddressStorage,

    pub pauser: AddressStorage,

    pub address_to_remove: AddressStorage,

    pub seizer: AddressStorage,

    pub treasury_token_account: AddressStorage,

    pub new_authority: AddressStorage,

    pub assignee: AddressStorage,
}
