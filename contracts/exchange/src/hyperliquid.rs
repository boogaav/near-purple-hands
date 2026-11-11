// HyperEVM BTC messages are authenticated separately by the NEAR Wormhole core.
use near_sdk::{
    borsh::{BorshDeserialize, BorshSerialize},
    env,
};

pub const CONFIG_KEY: &[u8] = b"hyperliquid-oracle-v1";
pub const VERIFIER: &str = "contract.wormhole_crypto.near";
const EMITTER: [u8; 20] = [
    0x1e, 0x65, 0x5b, 0x93, 0xfb, 0xf7, 0xf6, 0x42, 0x51, 0xb7, 0xfa, 0xe7, 0x1a, 0x32, 0x5b, 0x82,
    0x60, 0xbc, 0x1b, 0x47,
];
#[derive(BorshDeserialize, BorshSerialize)]
#[borsh(crate = "near_sdk::borsh")]
pub struct Config {
    pub next_sequence: u64,
}
pub fn config() -> Option<Config> {
    env::storage_read(CONFIG_KEY)
        .map(|bytes| borsh::from_slice(&bytes).expect("Oracle configuration"))
}
pub fn save(config: &Config) {
    env::storage_write(CONFIG_KEY, &borsh::to_vec(config).unwrap());
}
pub struct Quote {
    pub sequence: u64,
    pub observed_at: u64,
    pub price: u64,
}
fn word(bytes: &[u8]) -> Result<u64, &'static str> {
    if bytes.len() != 32 || bytes[..24].iter().any(|b| *b != 0) {
        return Err("Invalid ABI integer");
    }
    Ok(u64::from_be_bytes(bytes[24..].try_into().unwrap()))
}
pub fn parse(bytes: &[u8]) -> Result<Quote, &'static str> {
    if bytes.len() < 6 || bytes[0] != 1 || bytes[5] == 0 || bytes[5] > 32 {
        return Err("Invalid VAA header");
    }
    let body_at = 6 + usize::from(bytes[5]) * 66;
    let body = bytes.get(body_at..).ok_or("Truncated VAA")?;
    if body.len() != 51 + 192 {
        return Err("Invalid VAA length");
    }
    if body[8..10] != 47u16.to_be_bytes()
        || body[10..22] != [0; 12]
        || body[22..42] != EMITTER
        || body[50] != 0
    {
        return Err("Unexpected source");
    }
    let payload = &body[51..];
    if &payload[..4] != b"YHB1" || payload[4..32] != [0; 28] || word(&payload[32..64])? != 0 {
        return Err("Unexpected BTC payload");
    }
    let bid = word(&payload[64..96])?;
    let ask = word(&payload[96..128])?;
    let _block = word(&payload[128..160])?;
    let observed_at = word(&payload[160..192])?;
    if observed_at != u64::from(u32::from_be_bytes(body[..4].try_into().unwrap())) {
        return Err("Source timestamps disagree");
    }
    if bid == 0
        || ask < bid
        || ask > 10_000_000
        || u128::from(ask - bid) * 10_000 > u128::from(bid) * 5
    {
        return Err("Invalid or wide BTC book");
    }
    Ok(Quote {
        sequence: u64::from_be_bytes(body[42..50].try_into().unwrap()),
        observed_at,
        price: (bid + ask) * 50_000,
    })
}
pub fn hex(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    const FIXTURE: &[u8] = include_bytes!("hyperliquid-fixture.bin");
    #[test]
    fn parses_authenticated_mainnet_fixture() {
        let quote = parse(FIXTURE).unwrap();
        assert_eq!(quote.sequence, 0);
        assert_eq!(quote.price, 73_806_500_000);
    }
    #[test]
    fn rejects_wrong_source_and_market() {
        let body = 6 + usize::from(FIXTURE[5]) * 66;
        for offset in [
            body + 8,
            body + 10,
            body + 22,
            body + 50,
            body + 51,
            body + 51 + 63,
        ] {
            let mut changed = FIXTURE.to_vec();
            changed[offset] ^= 1;
            assert!(parse(&changed).is_err());
        }
    }
    #[test]
    fn rejects_truncated_or_extended_payload() {
        for end in 0..FIXTURE.len() {
            assert!(parse(&FIXTURE[..end]).is_err());
        }
        let mut extra = FIXTURE.to_vec();
        extra.push(0);
        assert!(parse(&extra).is_err());
    }
}
