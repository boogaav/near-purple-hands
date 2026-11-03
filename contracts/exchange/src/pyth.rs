//! Narrow Pyth Pro Ed25519/standard-LE verifier candidate. Not a provider-endorsed NEAR receiver.
//! Wire specification: pyth-network/pyth-lazer-public sdk/rust/protocol/{message,payload/standard}.rs.
use near_sdk::{
    borsh::{BorshDeserialize, BorshSerialize},
    env,
};

#[derive(BorshDeserialize, BorshSerialize)]
#[borsh(crate = "near_sdk::borsh")]
pub struct Config {
    pub signer: [u8; 32],
    pub expires_at: u64,
    pub feed: u32,
    pub channel: u8,
    pub max_confidence_bps: u16,
}
#[derive(Debug)]
pub struct Quote {
    pub price: u64,
    pub observed_us: u64,
}
type Result<T> = std::result::Result<T, &'static str>;
fn require(ok: bool, why: &'static str) -> Result<()> {
    if ok {
        Ok(())
    } else {
        Err(why)
    }
}
struct Reader<'a> {
    bytes: &'a [u8],
    pos: usize,
}
impl<'a> Reader<'a> {
    fn take<const N: usize>(&mut self) -> Result<[u8; N]> {
        let end = self.pos.checked_add(N).ok_or("Length overflow")?;
        let value = self
            .bytes
            .get(self.pos..end)
            .ok_or("Truncated payload")?
            .try_into()
            .map_err(|_| "Invalid length")?;
        self.pos = end;
        Ok(value)
    }
    fn u8(&mut self) -> Result<u8> {
        Ok(self.take::<1>()?[0])
    }
    fn u16(&mut self) -> Result<u16> {
        Ok(u16::from_le_bytes(self.take()?))
    }
    fn u32(&mut self) -> Result<u32> {
        Ok(u32::from_le_bytes(self.take()?))
    }
    fn u64(&mut self) -> Result<u64> {
        Ok(u64::from_le_bytes(self.take()?))
    }
    fn i64(&mut self) -> Result<i64> {
        Ok(i64::from_le_bytes(self.take()?))
    }
}
impl Config {
    pub fn validate(&self, now: u64) -> Result<()> {
        require(
            self.signer != [0; 32] && self.expires_at > now,
            "Invalid or expired signer",
        )?;
        require(
            self.feed > 0 && (1..=4).contains(&self.channel),
            "Invalid feed or channel",
        )?;
        require(
            (1..=5).contains(&self.max_confidence_bps),
            "Invalid confidence limit",
        )
    }
    pub fn verify(&self, bytes: &[u8], now_us: u64, previous_us: u64) -> Result<Quote> {
        self.validate(now_us / 1_000_000)?;
        require(bytes.len() <= 1024, "Oversized payload")?;
        let mut r = Reader { bytes, pos: 0 };
        require(r.u32()? == 2182742457, "Wrong signed message format")?;
        let signature = r.take::<64>()?;
        require(r.take::<32>()? == self.signer, "Untrusted signer")?;
        let len = r.u16()? as usize;
        require(bytes.len() == r.pos + len, "Invalid envelope length")?;
        let payload = &bytes[r.pos..];
        require(
            env::ed25519_verify(&signature, payload, &self.signer),
            "Invalid provider signature",
        )?;
        self.parse(payload, now_us, previous_us)
    }
    fn parse(&self, payload: &[u8], now_us: u64, previous_us: u64) -> Result<Quote> {
        let mut r = Reader {
            bytes: payload,
            pos: 0,
        };
        require(r.u32()? == 2479346549, "Wrong payload format")?;
        let timestamp = r.u64()?;
        require(r.u8()? == self.channel, "Wrong channel")?;
        require(r.u8()? == 1, "Expected exactly one price feed")?;
        require(r.u32()? == self.feed, "Wrong feed")?;
        let count = r.u8()?;
        require(count <= 13, "Too many properties")?;
        let (
            mut seen,
            mut price,
            mut exponent,
            mut confidence,
            mut publishers,
            mut session,
            mut observed,
        ) = (0u16, 0i64, 0i16, 0i64, 0u16, -1i16, 0u64);
        for _ in 0..count {
            let id = r.u8()?;
            require(id <= 12, "Unknown property")?;
            require(seen & (1 << id) == 0, "Duplicate property")?;
            seen |= 1 << id;
            match id {
                0 => price = r.i64()?,
                1 | 2 | 10 | 11 => {
                    r.i64()?;
                }
                3 => publishers = r.u16()?,
                4 => exponent = i16::from_le_bytes(r.take()?),
                5 => confidence = r.i64()?,
                6..=8 | 12 => {
                    let present = r.u8()?;
                    require(present <= 1, "Invalid option tag")?;
                    if present == 1 {
                        let n = r.u64()?;
                        if id == 12 {
                            observed = n;
                        }
                    }
                }
                9 => session = i16::from_le_bytes(r.take()?),
                _ => unreachable!(),
            }
        }
        let required = (1 << 0) | (1 << 3) | (1 << 4) | (1 << 5) | (1 << 9) | (1 << 12);
        require(seen & required == required, "Missing settlement properties")?;
        require(r.pos == payload.len(), "Trailing payload bytes")?;
        require(
            price > 0 && confidence > 0 && publishers >= 3 && session == 0,
            "Invalid market quality",
        )?;
        require(
            (confidence as u128) * 10_000 <= (price as u128) * (self.max_confidence_bps as u128),
            "Confidence too wide",
        )?;
        require(
            observed > previous_us
                && observed <= timestamp
                && timestamp <= now_us
                && now_us - observed <= 2_000_000,
            "Stale, future or replayed observation",
        )?;
        require((-12..=0).contains(&exponent), "Unsupported exponent")?;
        let shift = exponent + 6;
        let scaled = if shift >= 0 {
            (price as u128) * 10u128.pow(shift as u32)
        } else {
            (price as u128) / 10u128.pow((-shift) as u32)
        };
        require(
            scaled > 0 && scaled <= 1_000_000_000_000,
            "Price outside engine bounds",
        )?;
        Ok(Quote {
            price: scaled as u64,
            observed_us: observed,
        })
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    fn fixture() -> Vec<u8> {
        let h = include_str!("pyth-fixture.hex").trim();
        (0..h.len())
            .step_by(2)
            .map(|i| u8::from_str_radix(&h[i..i + 2], 16).unwrap())
            .collect()
    }
    fn setup() -> (Config, Vec<u8>, u64) {
        near_sdk::testing_env!(near_sdk::test_utils::VMContextBuilder::new().build());
        let data = fixture();
        let t = 1771339368200000;
        (
            Config {
                signer: data[68..100].try_into().unwrap(),
                expires_at: t / 1_000_000 + 3600,
                feed: 1,
                channel: 3,
                max_confidence_bps: 5,
            },
            data,
            t,
        )
    }
    #[test]
    fn authentic_upstream_fixture_verifies() {
        let (c, b, t) = setup();
        let q = c.verify(&b, t, 0).unwrap();
        assert_eq!(q.price, 67_134_362_876);
        assert_eq!(q.observed_us, t);
    }
    #[test]
    fn all_truncations_and_trailing_bytes_rejected() {
        let (c, b, t) = setup();
        for i in 0..b.len() {
            assert!(c.verify(&b[..i], t, 0).is_err());
        }
        let mut extra = b;
        extra.push(0);
        assert!(c.verify(&extra, t, 0).is_err());
    }
    #[test]
    fn tampering_wrong_signer_and_wrong_feed_rejected() {
        let (mut c, b, t) = setup();
        let mut bad = b.clone();
        *bad.last_mut().unwrap() ^= 1;
        assert!(c.verify(&bad, t, 0).is_err());
        c.signer[0] ^= 1;
        assert!(c.verify(&b, t, 0).is_err());
        c.signer[0] ^= 1;
        c.feed = 2;
        assert!(c.verify(&b, t, 0).is_err());
    }
    #[test]
    fn expiry_replay_future_stale_and_confidence_rejected() {
        let (mut c, b, t) = setup();
        assert!(c.verify(&b, t, t).is_err());
        assert!(c.verify(&b, t - 1, 0).is_err());
        assert!(c.verify(&b, t + 2_000_001, 0).is_err());
        c.expires_at = t / 1_000_000;
        assert!(c.verify(&b, t, 0).is_err());
        c.expires_at += 3600;
        c.max_confidence_bps = 1;
        assert!(c.verify(&b, t, 0).is_err());
    }
}
