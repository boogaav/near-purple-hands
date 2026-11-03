# Purple Hands Solana V1 implementation task

Date: 2026-11-03. Audience: onchain engineer, backend engineer, frontend engineer and independent security reviewer.

Build a separate Solana implementation of Purple Hands with real USDC collateral, external and embedded wallets, Trader/LP modes, and a target trade of $10 margin at 1,000× price sensitivity. Reuse the product UX and tested arithmetic where appropriate; do not deploy the NEAR contract unchanged or modify Yellowhands on HyperEVM. This specification authorizes implementation and testing, not a claim that 1,000× mainnet trading is ready.

**Release condition:** prove verified oracle execution and bounded vault losses under adversarial conditions before enabling real deposits or trading. API access alone does not meet this condition. If the price/execution measurements cannot support 1,000×, keep that market disabled rather than weaken validation.

## 1. Product contract and decisions

V1 is a collateralized, capped-payout Trader-versus-LP market. It is not an externally hedged $10,000 perpetual position. A $10 margin with 1,000× sensitivity moves approximately $1 per basis point of BTC movement. Five basis points move $5; ten basis points consume the whole $10 before fees. At an illustrative $80,000 BTC price, one basis point is $8 of BTC price movement.

The frontend must disclose caps, fees, settlement source and execution policy. The chart may animate between updates, but interpolated chart prices must never become settlement inputs. Show gross trade performance and separately the estimated net amount returned; receipts reconcile both.

Before implementation freeze, product and risk owners must sign a versioned configuration sheet for:

| Decision | Required output |
|---|---|
| Margin and leverage | Initial intended margin $10, target leverage 1,000×; other sizes disabled until approved |
| Profit/loss cap | Exact maximum gain, maximum debit, liquidation threshold, position lifetime |
| Fees | Entry, exit, early-exit, profit fee, keeper bounty, verification and network fee allocation |
| Oracle | Exact BTC/USD stream ID, schema, decimals, verifier deployment and feed lifecycle |
| Timing | Request cutoff, execution window, timestamp precision, freshness and outage policy |
| Exposure | Total and per-side limits, per-position reserve, rolling loss allowance, isolated launch allocation |
| LP rules | Share valuation, deposit pricing, withdrawal delay, claim window, reservation priority |
| Sessions | Allowed instructions, duration, cumulative margin budget and revocation behavior |
| Governance | Multisig, timelock, upgrade policy, pause scope and emergency authority |

Do not silently copy NEAR engine constants into production. The existing engine has different candidate parameters including 1% entry fee, magnitude-based rake, early-exit fee and keeper escrow. Prior Yellowhands screenshots use different fee conventions. Establish one explicit Solana fee schedule and golden test vectors.

## 2. Architecture and trust boundaries

```text
External wallet / Privy Solana embedded wallet
                 | signed transactions
Frontend ------ RPC / transaction relay ----- Solana program
                 |                             | atomic CPI verification
Backend -------- Chainlink Data Streams ------- Chainlink verifier
  | indexer          signed report              |
  | keeper                              USDC escrow + isolated LP vault
  | analytics                                   |
  + Postgres / archive / monitoring ------ reconciled chain events
```

The backend fetches reports, constructs transactions, pays approved gas and retries delivery. It cannot select arbitrary settlement prices, sign as a user, change vault ownership, or withdraw user funds. The program verifies reports and all economic constraints. The database is a derived view, never the authority for balances or settlement.

Chainlink documents Solana report verification via CPI. Pin and verify the actual deployment, account owners/configuration, dependencies and access requirements; tutorial code is not an audited exchange implementation. An authenticated API response is not proof that onchain verification has succeeded. [Solana verification guide](https://docs.chain.link/data-streams/tutorials/solana-onchain-report-verification).

Use a new Solana workspace/repository when implementation starts, with shared arithmetic tests imported by explicit version. Keep this handoff in the existing fork for continuity. Separate devnet/mainnet configuration, keys, databases, program IDs, token mints and deployment manifests.

## 3. Onchain engineering work

### SC-01 Accounts and custody

Implement an Anchor/Rust program with documented PDA seeds and versioned account layouts:

- Global configuration: authorities, accepted USDC mint/token program, verifier configuration, pause flags and governance version.
- Market: BTC/USD feed, leverage/caps, timing rules, risk allocation and aggregate pending/open exposure.
- User collateral ledger and session permissions: owner, available balance, reserved balance, monotonically increasing request nonce.
- Position/request: owner, side, margin, leverage, immutable configuration version, requested slot/time, execution deadline, verified entry report digest/price, exit request and settlement details.
- LP vault: total assets, outstanding liabilities, share supply, queued withdrawals and reserved risk allowance.
- LP withdrawal request: owner, locked shares, request time, eligibility time, claim/cancel state.
- Risk accounting: committed maximum payout, realized gross vault losses and reserved loss allowance across configured rolling windows.

Use canonical native Solana USDC with six decimals, verifying its mint from Circle's official registry at deployment. Validate every account owner, PDA seed/bump, signer, token program, mint, vault authority and destination. Do not accept arbitrary Token-2022 extensions, wrapped lookalikes or caller-supplied verifier programs. Handle account rent and closure only after terminal-state safety checks.

Acceptance: substituted accounts, duplicate accounts, wrong mints, wrong authorities and account reinitialization cannot move funds. A user can withdraw unreserved collateral directly without the application backend.

### SC-02 Exact arithmetic and conservation

Extract deterministic integer math with explicit units and checked wide intermediates. Define side-aware return as signed price change × margin × leverage / entry price, then apply approved caps and the documented fee schedule. Specify rounding separately for obligations, payouts, shares, fees and rebates. Never use floating point onchain.

Property tests must prove conservation of real USDC across user collateral, position escrow, LP assets, fees and keeper allocations. Include price zero/negative rejection, extreme values, overflow, tiny share deposits, rounding accumulation, cap boundaries and USDC/USD depeg assumptions. Prevent first-depositor/donation share-price attacks using a reviewed share-accounting design.

Acceptance: a reference model and program agree over randomized sequences; settled payouts cannot exceed fully reserved obligations. Every displayed return can be reconciled to a receipt.

### SC-03 Verified oracle adapter

Allow only the pinned verifier and configured BTC/USD feed. Verify and decode within the settlement transaction; consume verified output rather than a caller's parallel price argument. Check report schema, feed ID, positive price, decimals, validity interval, observation timestamp, expiry, future skew and accepted verifier configuration. Reject forged, stale, wrong-feed and malformed reports.

Choose benchmark price or a documented side-aware bid/ask policy consistently for entry and exit. A bid/ask spread is not a statistical confidence interval. The absence of a Pyth-style confidence field does not prove 1,000× suitability. Review Chainlink timestamp semantics and feed migration before selecting a policy. [Report schema](https://docs.chain.link/data-streams/reference/report-schema-v3), [best practices](https://docs.chain.link/data-streams/concepts/best-practices).

Acceptance: successful real report verification on the intended Solana network; signature mutation and account substitution fail; verifier upgrade/configuration changes are monitored. Save report digests and public verification receipts as evidence.

### SC-04 Entry and exit execution state machine

Implement explicit transitions: pending entry → open or cancelled/expired; open → close requested → settled; open → eligible forced settlement; terminal states cannot pay again. Model recovery states explicitly rather than leaving requests permanently unresolved.

A user commits direction, margin and nonce before the eligible execution observation. Bind requests to a narrow, configured execution interval and immutable market configuration. Do not allow a trader or keeper to browse historical valid prices and choose the most profitable one. Reports with the same second timestamp need an explicit tie policy.

**Design review blocker:** a signature proves a report is authentic, not that it was the first report after a request. Define how the selected observation is uniquely eligible and what completeness evidence is available. If only bounded selection is possible, quantify the adversary's entire selection advantage and include it in the risk budget. Do not describe an unenforceable “first report” rule as guaranteed.

Persist client request IDs/nonces onchain. Retry by the same economic intent and query status before constructing replacement transactions. Distinguish an expired blockhash from an expired trade request. User cancellation and keeper execution racing must have one atomic winner. Oracle outages must preserve collateral and avoid granting a free retrospective option.

Acceptance: replay, delayed delivery, report reordering, same-timestamp alternatives, keeper censorship, cancellation races and duplicate transaction submission cannot produce duplicate positions or payouts. The recovery/timeout policy is specified and tested before launch.

### SC-05 Vault protection independent of oracle honesty

Reserve the full maximum LP-funded payout and any LP-funded keeper costs when accepting an entry request, including pending requests. Release reservations only after safe cancellation or final settlement. Avoid reducing reserves by assuming opposite-side positions offset; caps and asynchronous execution may invalidate that assumption.

Add isolated market capital and aggregate exposure limits. Add a gross-loss budget over rolling windows with outstanding commitments reserved against that budget. Trader losses, new deposits, account switching and window boundaries must not silently reset this allowance. If a new trade would exceed the remaining allowance, reject it before taking risk. Honor previously reserved payouts even after new entries stop.

Acceptance: an adversary with arbitrarily many wallets and authentic but economically adverse reports cannot extract more than the documented isolated allocation and permitted loss budget. Test sequential attacks, not only simultaneous positions. Record the maximum possible extraction and recovery conditions in the audit report. Reserve accounting alone prevents insolvency of one batch; it does not stop repeated vault draining.

### SC-06 LP shares and withdrawals

Implement add liquidity, request removal, cancel removal and claim. Define whether value remains exposed while shares are queued, how open positions are valued, and the priority between mature withdrawals and new trading risk. Prevent deposits/withdrawals exploiting stale NAV or unrealized liabilities. Claims may transfer only free, unreserved liquidity according to the reviewed policy.

Expose requested shares, estimated value, eligibility timestamp, actual liquidity blocker and final claim amount. A timer must distinguish a minimum delay from guaranteed availability. Index claims/cancellations immediately; reconcile against chain state.

Acceptance: deposit/claim/settlement races conserve assets; already reserved trader payouts remain funded; backend downtime cannot permanently trap a valid claim.

### SC-07 Sessions and governance

A delegated session may open/close only for its owner within expiry, per-trade limits and cumulative margin budget. It cannot withdraw, transfer ownership, expand its own limits or change destination accounts. Charge budget once per accepted intent; retries do not double-charge or bypass it. Revocation is enforced onchain.

Separate pause-new-risk authority from settlement/withdrawal behavior. Governance changes use reviewed multisig/timelock controls; existing positions retain their economic configuration. Pin upgrade authorities and monitor them. Do not claim an admin cannot override the system while an immediate upgrade key still exists. [Program deployment and authority](https://solana.com/docs/programs/deploying).

Acceptance: compromised session/keeper/API keys cannot withdraw collateral. Emergency procedures preserve existing obligations and have rehearsed recovery tests.

## 4. Backend engineering work

### BE-01 Oracle acquisition and evidence

Use Data Streams credentials server-side only. Separate environments, enforce clock synchronization, reconnect WebSocket with backoff and backfill gaps through supported REST APIs. Store raw signed reports in restricted durable storage with feed ID, digest, provider timestamp, receipt time and decode version. Do not log authentication headers or secrets.

The official mainnet base is `https://api.dataengine.chain.link`; requests use an API key and secret-based HMAC. Feed subscriptions and testnet/mainnet credentials differ. Public discovery alone does not validate report entitlement. [Authentication](https://docs.chain.link/data-streams/reference/data-streams-api/authentication), [REST API](https://docs.chain.link/data-streams/reference/data-streams-api/interface-api), [discovery](https://docs.chain.link/data-streams/reference/data-streams-api/discovery-endpoint).

Measure observation age, receive lag, inter-report gaps, verification cost, end-to-end execution latency, bid/ask width and disagreement with independent markets. Record median/p95/p99/max and outages. Test volatile periods; a quiet short sample is not a safety certificate. Independently sourced prices may veto new risk under a defined policy, but must not silently replace the verified settlement source.

Deliverable: reproducible report-access test, onchain verification proof, timestamp-selection analysis, performance dataset and an explicit go/no-go recommendation for 1,000×.

### BE-02 Transaction builder and relay

Provide typed endpoints for deposit, withdrawal, entry intent, close intent, session registration/revocation, LP add/request/cancel/claim and transaction status. Return unsigned transactions or exact instructions for user authorization. Authenticate wallet ownership; never trust a supplied email or address as authorization.

Validate request limits server-side for UX, repeat all security checks onchain. Simulate transactions, estimate compute/priority fees within budgets, submit through healthy RPC providers and track processed/confirmed/finalized outcomes. Define which level enables which UX action; handle rollback and RPC disagreement.

Maintain a durable idempotency record keyed by owner + operation + nonce. On timeout query chain state and all known signatures before replacing a transaction. Preserve the user's economic intent when refreshing a blockhash. [Solana transaction model](https://solana.com/docs/core/transactions).

Acceptance: a dropped HTTP response or service restart never requires opening another position to recover; status distinguishes not submitted, submitted, confirmed, finalized, failed, expired and unknown.

### BE-03 Keepers and recovery

Run durable jobs for pending-entry execution, requested exit, liquidation/expiry and reconciliation. Coordinate multiple workers with leases, but rely on onchain idempotency as the final safeguard. Prioritize risk-reducing work. Validate report eligibility before submission; never execute with a convenient stale price to clear a queue.

Keepers should be replaceable and permissionless where practical. Expose direct user recovery actions with accurate transaction status. Bound keeper spending and rewards, alert on low SOL, stuck transactions, feed loss and accumulating close requests. Rehearse RPC outage, process crash, clock skew and oracle interruption.

### BE-04 Indexer, history and analytics

Index versioned program events from a recorded deployment slot, store signature/instruction index/slot identity, and backfill after downtime. Reconcile vault token balances, user ledgers, LP shares, requests and positions periodically. Treat websocket notifications as hints; support finalized replay and correction of provisional records.

Capture every client attempt through settlement with correlation ID, pseudonymous user/wallet, operation, stage, program error, signature, report digest, request/observation/submit/confirmation times, RPC and retry reason. Never send email, full wallet identity or signatures/private payloads indiscriminately to public analytics vendors.

Build a protected admin dashboard: onboarding conversion, wallet creation, top-up/bridge/load failures, entry/exit latency, unresolved requests, realized net P&L, fees, vault NAV/reserves, LP queues, oracle gaps, gas spend and loss-budget headroom. Define retention, access roles and deletion policy. Browser events can be blocked; do not promise literal 100% browser capture. Onchain events plus reconciliation are the authoritative coverage target.

### BE-05 Wallets, funding and sponsored gas

Support external Solana wallets and email-authenticated Privy Solana embedded wallets; EVM addresses are not Solana addresses. Verify current SDK/network capabilities and create/recover the correct wallet after login. [Privy Solana integration](https://docs.privy.io/recipes/solana/getting-started-with-privy-and-solana).

V1 minimum funding path: receive canonical Solana USDC → detect confirmed arrival → load trading collateral. Provide an address/QR with explicit network and mint information. For Base USDC migration, implement a separately reviewed supported bridge route with route quotes, source/destination status and resumability; do not assume a HyperEVM bridge implementation transfers unchanged. [Circle chain support](https://developers.circle.com/cctp/concepts/supported-chains-and-domains).

Sponsor only allowlisted program instructions with verified account/destination constraints and per-user/global budgets. A fee payer is not unrestricted transaction signing. Budget SOL for transaction fees, priority fees, account rent and verifier costs. Ensure first-time account creation and user withdrawals still work when sponsorship is unavailable. Report the fallback clearly.

Stripe/card/Apple Pay support is a separate provider approval and regional-availability dependency. Do not make it a prerequisite for the initial crypto-funded launch or advertise it before end-to-end provider approval.

### BE-06 Deployment and operations

Use separate hot fee-payer/keeper roles and offline/multisig governance. Store secrets in the deployment secret manager, rotate with overlap and never commit them. Use managed Postgres or a documented backup/restore process; signed report archives and configuration manifests need retention sufficient to reproduce disputes.

Run redundant RPC access and health checks covering fresh verified data, keeper progress and reconciliation, not just HTTP 200. Define operator runbooks for stuck exits, invalid oracle data, depleted gas reserves, indexer divergence, RPC outage, database restore and emergency pause. Alerting must include severity and the next safe action.

Deliver a reproducible deployment manifest with program binary hash, source commit, IDL, network/program/mint/verifier IDs, authorities, configuration values, migrations and monitoring links. Restore tests and rollback procedures are required. Rollback cannot rewrite already accepted economic obligations.

## 5. Frontend integration acceptance

Preserve Trader/LP switch, UP/DOWN hands, focused chart, entry/exit markers and net receipt history. Show connection before balance; never show an old wallet's data after account switching.

Onboarding exposes only the current action: sign in → top up → load funds → enable session → trade. Every action displays live status and a recovery path. Request submission is not a filled trade; render the position after confirmed execution and show its actual verified entry price/time.

While open, show responsive gross price performance, net estimated return and fees through accessible details. The exit button submits a close request and reports each subsequent stage. Do not freeze it indefinitely on “unresolved” without identifying whether a signature exists, chain status is unknown or execution awaits an eligible report.

LP mode shows active/queued shares, estimated value, realized changes, timing and actual liquidity blockers. All money amounts come from reconciled chain state. Reuse the visual design, not old network assumptions.

## 6. Required test matrix

| Area | Minimum tests and evidence |
|---|---|
| Oracle | Authentic report success; tampered signature; wrong feed/schema/config; stale/future/expired data; missing intervals; timestamp ties; network mismatch |
| Execution | Front-running; sandwich ordering; report selection advantage; duplicate/reordered intents; cancellation/settlement races; blockhash expiry; rollback; close versus liquidation |
| Economics | Gain/loss caps; all fee vectors; rounding; overflow; share donation attack; sequential Sybil draining; rolling-window boundary; pending commitments |
| Custody | Wrong mint/owner/token program; arbitrary CPI; forged PDA; account substitution; unauthorized session withdrawal; replay across markets/networks |
| LP | Deposit around settlement; queued claims competing with entries; NAV changes; partial liquidity; claim/cancel races; backend-independent claims |
| Operations | Keeper crash/restart; oracle/RPC outage; database restore; gap backfill; gas depletion; sponsor abuse; compromised API key; governance pause/unpause |
| UX | Fresh email wallet; existing wallet; switch account/network; reload/reconnect; duplicate clicks; successful and failed top-up/load/entry/exit/claim |

Use unit and property tests for math, local validator/integration tests for instructions, and actual devnet verifier tests where supported. If the required feed/verifier is unavailable on devnet, document the limitation and arrange a bounded verification-only mainnet test with separate approval; mocks are not a substitute for live compatibility evidence.

Independent review must cover the entire path: programs, oracle adapter, governance, transaction builder and key management. Resolve all critical/high findings, reassess affected tests and publish a residual-risk register before real-money release.

## 7. Milestones and ownership

| Milestone | Owner | Exit criteria |
|---|---|---|
| M0 Oracle feasibility | Backend + onchain | Credentials tested; exact active feed selected; live CPI proof; execution timing and cost measured; 1,000× feasibility decision |
| M1 Economic specification | Onchain + risk/product | Approved parameter sheet, reserve/loss-budget model, oracle-selection and outage policy, golden vectors |
| M2 Programs | Onchain | Deposit/withdraw/session/trade/LP state machines, events, IDL, invariants and adversarial test suite |
| M3 Services | Backend | Feed service, relay, keepers, indexer, reconciliation, analytics, sponsorship and recovery runbooks |
| M4 Product integration | Frontend + backend | Full wallet-to-trade-to-withdraw and LP round trips; fees/history reconcile; no unresolved-state dead ends |
| M5 Review and rehearsal | Independent reviewer + team | Findings resolved; load/outage tests and restore rehearsal; signed deployment manifest |
| M6 Restricted mainnet rollout | Release owner | Approved isolated capital and loss caps, monitoring staffed, direct recovery verified, then controlled expansion |

Backend and onchain teams can parallelize tooling after interfaces are frozen, but M0/M1 block production economic implementation decisions. Do not quote a fixed launch date before these gates have evidence.

## 8. Definition of done and release evidence

The release package contains source and reproducible builds on GitHub; reviewed IDL and API schemas; migration/deployment scripts; all approved configuration values; oracle sampling and verification evidence; property/integration/adversarial test results; independent review; backup restore evidence; governance/key inventory without secrets; and runbooks with assigned operators.

A tester must be able to fund a new wallet with real supported USDC, load collateral, authorize a limited session, open and close exactly one position despite retries, inspect a reconciled receipt, withdraw, add LP liquidity and claim a mature removal. A simulated compromised backend cannot fabricate prices or exceed the onchain reserved-loss envelope. A simulated outage must follow the documented recovery policy.

Mainnet is **not ready** merely because the API works, the frontend looks complete, or devnet trades pass. Release requires evidence that the exact oracle/execution mechanism and risk limits support the requested 1,000× product.

## 9. Credential access check on 2026-11-03

The locally saved mainnet credentials were used against the official endpoint. Discovery returned HTTP 200. The live V3 BTC/USD candidate `0x00039d9e45394f473ab1f050a1b963e6b05351e52d71e507509ada0c95ed75b8` was marked `isSubscribed: false`; latest-report retrieval returned HTTP 401 with `feeds not authorized`. Another live BTC/USD catalogue entry was also unsubscribed. Neither candidate listed a scheduled decommission time in this response; that must be rechecked before release.

Next action: enable the intended BTC/USD stream subscription in the Chainlink account, checking its pricing and Solana verifier compatibility before accepting billing terms. Then rerun the report test and complete M0. No signed BTC report was retrieved or verified onchain in this check, and it establishes no latency/accuracy claim.

Local tools: `node scripts/chainlink-key-setup.mjs` opens a loopback-only credential form; `node scripts/chainlink-access-check.mjs` checks discovery; passing the approved 32-byte feed ID checks latest-report access. Credentials and response files stay under ignored `.local/`; never commit them. Only sanitized test outcomes belong in release evidence.
