//! JSON-lines local simulator using the exact accounting engine linked into NEAR WASM.
use purple_engine::{Engine, UNIT};
use serde_json::{json, Value};
use std::io::{self, BufRead, Write};
fn seed() -> Engine {
    let mut e = Engine::default();
    e.notice = 60;
    for who in ["trader.local", "lp.local", "keeper.local"] {
        e.register(who).unwrap();
    }
    e.deposit("lp.local", 10_000 * UNIT).unwrap();
    e.add_liquidity("lp.local", 9_000 * UNIT).unwrap();
    e.deposit("trader.local", 200 * UNIT).unwrap();
    e
}
fn num(v: &Value, k: &str) -> Result<u64, String> {
    v[k].as_u64().ok_or(format!("Missing {k}"))
}
fn run(e: &mut Engine, v: &Value, history: &mut Vec<Value>) -> Result<Value, String> {
    let now = num(v, "now")?;
    let block = num(v, "block")?;
    let cmd = v["action"].as_str().unwrap_or("state");
    let price = e.price;
    match cmd {
        "reset" => {
            *e = seed();
            history.clear();
        }
        "tick" => {
            e.publish(num(v, "price")?, now, e.sequence + 1, now)?;
            e.health(now);
            let owners: Vec<_> = e.positions.keys().cloned().collect();
            for owner in owners {
                let p = e.positions[&owner].clone();
                if p.entry == 0 {
                    if block > p.open.until {
                        e.cancel_open(&owner, block)?;
                    } else if block >= p.open.from {
                        let _ = e.fill_open(&owner, "keeper.local", now, block);
                    }
                } else {
                    if let Ok(o) = e.settle(&owner, "keeper.local", now, block) {
                        history.insert(0, json!(o));
                        history.truncate(100);
                    }
                }
            }
        }
        "open" => {
            e.request_open(
                "trader.local",
                "trader.local",
                v["long"].as_bool().unwrap_or(true),
                num(v, "margin")?,
                num(v, "leverage")?,
                price * 99 / 100,
                price * 101 / 100,
                now,
                block,
            )?;
        }
        "close" => {
            e.request_close(
                "trader.local",
                "trader.local",
                price * 99 / 100,
                price * 101 / 100,
                now,
                block,
            )?;
        }
        "topup" => {
            e.deposit("trader.local", 100 * UNIT)?;
        }
        "lp_add" => {
            e.add_liquidity("lp.local", 100 * UNIT)?;
        }
        "lp_remove" => {
            let shares = e.account("lp.local")?.shares / 10;
            e.request_remove("lp.local", shares, now)?;
        }
        "lp_claim" => {
            e.process_remove("lp.local", now)?;
        }
        "state" => {}
        _ => return Err("Unknown action".into()),
    };
    assert!(e.invariant());
    Ok(json!(null))
}
fn main() {
    let mut e = seed();
    let mut history = vec![];
    for line in io::stdin().lock().lines() {
        let answer = match line {
            Ok(line) => match serde_json::from_str::<Value>(&line) {
                Ok(v) => {
                    let old = e.clone();
                    let old_history = history.clone();
                    let result = run(&mut e, &v, &mut history);
                    if result.is_err() {
                        e = old;
                        history = old_history;
                    }
                    json!({"ok":result.is_ok(),"error":result.err(),"state":e,"history":history,"invariant":e.invariant()})
                }
                Err(err) => json!({"ok":false,"error":err.to_string()}),
            },
            Err(_) => break,
        };
        println!("{answer}");
        io::stdout().flush().unwrap();
    }
}
