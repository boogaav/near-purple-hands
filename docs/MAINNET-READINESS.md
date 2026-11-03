# V1 mainnet readiness — 2026-11-03

Status: **not deployed; real-funds launch blocked**. User authorized NEAR mainnet with real USDC and owner `yellowhands.near`. This supersedes the earlier testnet-only task scope, but is not evidence that the prototype is ready. Yellowhands on HyperEVM is outside this release.

## Completed in this pass

- Read the native exchange adapter, deterministic engine, worker, keeper policy and tests.
- Entry and voluntary-close requests now require a strictly newer oracle sequence **and** an observation timestamp strictly after request creation. Previously the two-block delay could execute using the same pre-request quote. Regression tests cover same-sequence, new-sequence/same-timestamp and valid later observations. This mitigates pre-request price reuse; it does not remove all late-look/keeper selection risk.
- New native exchange deployments start with entries paused. Deposit acceptance is still independent of this pause; do not present a paused exchange as a fully gated public launch.
- Keeper policy recognizes the added request fields and rejects future timestamps. Legacy testnet request objects remain readable.
- Recorded the requested owner and Circle-native six-decimal USDC in `mainnet/config.json`.
- Added `node scripts/preflight-mainnet.mjs`: read-only network, owner balance and USDC metadata verification. It never loads keys or transacts and returns a nonzero status while blocked.

**Storage compatibility:** request serialization changed. Do not upgrade the existing testnet contract in place with these artifacts. Use a fresh contract or design and test an explicit migration. No existing contract was updated in this pass.

## Findings still open

| Severity | Finding and effect | Required resolution |
| --- | --- | --- |
| Critical launch dependency | `publish_price` trusts a single operator account with the entire settlement price. A compromised oracle key can choose winners/losers. | Authenticated production feed with verified deployment/key provenance, fixed BTC/USD semantics, strict freshness/confidence/source policy and replay protection; no operator-price fallback. |
| High | A valid quote can be 15 seconds old at 1,000× leverage. Two-block delay does not ensure observation after the earliest execution block, and the keeper can choose among quotes within a 20-block window. | Model adversarial fills/settlements and latency; specify deterministic observation selection and fail-closed timing. Do not declare the new request guard a complete oracle solution. |
| High | Registration permanently caps all accounts at 256, with no unregister/reclaim path. Cheap registrations can deny new users service. | Storage-funded scalable account maps or a reviewed reclaim/capacity design; worst-case gas/storage testing. |
| High | Outage refunds require health observations at most 30 seconds apart for one hour. Current worker does not maintain these observations on failure; no service means the clock cannot progress. | Independent recovery monitoring and tested recovery path, including total worker outage and restart. |
| High | API/oracle/keeper remain laptop processes. The worker automatically unpauses on healthy prices, which would override an operator's manual pause if reused on mainnet. | Separate production service, persistent journal, supervised restart, backups, alerts, deliberate operator-controlled activation and recovery drills. |
| High | Owner has zero NEAR at observed mainnet block 222845745; signer access and operational funding are unverified. | Fund and sign through the owning wallet; separate deployment, oracle, guardian and keeper permissions. Never copy testnet keys into mainnet. |
| Medium | Treasury fees accrue with no collection method. Fee descriptions also need reconciliation: engine rakes the magnitude of both gains and losses, with different incidence. | Explicit economic specification and withdrawal design/tests before promising fee distribution. |
| Medium | Events other than settlement lack enough request/account detail for a complete durable activity index. | Structured events, durable index and restart/reorg reconciliation. |
| Review gate | Local tests and this internal review are not independent security review. | Independent review of the final artifact and correction of material findings. |

## Oracle investigation

- **Pyth:** current [supported-chain documentation](https://docs.pyth.network/pro/use-prices-on-blockchain) explicitly lists NEAR among no-longer-supported Pyth Core chains. An old `pyth-oracle.near` address is not sufficient evidence of a supported, live integration. A new supported deployment would require provider coordination.
- **NearDeFi:** [source repository](https://github.com/NearDeFi/price-oracle) describes a trusted-party oracle. Production reporter set, BTC instrument, freshness and deployment provenance remain unverified.
- **OutLayer:** [provider documentation](https://price-oracle.outlayer.ai/docs/) describes TEE signed prices and callbacks. It also says cached onchain views may be stale, and most upstream inputs are timestamped at fetch rather than exchange observation. The caller can request source exclusions and a minimum source count; those settings/source reports are not in the example signed price payload. A receiver checking only signature/asset/time could accept a payload from a different source-selection policy. This is a design concern requiring source/attestation review, not a verified exploit or an endorsed replacement. No payment account was created and no paid requests were made.

Production acceptance must cover the BTC/USD asset (not silently substitute a wrapped-BTC market), signed configuration/source policy, key rotation/governance, maximum source age, confidence/spread under high leverage, outage semantics, request-to-observation ordering, p95/p99 end-to-end latency and sustained capacity. A visually smooth chart is not evidence of settlement safety.

## Token and launch sequence

[Circle's official address list](https://developers.circle.com/stablecoins/usdc-contract-addresses) identifies native USDC as `17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1`. Read-only mainnet metadata returned `USDC`, 6 decimals. This is not bridged USDC.e. Contract storage registration and actual transfer/callback behavior still need production-specific verification.

1. Close the findings and select/verify the production oracle; freeze the reviewed artifact.
2. Verify wallet ownership, funding and separate role permissions; prepare exact deployment transactions and budgets.
3. Deploy a fresh exchange paused, register its native-USDC storage, verify remote bytecode/configuration. No overwrite of the owner wallet account.
4. Verify funding/withdrawal, delayed fills, settlement, restart/recovery and accounting on the final integration before opening access.
5. Activate with explicit liquidity/risk limits, monitoring and an independent review result. Cut over only Purple Hands' domain.

No mainnet transactions, DNS changes, real-token deposits, key creation or public launch occurred in this pass.

## Verification of this patch

- `cargo test --workspace --locked`: 18 tests pass (14 engine/accounting, 4 adapter).
- `npm run test:services`: 4 keeper/oracle policy tests pass.
- `npm run build:contract`: release WASM builds successfully.
- `npm run test:sandbox`: fresh native WASM deployment, initially paused state, NEP-141 deposits, LP mint, post-request quote entry/exit, withdrawal and failed-transfer refund pass. The first run rejected an older finalized quote; the harness now waits for a finalized timestamp after request creation rather than assuming a fixed block wait makes the timestamp newer.
- `npm run build:testnet`: frontend build passes (existing dependency eval warnings).
- Read-only preflight: mainnet chain identity and USDC symbol/6 decimals verified; owner balance zero; exits 2 with explicit blockers.

No independent audit, real-USDC transfer, production oracle integration, sustained load test or production deployment is claimed by these results.


## Follow-up: funding, recovery and verified-oracle candidate

Mainnet funding rechecked at block 222846750: `yellowhands.near` holds **9.77 NEAR**. Meteor has that account open. No funds have been spent; signing/deployment remains outstanding.

The recovery engine now records the chain time at each accepted publication. After one hour without an accepted publication, an open position can be voided permissionlessly to its fixed owner balance; no periodic observer is required. Healthy publication resets the deadline, and health calls cannot change it. Entry fees remain paid and unused escrow is returned, as before. This changes the timeout policy and storage layout; it applies only to new artifacts, not existing deployments.

The signed-provider implementation, live sample results and remaining oracle blockers are in [VERIFIED-ORACLE.md](VERIFIED-ORACLE.md). Six authenticated Pyth messages matched the official signer registry, but their confidence exceeds the current contract limit. They were not used for settlement. The provider choice remains a custom-adapter candidate, not a completed production integration.
