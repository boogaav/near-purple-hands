//! Native NEAR adapter; bounded local/testnet prototype.
mod pyth;
use near_sdk::{
    assert_one_yocto, env,
    json_types::{Base64VecU8, U128, U64},
    near, AccountId, Gas, NearToken, PanicOnDefault, Promise, PromiseError, PromiseOrValue,
};
use purple_engine::{Engine, Outcome};
use std::collections::BTreeMap;
#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Exchange {
    engine: Engine,
    token: AccountId,
    oracle: AccountId,
    guardian: AccountId,
    withdrawals: BTreeMap<AccountId, u64>,
    verified_oracle: Option<pyth::Config>,
    last_verified_us: u64,
}
fn check<T>(r: Result<T, String>) -> T {
    r.unwrap_or_else(|e| env::panic_str(&e))
}
fn now() -> u64 {
    env::block_timestamp() / 1_000_000_000
}
fn actor() -> String {
    env::predecessor_account_id().to_string()
}
#[near]
impl Exchange {
    #[cfg(any(test, feature = "test-oracle"))]
    #[init]
    pub fn new(token: AccountId, oracle: AccountId, guardian: AccountId) -> Self {
        Self {
            engine: Engine {
                paused: true,
                ..Engine::default()
            },
            token,
            oracle,
            guardian,
            withdrawals: BTreeMap::new(),
            verified_oracle: None,
            last_verified_us: 0,
        }
    }
    /// Candidate verified-only initialization. Signer provenance must be independently checked.
    /// No in-contract signer replacement or manual-price fallback exists in this mode.
    #[init]
    pub fn new_verified(
        token: AccountId,
        guardian: AccountId,
        signer: [u8; 32],
        signer_expires_at: u64,
        feed: u32,
        channel: u8,
        max_confidence_bps: u16,
    ) -> Self {
        let config = pyth::Config {
            signer,
            expires_at: signer_expires_at,
            feed,
            channel,
            max_confidence_bps,
        };
        config.validate(now()).unwrap_or_else(|e| env::panic_str(e));
        Self {
            engine: Engine {
                paused: true,
                ..Engine::default()
            },
            token,
            oracle: env::current_account_id(),
            guardian,
            withdrawals: BTreeMap::new(),
            verified_oracle: Some(config),
            last_verified_us: 0,
        }
    }
    pub fn get_oracle_config(&self) -> near_sdk::serde_json::Value {
        match &self.verified_oracle {
            Some(c) => near_sdk::serde_json::json!({"mode":"pyth-pro-verified-candidate",
                "signer":c.signer,"signer_expires_at":c.expires_at,"feed":c.feed,
                "channel":c.channel,"max_confidence_bps":c.max_confidence_bps,
                "max_age_us":2_000_000,"last_observed_us":self.last_verified_us,
                "manual_price_fallback":false}),
            None => near_sdk::serde_json::json!({"mode":"test-only-trusted-publisher"}),
        }
    }
    pub fn submit_verified_price(&mut self, message: Base64VecU8) {
        let config = self
            .verified_oracle
            .as_ref()
            .expect("Verified oracle not configured");
        let quote = config
            .verify(
                &message.0,
                env::block_timestamp() / 1000,
                self.last_verified_us,
            )
            .unwrap_or_else(|e| env::panic_str(e));
        check(
            self.engine.publish(
                quote.price,
                quote.observed_us / 1_000_000,
                self.engine
                    .sequence
                    .checked_add(1)
                    .expect("Sequence overflow"),
                now(),
            ),
        );
        self.last_verified_us = quote.observed_us;
        self.event("verified_price");
    }
    #[payable]
    pub fn register(&mut self) {
        assert!(
            env::attached_deposit() >= NearToken::from_millinear(100),
            "Attach 0.1 NEAR for bounded demo storage (non-refundable)"
        );
        check(self.engine.register(&actor()));
        self.event("register");
    }
    pub fn ft_on_transfer(
        &mut self,
        sender_id: AccountId,
        amount: U128,
        msg: String,
    ) -> PromiseOrValue<U128> {
        assert_eq!(
            env::predecessor_account_id(),
            self.token,
            "Unexpected token"
        );
        if msg != "deposit"
            || amount.0 > u64::MAX as u128
            || self
                .engine
                .deposit(sender_id.as_str(), amount.0 as u64)
                .is_err()
        {
            return PromiseOrValue::Value(amount);
        }
        self.event("deposit");
        PromiseOrValue::Value(U128(0))
    }
    #[payable]
    pub fn withdraw(&mut self, amount: U64) -> Promise {
        assert_one_yocto();
        let owner = env::predecessor_account_id();
        assert!(
            !self.withdrawals.contains_key(&owner),
            "Withdrawal already pending"
        );
        check(self.engine.withdraw(owner.as_str(), amount.0));
        self.withdrawals.insert(owner.clone(), amount.0);
        self.event("withdraw_requested");
        Promise::new(self.token.clone()).function_call("ft_transfer",near_sdk::serde_json::json!({"receiver_id":owner,"amount":amount.0.to_string(),"memo":"Purple Hands withdrawal"}).to_string().into_bytes(),NearToken::from_yoctonear(1),Gas::from_tgas(25)).then(Self::ext(env::current_account_id()).with_static_gas(Gas::from_tgas(25)).withdraw_callback(owner))
    }
    #[private]
    pub fn withdraw_callback(
        &mut self,
        owner: AccountId,
        #[callback_result] result: Result<(), PromiseError>,
    ) -> bool {
        let n = self
            .withdrawals
            .remove(&owner)
            .expect("No pending withdrawal");
        if result.is_err() {
            self.engine.restore_withdrawal(owner.as_str(), n);
            self.event("withdraw_failed_refunded");
            false
        } else {
            self.event("withdraw_complete");
            true
        }
    }
    #[cfg(any(test, feature = "test-oracle"))]
    pub fn publish_price(&mut self, price: U64, timestamp: u64, sequence: u64) {
        assert!(self.verified_oracle.is_none(), "Manual prices disabled");
        assert_eq!(env::predecessor_account_id(), self.oracle, "Only oracle");
        check(self.engine.publish(price.0, timestamp, sequence, now()));
        self.event("price");
    }
    pub fn observe_health(&mut self) {
        self.engine.health(now());
        self.event("health");
    }
    pub fn pause_entries(&mut self, paused: bool) {
        assert_eq!(
            env::predecessor_account_id(),
            self.guardian,
            "Only guardian"
        );
        self.engine.paused = paused;
        self.event("pause");
    }
    #[payable]
    pub fn enable_session(&mut self, agent: AccountId, budget: U64, expires_at: u64) {
        assert_one_yocto();
        check(
            self.engine
                .session(&actor(), agent.to_string(), budget.0, expires_at, now()),
        );
        self.event("session");
    }
    #[payable]
    pub fn revoke_session(&mut self) {
        assert_one_yocto();
        check(self.engine.revoke(&actor()));
        self.event("revoke");
    }
    pub fn add_liquidity(&mut self, amount: U64) -> U64 {
        let n = check(self.engine.add_liquidity(&actor(), amount.0));
        self.event("lp_added");
        U64(n)
    }
    pub fn request_remove(&mut self, shares: U64) {
        check(self.engine.request_remove(&actor(), shares.0, now()));
        self.event("lp_requested");
    }
    pub fn cancel_remove(&mut self) {
        check(self.engine.cancel_remove(&actor()));
        self.event("lp_cancelled");
    }
    pub fn process_remove(&mut self, owner: AccountId) -> U64 {
        let n = check(self.engine.process_remove(owner.as_str(), now()));
        self.event("lp_removed");
        U64(n)
    }
    pub fn reset_empty_pool(&mut self) {
        check(self.engine.reset_empty_pool());
        self.event("epoch_reset");
    }
    pub fn request_open(
        &mut self,
        owner: AccountId,
        long: bool,
        margin: U64,
        leverage: u64,
        min_price: U64,
        max_price: U64,
    ) -> u64 {
        if self.verified_oracle.is_some() {
            assert!(leverage == 100, "V1 supports 100x only");
        }
        self.require_verified_fresh();
        let id = check(self.engine.request_open(
            owner.as_str(),
            &actor(),
            long,
            margin.0,
            leverage,
            min_price.0,
            max_price.0,
            now(),
            env::block_height(),
        ));
        self.event("open_requested");
        id
    }
    pub fn fill_open(&mut self, owner: AccountId) {
        self.require_verified_fresh();
        check(
            self.engine
                .fill_open(owner.as_str(), &actor(), now(), env::block_height()),
        );
        self.event("opened");
    }
    pub fn cancel_open(&mut self, owner: AccountId) {
        check(self.engine.cancel_open(owner.as_str(), env::block_height()));
        self.event("open_expired");
    }
    pub fn request_close(&mut self, owner: AccountId, min_price: U64, max_price: U64) {
        check(self.engine.request_close(
            owner.as_str(),
            &actor(),
            min_price.0,
            max_price.0,
            now(),
            env::block_height(),
        ));
        self.event("close_requested");
    }
    pub fn settle(&mut self, owner: AccountId) -> Outcome {
        self.require_verified_fresh();
        let o = check(
            self.engine
                .settle(owner.as_str(), &actor(), now(), env::block_height()),
        );
        env::log_str(&format!(
            "EVENT_JSON:{}",
            near_sdk::serde_json::json!({"standard":"purple_hands","version":"0.1.0","event":"settled","data":[o]})
        ));
        self.event("accounting");
        o
    }
    pub fn void_outage(&mut self, owner: AccountId) {
        check(self.engine.void_outage(owner.as_str(), now()));
        self.event("void");
    }
    pub fn get_state(&self) -> Engine {
        self.engine.clone()
    }
    pub fn get_pending_withdrawal(&self, owner: AccountId) -> U64 {
        U64(*self.withdrawals.get(&owner).unwrap_or(&0))
    }
    fn require_verified_fresh(&self) {
        if let Some(config) = &self.verified_oracle {
            config.validate(now()).unwrap_or_else(|e| env::panic_str(e));
            let now_us = env::block_timestamp() / 1000;
            assert!(
                self.last_verified_us > 0
                    && now_us >= self.last_verified_us
                    && now_us - self.last_verified_us <= 2_000_000,
                "Verified observation stale"
            );
        }
    }
    fn event(&self, name: &str) {
        assert!(self.engine.invariant(), "Ledger invariant");
        env::log_str(&format!(
            "EVENT_JSON:{}",
            near_sdk::serde_json::json!({"standard":"purple_hands","version":"0.1.0","event":name,"data":[{"actor":actor(),"total":self.engine.total.to_string(),"capital":self.engine.capital.to_string(),"reserved":self.engine.reserved.to_string()}]})
        ));
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::{test_utils::VMContextBuilder, testing_env};
    fn context(who: &str, deposit: NearToken) {
        let mut b = VMContextBuilder::new();
        b.current_account_id("exchange.near".parse().unwrap())
            .predecessor_account_id(who.parse().unwrap())
            .attached_deposit(deposit);
        testing_env!(b.build());
    }
    fn setup() -> Exchange {
        context("alice.near", NearToken::from_millinear(100));
        let mut e = Exchange::new(
            "usdc.near".parse().unwrap(),
            "oracle.near".parse().unwrap(),
            "guardian.near".parse().unwrap(),
        );
        e.register();
        e
    }
    #[test]
    fn token_deposit_and_refund() {
        let mut e = setup();
        context("usdc.near", NearToken::from_yoctonear(0));
        assert!(matches!(
            e.ft_on_transfer(
                "alice.near".parse().unwrap(),
                U128(11_000_000),
                "deposit".into()
            ),
            PromiseOrValue::Value(U128(0))
        ));
        assert_eq!(e.engine.total, 11_000_000);
        assert!(matches!(
            e.ft_on_transfer("unknown.near".parse().unwrap(), U128(1), "deposit".into()),
            PromiseOrValue::Value(U128(1))
        ));
    }
    #[test]
    #[should_panic(expected = "Unexpected token")]
    fn reject_fake_token() {
        let mut e = setup();
        let _ = e.ft_on_transfer("alice.near".parse().unwrap(), U128(1), "deposit".into());
    }
    #[test]
    fn failed_withdraw_refunds() {
        let mut e = setup();
        e.engine.deposit("alice.near", 11_000_000).unwrap();
        context("alice.near", NearToken::from_yoctonear(1));
        let _ = e.withdraw(U64(10_000_000));
        assert_eq!(e.engine.account("alice.near").unwrap().balance, 1_000_000);
        context("exchange.near", NearToken::from_yoctonear(0));
        assert!(!e.withdraw_callback("alice.near".parse().unwrap(), Err(PromiseError::Failed)));
        assert_eq!(e.engine.total, 11_000_000);
        assert!(e.engine.invariant());
    }
    #[test]
    fn successful_withdraw_keeps_debit() {
        let mut e = setup();
        e.engine.deposit("alice.near", 11_000_000).unwrap();
        context("alice.near", NearToken::from_yoctonear(1));
        let _ = e.withdraw(U64(10_000_000));
        context("exchange.near", NearToken::from_yoctonear(0));
        assert!(e.withdraw_callback("alice.near".parse().unwrap(), Ok(())));
        assert_eq!(e.engine.total, 1_000_000);
        assert!(e.engine.invariant());
    }
    #[test]
    #[should_panic(expected = "V1 supports 100x only")]
    fn verified_v1_rejects_1000x_before_request() {
        let (mut exchange, _, _) = verified_setup();
        exchange.request_open(
            "alice.near".parse().unwrap(),
            true,
            U64(10_000_000),
            1000,
            U64(1),
            U64(u64::MAX),
        );
    }
    #[test]
    #[should_panic(expected = "V1 supports 100x only")]
    fn verified_v1_rejects_500x_before_request() {
        let (mut exchange, _, _) = verified_setup();
        exchange.request_open(
            "alice.near".parse().unwrap(),
            true,
            U64(10_000_000),
            500,
            U64(1),
            U64(u64::MAX),
        );
    }
    fn verified_setup() -> (Exchange, Vec<u8>, u64) {
        let h = include_str!("pyth-fixture.hex").trim();
        let message: Vec<u8> = (0..h.len())
            .step_by(2)
            .map(|i| u8::from_str_radix(&h[i..i + 2], 16).unwrap())
            .collect();
        let t = 1771339368200000u64;
        let mut ctx = VMContextBuilder::new();
        ctx.current_account_id("verified.near".parse().unwrap())
            .block_timestamp(t * 1000);
        testing_env!(ctx.build());
        let e = Exchange::new_verified(
            "usdc.near".parse().unwrap(),
            "guardian.near".parse().unwrap(),
            message[68..100].try_into().unwrap(),
            t / 1_000_000 + 100,
            1,
            3,
            5,
        );
        (e, message, t)
    }
    #[test]
    fn verified_submission_updates_engine_and_preserves_pause() {
        let (mut e, message, t) = verified_setup();
        e.submit_verified_price(Base64VecU8(message));
        assert_eq!(e.engine.price, 67_134_362_876);
        assert_eq!(e.last_verified_us, t);
        assert!(e.engine.paused);
        e.require_verified_fresh();
        assert!(e.engine.invariant());
    }
    #[test]
    #[should_panic(expected = "Manual prices disabled")]
    fn verified_mode_has_no_manual_price_fallback_even_in_test_build() {
        let (mut e, _, _) = verified_setup();
        e.publish_price(U64(80_000_000_000), 0, 1);
    }
    #[test]
    #[should_panic(expected = "Verified observation stale")]
    fn execution_cannot_reuse_verified_price_after_two_seconds() {
        let (mut e, message, t) = verified_setup();
        e.submit_verified_price(Base64VecU8(message));
        let mut ctx = VMContextBuilder::new();
        ctx.block_timestamp((t + 2_000_001) * 1000);
        testing_env!(ctx.build());
        e.require_verified_fresh();
    }
}
