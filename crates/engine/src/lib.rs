//! Deterministic, integer-only V5-derived accounting. No network or wall-clock access.
use borsh::{BorshDeserialize, BorshSerialize};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
pub const UNIT: u64 = 1_000_000;
pub type Result<T> = std::result::Result<T, String>;
fn need(ok: bool, msg: &str) -> Result<()> {
    if ok {
        Ok(())
    } else {
        Err(msg.into())
    }
}
fn mul(a: u64, b: u64, d: u64) -> u64 {
    ((a as u128 * b as u128) / d as u128) as u64
}
#[derive(Clone, Debug, Serialize, Deserialize, BorshSerialize, BorshDeserialize)]
pub struct Account {
    pub balance: u64,
    pub shares: u64,
    pub redemption: Option<Redemption>,
    pub session: Option<Session>,
}
#[derive(Clone, Debug, Serialize, Deserialize, BorshSerialize, BorshDeserialize)]
pub struct Session {
    pub agent: String,
    pub until: u64,
    pub remaining: u64,
}
#[derive(Clone, Debug, Serialize, Deserialize, BorshSerialize, BorshDeserialize)]
pub struct Redemption {
    pub shares: u64,
    pub ready_at: u64,
}
#[derive(Clone, Debug, Serialize, Deserialize, BorshSerialize, BorshDeserialize)]
pub struct Request {
    pub requested_at: u64,
    pub after_sequence: u64,
    pub from: u64,
    pub until: u64,
    pub min: u64,
    pub max: u64,
}
#[derive(Clone, Debug, Serialize, Deserialize, BorshSerialize, BorshDeserialize)]
pub struct Position {
    pub id: u64,
    pub owner: String,
    pub long: bool,
    pub margin: u64,
    pub leverage: u64,
    pub entry: u64,
    pub opened_at: u64,
    pub fee: u64,
    pub escrow: u64,
    pub open: Request,
    pub close: Option<Request>,
}
#[derive(Clone, Debug, Serialize, Deserialize, BorshSerialize, BorshDeserialize)]
pub struct Outcome {
    pub id: u64,
    pub owner: String,
    pub entry: u64,
    pub exit: u64,
    pub gross: i64,
    pub net: i64,
    pub payout: u64,
    pub fee: u64,
    pub reward: u64,
    pub duration: u64,
    pub lp_delta: i64,
}
#[derive(Clone, Debug, Serialize, Deserialize, BorshSerialize, BorshDeserialize)]
pub struct Engine {
    pub accounts: BTreeMap<String, Account>,
    pub positions: BTreeMap<String, Position>,
    pub total: u64,
    pub capital: u64,
    pub lp_pnl: i64,
    pub treasury: u64,
    pub shares: u64,
    pub reserved: u64,
    pub price: u64,
    pub price_at: u64,
    pub last_publish_at: u64,
    pub sequence: u64,
    pub next_id: u64,
    pub paused: bool,
    pub notice: u64,
    pub outage_since: Option<u64>,
    pub last_health: Option<u64>,
}
impl Default for Engine {
    fn default() -> Self {
        Self {
            accounts: BTreeMap::new(),
            positions: BTreeMap::new(),
            total: 0,
            capital: 0,
            lp_pnl: 0,
            treasury: 0,
            shares: 0,
            reserved: 0,
            price: 0,
            price_at: 0,
            last_publish_at: 0,
            sequence: 0,
            next_id: 1,
            paused: false,
            notice: 86400,
            outage_since: None,
            last_health: None,
        }
    }
}
impl Engine {
    pub fn register(&mut self, who: &str) -> Result<()> {
        need(!self.accounts.contains_key(who), "Already registered")?;
        need(self.accounts.len() < 256, "Demo account capacity reached")?;
        self.accounts.insert(
            who.into(),
            Account {
                balance: 0,
                shares: 0,
                redemption: None,
                session: None,
            },
        );
        Ok(())
    }
    pub fn account(&self, who: &str) -> Result<&Account> {
        self.accounts
            .get(who)
            .ok_or("Register account first".into())
    }
    fn credit(&mut self, who: &str, n: u64) {
        self.accounts.get_mut(who).unwrap().balance += n;
    }
    fn debit(&mut self, who: &str, n: u64) -> Result<()> {
        need(
            self.account(who)?.balance >= n,
            "Insufficient trading balance",
        )?;
        self.accounts.get_mut(who).unwrap().balance -= n;
        Ok(())
    }
    pub fn deposit(&mut self, who: &str, n: u64) -> Result<()> {
        self.account(who)?;
        need(
            n > 0 && n <= 1_000_000 * UNIT && self.total + n <= 1_000_000 * UNIT,
            "Deposit cap",
        )?;
        self.credit(who, n);
        self.total += n;
        Ok(())
    }
    /// Debits before async transfer; caller must restore on failed callback.
    pub fn withdraw(&mut self, who: &str, n: u64) -> Result<()> {
        need(n > 0, "Amount must be positive")?;
        self.debit(who, n)?;
        self.total -= n;
        Ok(())
    }
    pub fn restore_withdrawal(&mut self, who: &str, n: u64) {
        self.credit(who, n);
        self.total += n;
    }
    pub fn publish(&mut self, price: u64, at: u64, seq: u64, now: u64) -> Result<()> {
        need(price > 0 && price <= 1_000_000 * UNIT, "Invalid price")?;
        need(
            at <= now && now - at <= 15 && at >= self.price_at && seq > self.sequence,
            "Stale or replayed quote",
        )?;
        self.price = price;
        self.price_at = at;
        self.last_publish_at = now;
        self.sequence = seq;
        self.outage_since = None;
        self.last_health = Some(now);
        Ok(())
    }
    pub fn fresh(&self, now: u64) -> Result<()> {
        need(
            self.price > 0 && now >= self.price_at && now - self.price_at <= 15,
            "Price unavailable: waiting for a fresh oracle observation",
        )
    }
    /// Consecutive stale observations with <=30s gaps; every healthy observation resets.
    pub fn health(&mut self, now: u64) {
        if self.fresh(now).is_ok() {
            self.outage_since = None;
        } else if self.last_health.is_none_or(|t| now < t || now - t > 30) {
            self.outage_since = Some(now);
        } else if self.outage_since.is_none() {
            self.outage_since = Some(now);
        }
        self.last_health = Some(now);
    }
    pub fn session(
        &mut self,
        owner: &str,
        agent: String,
        budget: u64,
        until: u64,
        now: u64,
    ) -> Result<()> {
        need(
            until > now && until - now <= 7 * 86400 && budget > 0 && budget <= 100_000 * UNIT,
            "Invalid session limits",
        )?;
        self.accounts
            .get_mut(owner)
            .ok_or("Register first")?
            .session = Some(Session {
            agent,
            until,
            remaining: budget,
        });
        Ok(())
    }
    pub fn revoke(&mut self, owner: &str) -> Result<()> {
        self.accounts
            .get_mut(owner)
            .ok_or("Register first")?
            .session = None;
        Ok(())
    }
    fn authorize(&self, owner: &str, actor: &str, now: u64, spend: u64) -> Result<()> {
        let a = self.account(owner)?;
        if owner == actor {
            return Ok(());
        }
        let s = a.session.as_ref().ok_or("No session")?;
        need(
            s.agent == actor && now < s.until && s.remaining >= spend,
            "Session expired or budget exceeded",
        )
    }
    pub fn add_liquidity(&mut self, who: &str, n: u64) -> Result<u64> {
        need(
            self.positions.is_empty(),
            "LP deposits wait until all positions and requests settle",
        )?;
        need(n > 0, "Amount must be positive")?;
        need(
            self.capital > 0 || self.shares == 0,
            "Pool needs explicit epoch reset",
        )?;
        let minted = if self.shares == 0 {
            n
        } else {
            mul(n, self.shares, self.capital)
        };
        need(minted > 0, "Deposit too small")?;
        self.debit(who, n)?;
        self.capital += n;
        self.shares += minted;
        self.accounts.get_mut(who).unwrap().shares += minted;
        Ok(minted)
    }
    pub fn request_remove(&mut self, who: &str, n: u64, now: u64) -> Result<()> {
        let a = self.account(who)?;
        need(
            n > 0 && n <= a.shares && a.redemption.is_none(),
            "Invalid shares or existing request",
        )?;
        self.accounts.get_mut(who).unwrap().redemption = Some(Redemption {
            shares: n,
            ready_at: now + self.notice,
        });
        Ok(())
    }
    pub fn cancel_remove(&mut self, who: &str) -> Result<()> {
        self.accounts
            .get_mut(who)
            .ok_or("Register first")?
            .redemption = None;
        Ok(())
    }
    /// Permissionless, recipient fixed to owner, credits withdrawable balance; no recipient callback.
    pub fn process_remove(&mut self, who: &str, now: u64) -> Result<u64> {
        let r = self
            .account(who)?
            .redemption
            .clone()
            .ok_or("No removal request")?;
        need(now >= r.ready_at, "Withdrawal notice still running")?;
        need(
            self.positions.is_empty(),
            "Waiting for open trades to settle",
        )?;
        let value = mul(r.shares, self.capital, self.shares);
        self.capital -= value;
        self.shares -= r.shares;
        let a = self.accounts.get_mut(who).unwrap();
        a.shares -= r.shares;
        a.redemption = None;
        a.balance += value;
        Ok(value)
    }
    pub fn reset_empty_pool(&mut self) -> Result<()> {
        need(
            self.capital == 0 && self.positions.is_empty(),
            "Pool is not empty",
        )?;
        for a in self.accounts.values_mut() {
            a.shares = 0;
            a.redemption = None;
        }
        self.shares = 0;
        Ok(())
    }
    pub fn request_open(
        &mut self,
        owner: &str,
        actor: &str,
        long: bool,
        margin: u64,
        leverage: u64,
        min: u64,
        max: u64,
        now: u64,
        block: u64,
    ) -> Result<u64> {
        self.authorize(owner, actor, now, margin)?;
        self.fresh(now)?;
        need(!self.paused, "New entries paused")?;
        need(
            !self.positions.contains_key(owner),
            "One position per account",
        )?;
        need(
            [10 * UNIT, 50 * UNIT, 100 * UNIT].contains(&margin)
                && [100, 500, 1000].contains(&leverage),
            "Unsupported stake or leverage",
        )?;
        need(
            min > 0 && min <= max && max <= 1_000_000 * UNIT,
            "Invalid execution bounds",
        )?;
        need(
            !self
                .accounts
                .values()
                .any(|a| a.redemption.as_ref().is_some_and(|r| now >= r.ready_at)),
            "Process ready LP removals before opening",
        )?;
        need(
            self.reserved + margin <= mul(self.capital, 9000, 10000)
                && self.capital >= self.reserved + margin + 100 * UNIT,
            "Pool capacity",
        )?;
        let gross: u64 = self.positions.values().map(|p| p.margin * p.leverage).sum();
        need(
            gross + margin * leverage <= 800_000 * UNIT,
            "Gross exposure cap",
        )?;
        let side: u64 = self
            .positions
            .values()
            .filter(|p| p.long == long)
            .map(|p| p.margin * p.leverage)
            .sum();
        need(
            side + margin * leverage <= 400_000 * UNIT,
            "Side exposure cap",
        )?;
        let fee = margin / 100;
        let escrow = 140_000;
        self.debit(owner, margin + fee + escrow)?;
        if owner != actor {
            self.accounts
                .get_mut(owner)
                .unwrap()
                .session
                .as_mut()
                .unwrap()
                .remaining -= margin;
        }
        let id = self.next_id;
        self.next_id += 1;
        self.reserved += margin;
        self.positions.insert(
            owner.into(),
            Position {
                id,
                owner: owner.into(),
                long,
                margin,
                leverage,
                entry: 0,
                opened_at: 0,
                fee,
                escrow,
                open: Request {
                    requested_at: now,
                    after_sequence: self.sequence,
                    from: block + 2,
                    until: block + 22,
                    min,
                    max,
                },
                close: None,
            },
        );
        Ok(id)
    }
    fn in_window(&self, r: &Request, block: u64, now: u64) -> Result<()> {
        self.fresh(now)?;
        need(
            self.sequence > r.after_sequence && self.price_at > r.requested_at,
            "Execution requires an oracle observation after the request",
        )?;
        need(block >= r.from && block <= r.until, "Outside fill window")?;
        need(
            self.price >= r.min && self.price <= r.max,
            "Outside signed price bounds",
        )
    }
    pub fn fill_open(&mut self, owner: &str, keeper: &str, now: u64, block: u64) -> Result<()> {
        self.account(keeper)?;
        let p = self.positions.get(owner).ok_or("No request")?;
        need(p.entry == 0, "Already filled")?;
        self.in_window(&p.open, block, now)?;
        let p = self.positions.get_mut(owner).unwrap();
        p.entry = self.price;
        p.opened_at = now;
        self.capital += p.fee;
        self.lp_pnl += p.fee as i64;
        p.escrow -= 20_000;
        self.credit(keeper, 20_000);
        Ok(())
    }
    pub fn cancel_open(&mut self, owner: &str, block: u64) -> Result<()> {
        let p = self.positions.get(owner).ok_or("No request")?;
        need(p.entry == 0 && block > p.open.until, "Request not expired")?;
        let p = self.positions.remove(owner).unwrap();
        self.reserved -= p.margin;
        self.credit(owner, p.margin + p.fee + p.escrow);
        Ok(())
    }
    pub fn request_close(
        &mut self,
        owner: &str,
        actor: &str,
        min: u64,
        max: u64,
        now: u64,
        block: u64,
    ) -> Result<()> {
        self.authorize(owner, actor, now, 0)?;
        need(
            min > 0 && min <= max && max <= 1_000_000 * UNIT,
            "Invalid execution bounds",
        )?;
        let p = self.positions.get_mut(owner).ok_or("No position")?;
        need(p.entry > 0, "Entry not filled")?;
        need(
            p.close.as_ref().is_none_or(|r| block > r.until),
            "Close already pending",
        )?;
        p.close = Some(Request {
            requested_at: now,
            after_sequence: self.sequence,
            from: block + 2,
            until: block + 22,
            min,
            max,
        });
        Ok(())
    }
    pub fn gross(p: &Position, price: u64) -> i64 {
        let gain = if p.long {
            price >= p.entry
        } else {
            price <= p.entry
        };
        let numerator = p.margin as u128 * p.leverage as u128 * price.abs_diff(p.entry) as u128;
        let mag = if gain {
            numerator / p.entry as u128
        } else {
            numerator.div_ceil(p.entry as u128)
        }
        .min(p.margin as u128) as i64;
        if gain {
            mag
        } else {
            -mag
        }
    }
    pub fn settle(&mut self, owner: &str, keeper: &str, now: u64, block: u64) -> Result<Outcome> {
        self.account(keeper)?;
        self.fresh(now)?;
        let p = self.positions.get(owner).ok_or("No position")?.clone();
        need(p.entry > 0, "Entry not filled")?;
        let gross = Self::gross(&p, self.price);
        let magnitude = gross.unsigned_abs();
        let forced = magnitude >= p.margin * 80 / 100;
        let expired = now >= p.opened_at + 86400;
        if !forced && !expired {
            self.in_window(p.close.as_ref().ok_or("Request exit first")?, block, now)?;
        }
        let rake = magnitude / 10;
        let reward = if forced {
            (p.margin - magnitude).min(p.margin / 100)
        } else {
            0
        };
        let mut payout;
        if gross >= 0 {
            payout = p.margin + magnitude - rake;
            self.capital -= magnitude + reward;
        } else {
            payout = p.margin - magnitude - reward;
            self.capital += magnitude - rake;
        }
        let early = if !forced && !expired && now < p.opened_at + 30 {
            (p.margin / 100).min(payout)
        } else {
            0
        };
        payout -= early;
        self.capital += early;
        self.treasury += rake;
        self.lp_pnl += early as i64
            + if gross >= 0 {
                -(magnitude as i64) - reward as i64
            } else {
                (magnitude - rake) as i64
            };
        let keeper_escrow = if forced || expired { 100_000 } else { 20_000 };
        let paid = keeper_escrow.min(p.escrow);
        let refund = p.escrow - paid;
        self.credit(owner, payout + refund);
        self.credit(keeper, paid + reward);
        self.reserved -= p.margin;
        self.positions.remove(owner);
        Ok(Outcome {
            id: p.id,
            owner: owner.into(),
            entry: p.entry,
            exit: self.price,
            gross,
            net: payout as i64 - p.margin as i64 - p.fee as i64 - paid as i64 - 20_000,
            payout,
            fee: p.fee + rake + early + paid + 20_000,
            reward,
            duration: now - p.opened_at,
            lp_delta: p.fee as i64
                + early as i64
                + if gross >= 0 {
                    -(magnitude as i64) - (reward as i64)
                } else {
                    (magnitude - rake) as i64
                },
        })
    }
    pub fn void_outage(&mut self, owner: &str, now: u64) -> Result<()> {
        need(self.fresh(now).is_err(), "Oracle healthy")?;
        need(
            self.sequence > 0 && now >= self.last_publish_at && now - self.last_publish_at >= 3600,
            "Wait one hour since the last accepted oracle publication",
        )?;
        let p = self.positions.get(owner).ok_or("No position")?;
        need(p.entry > 0, "Cancel unfilled request instead")?;
        let p = self.positions.remove(owner).unwrap();
        self.reserved -= p.margin;
        self.credit(owner, p.margin + p.escrow);
        Ok(())
    }
    pub fn invariant(&self) -> bool {
        let u: u64 = self.accounts.values().map(|a| a.balance).sum();
        let m: u64 = self
            .positions
            .values()
            .map(|p| p.margin + p.escrow + if p.entry == 0 { p.fee } else { 0 })
            .sum();
        self.total == u + m + self.capital + self.treasury
            && self.reserved == self.positions.values().map(|p| p.margin).sum::<u64>()
            && self.reserved <= self.capital
            && self.shares == self.accounts.values().map(|a| a.shares).sum::<u64>()
    }
}
