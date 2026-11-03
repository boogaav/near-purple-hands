use purple_engine::{Engine, UNIT};
fn setup() -> Engine {
    let mut e = Engine::default();
    for a in ["alice", "lp", "bob", "keeper"] {
        e.register(a).unwrap();
        e.deposit(a, 10_000 * UNIT).unwrap();
    }
    e.add_liquidity("lp", 9_000 * UNIT).unwrap();
    e.publish(80_000 * UNIT, 100, 1, 100).unwrap();
    e
}
fn open(e: &mut Engine, long: bool) {
    e.request_open(
        "alice",
        "alice",
        long,
        10 * UNIT,
        1000,
        79_000 * UNIT,
        81_000 * UNIT,
        100,
        1,
    )
    .unwrap();
    e.publish(80_000 * UNIT, 101, 2, 101).unwrap();
    e.fill_open("alice", "keeper", 102, 3).unwrap();
    assert!(e.invariant());
}
#[test]
fn entry_fee_counted_once() {
    let mut e = setup();
    let k = e.capital;
    open(&mut e, true);
    assert_eq!(e.capital, k + 100_000);
    e.publish(80_000 * UNIT, 140, 3, 140).unwrap();
    e.request_close("alice", "alice", 79_000 * UNIT, 81_000 * UNIT, 140, 10)
        .unwrap();
    e.publish(e.price, 141, e.sequence + 1, 141).unwrap();
    let o = e.settle("alice", "keeper", 142, 12).unwrap();
    assert_eq!(o.gross, 0);
    assert_eq!(o.net, -140_000);
    assert_eq!(e.capital, k + 100_000);
    assert!(e.invariant());
}
#[test]
fn cannot_dilute_existing_unrealized_pnl() {
    let mut e = setup();
    open(&mut e, true);
    assert!(e.add_liquidity("bob", 100 * UNIT).is_err());
    assert!(e.invariant());
}
#[test]
fn dust_removal_is_permissionlessly_processable() {
    let mut e = setup();
    e.request_remove("lp", 1, 100).unwrap();
    e.process_remove("lp", 86500).unwrap();
    e.publish(80_000 * UNIT, 86501, 2, 86501).unwrap();
    e.request_open(
        "alice",
        "alice",
        true,
        10 * UNIT,
        1000,
        79_000 * UNIT,
        81_000 * UNIT,
        86501,
        1,
    )
    .unwrap();
    assert!(e.invariant());
}
#[test]
fn healthy_publish_resets_outage() {
    let mut e = setup();
    open(&mut e, true);
    for t in (120..3720).step_by(20) {
        e.health(t);
    }
    e.publish(80_000 * UNIT, 3720, 3, 3720).unwrap();
    e.health(3740);
    assert!(e.void_outage("alice", 3740).is_err());
}
#[test]
fn oracle_outage_recovers_without_any_health_observer() {
    let mut e = setup();
    open(&mut e, true);
    assert!(e.void_outage("alice", 3700).is_err());
    e.void_outage("alice", 3701).unwrap();
    assert!(e.positions.is_empty());
    assert!(e.invariant());
}
#[test]
fn continuous_observed_outage_voids_without_double_fee() {
    let mut e = setup();
    open(&mut e, true);
    for t in (120..=3740).step_by(20) {
        e.health(t);
    }
    e.void_outage("alice", 3740).unwrap();
    assert!(e.positions.is_empty());
    assert!(e.invariant());
}
#[test]
fn forced_gap_both_sides_conserves_funds() {
    for long in [true, false] {
        for price in [79_000 * UNIT, 81_000 * UNIT] {
            let mut e = setup();
            open(&mut e, long);
            e.publish(price, 105, 3, 105).unwrap();
            let o = e.settle("alice", "keeper", 105, 5).unwrap();
            assert_eq!(o.reward, 0);
            assert_eq!(o.gross.unsigned_abs(), 10 * UNIT);
            assert!(e.invariant());
        }
    }
}
#[test]
fn early_exit_fee_cannot_exceed_return() {
    let mut e = setup();
    open(&mut e, true);
    e.request_close("alice", "alice", 79_000 * UNIT, 81_000 * UNIT, 104, 5)
        .unwrap();
    e.publish(e.price, 105, e.sequence + 1, 105).unwrap();
    let o = e.settle("alice", "keeper", 106, 7).unwrap();
    assert_eq!(o.payout, 9_900_000);
    assert!(e.invariant());
}
#[test]
fn session_budget_and_revocation() {
    let mut e = setup();
    e.session("alice", "agent".into(), 10 * UNIT, 200, 100)
        .unwrap();
    assert!(e
        .request_open(
            "alice",
            "mallory",
            true,
            10 * UNIT,
            1000,
            1,
            81_000 * UNIT,
            100,
            1
        )
        .is_err());
    e.request_open(
        "alice",
        "agent",
        true,
        10 * UNIT,
        1000,
        1,
        81_000 * UNIT,
        100,
        1,
    )
    .unwrap();
    assert_eq!(
        e.account("alice")
            .unwrap()
            .session
            .as_ref()
            .unwrap()
            .remaining,
        0
    );
    e.cancel_open("alice", 24).unwrap();
    assert!(e
        .request_open(
            "alice",
            "agent",
            true,
            10 * UNIT,
            1000,
            1,
            81_000 * UNIT,
            100,
            25
        )
        .is_err());
    e.revoke("alice").unwrap();
    assert!(e.account("alice").unwrap().session.is_none());
    assert!(e.invariant());
}
#[test]
fn delayed_fill_and_expiry() {
    let mut e = setup();
    e.request_open(
        "alice",
        "alice",
        true,
        10 * UNIT,
        1000,
        79_000 * UNIT,
        81_000 * UNIT,
        100,
        1,
    )
    .unwrap();
    assert!(e.fill_open("alice", "keeper", 100, 1).is_err());
    e.cancel_open("alice", 24).unwrap();
    assert_eq!(e.account("alice").unwrap().balance, 10_000 * UNIT);
    assert!(e.invariant());
}
#[test]
fn stale_and_replayed_quotes_fail() {
    let mut e = setup();
    assert!(e.publish(80_000 * UNIT, 100, 1, 100).is_err());
    assert!(e.fresh(116).is_err());
    assert!(e.publish(80_000 * UNIT, 117, 2, 116).is_err());
}
#[test]
fn price_sweep_conserves_and_caps() {
    for long in [true, false] {
        for delta in -100..=100 {
            let mut e = setup();
            open(&mut e, long);
            e.publish((80_000i64 + delta) as u64 * UNIT, 140, 3, 140)
                .unwrap();
            e.request_close("alice", "alice", 79_000 * UNIT, 81_000 * UNIT, 140, 10)
                .unwrap();
            e.publish(e.price, 141, e.sequence + 1, 141).unwrap();
            let o = e.settle("alice", "keeper", 142, 12).unwrap();
            assert!(o.gross.unsigned_abs() <= 10 * UNIT);
            assert!(o.payout <= 20 * UNIT);
            assert!(e.invariant());
        }
    }
}

#[test]
fn entry_cannot_use_pre_request_or_same_second_price() {
    let mut e = setup();
    e.request_open(
        "alice",
        "alice",
        true,
        10 * UNIT,
        1000,
        79_000 * UNIT,
        81_000 * UNIT,
        100,
        1,
    )
    .unwrap();
    assert!(e.fill_open("alice", "keeper", 102, 3).is_err());
    e.publish(80_000 * UNIT, 100, 2, 102).unwrap();
    assert!(e.fill_open("alice", "keeper", 102, 3).is_err());
    e.publish(80_000 * UNIT, 101, 3, 102).unwrap();
    e.fill_open("alice", "keeper", 102, 3).unwrap();
    assert!(e.invariant());
}
#[test]
fn voluntary_exit_requires_post_request_observation() {
    let mut e = setup();
    open(&mut e, true);
    e.request_close("alice", "alice", 79_000 * UNIT, 81_000 * UNIT, 104, 5)
        .unwrap();
    assert!(e.settle("alice", "keeper", 106, 7).is_err());
    e.publish(e.price, 105, e.sequence + 1, 106).unwrap();
    e.settle("alice", "keeper", 106, 7).unwrap();
    assert!(e.invariant());
}

#[test]
fn health_calls_cannot_extend_or_shorten_recovery_deadline() {
    let mut e = setup();
    open(&mut e, true);
    for now in [120, 1000, 2000, 3700] {
        e.health(now);
        assert!(e.void_outage("alice", now).is_err());
    }
    e.health(3701);
    e.void_outage("alice", 3701).unwrap();
    assert!(e.invariant());
}
#[test]
fn recovery_clock_uses_acceptance_time_and_resets_on_new_publication() {
    let mut e = setup();
    open(&mut e, true);
    e.publish(80_000 * UNIT, 3690, 3, 3700).unwrap();
    assert!(e.void_outage("alice", 7300 - 1).is_err());
    e.void_outage("alice", 7300).unwrap();
    assert!(e.invariant());
}
