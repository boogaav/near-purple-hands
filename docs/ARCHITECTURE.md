# Architecture and security boundaries

```text
Local browser → loopback Node server → Rust demo process → purple-engine
                                                            ↑
NEAR callers → native Exchange WASM → same purple-engine ─────┘
                    ↕ asynchronous receipts
             configured NEP-141 token
```

The two entry points share accounting, not identity or chain state. Browser identities are fixtures. NEAR identity is `predecessor_account_id`; deposits use the authenticated token callback’s `sender_id`. Arbitrary users cannot credit balances. No Ethereum signatures, EVM addresses, HyperCore precompiles or EVM chain IDs are reused.

## Funds

Amounts are integer six-decimal token units. Prices use six decimals. Intermediates use u128; stored balances/exposures use bounded u64. Winning P&L rounds down, losses up. Accounting identity is:

`total = available balances + position margin + remaining keeper escrow + unfilled entry fees + LP capital + treasury`

`reserved = sum(position margins) <= LP capital`

Withdrawal pre-debits total and the owner’s balance; in-flight token transfer value is tracked separately. A failed token receipt restores exactly that amount. A successful receipt leaves the debit. Only the contract’s private callback can finish it. A recipient must be registered with the FT. Deposits to an unregistered exchange account return unused tokens via the NEP-141 resolution flow. Unsupported message strings are fully refunded.

Registration charges a non-refundable 0.1 NEAR per account in this prototype. Whole-state serialization and 256-account bounds are deliberate local/testnet limits, not production scaling. Registration is permissionless within that cap. No real token address is supplied. Initial deployment must fund code/state storage separately.

## Authorization

Owners can register an agent **NEAR account** with an expiry and cumulative margin allowance. Opening deducts margin budget permanently, even if the request expires; this prevents retry budget recycling. Fees/escrow are additional balance debits and are not included in the margin allowance. Delegation authorizes only open/close requests for that owner. Other functions always use the predecessor’s own account or are permissionless with immutable recipients. Withdrawals and session changes require one yoctoNEAR, preventing use by zero-deposit restricted function-call keys.

The local UI does not yet connect a wallet or create native function-call keys. Testnet wallet support and key lifecycle UI are next-stage work. Do not give an agent a full-access key to a user account.

## Oracle and exits

Only the configured demo publisher can submit prices. Prices must be positive and within the cap, monotonically sequenced, not timestamp-regressive, not future-dated and no older than 15 seconds. This is **centralized and unsuitable for real funds**. A compromised oracle can determine outcomes; freshness checks do not solve trust or manipulation. No production Pyth/other oracle integration is claimed.

Every accepted publication resets outage state. Permissionless stale-health observations must be no more than 30 seconds apart; gaps restart the one-hour clock. Void requires current stale data and a recent observation. This prevents recycling an old outage across an accepted healthy publication; it cannot prove external market availability. User exits remain subject to fresh oracle data until a valid observed outage completes. The guardian can pause new entries only.

Fills are permissionless. The demo’s loop simulates oracle publication and keeper activity; a production keeper/monitoring system is not deployed. Pending opens expire, and mature LP removal blocks new entries until anyone processes it. Processing waits for all positions/pending requests to settle/cancel, then credits the LP owner internally without calling that owner. Thus an absent LP cannot indefinitely hold its request open, but oracle/keeper liveness still matters.

## Before accepting real funds

Production oracle validation and risk controls, durable indexer and keeper, bounded/paginated storage, gas profiling at capacity, multisig/timelock and deployment-key policy, risk versioning/governance, fee collection, wallet integration, chain integration/fuzz testing, independent audit, and explicit funded deployment approval remain required. No automatic upgrade or mainnet script exists. NEAR account access keys can still deploy new code; deployment-key custody must be designed before production.
