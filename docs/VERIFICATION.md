# Local verification — 2026-11-02

## Executed

- `cargo test --workspace --locked`: 16 passing tests (12 accounting/regression scenarios, 4 NEAR adapter tests). The price sweep covers 402 direction/price combinations within one test.
- `npm run build:contract`: native exchange and mock NEP-141 token WASM compiled, optimized and feature-lowered with Binaryen.
- `npm run test:sandbox`: actual WASM deployed into local nearcore 2.14.0; deposit → LP mint → delayed open → delayed close → token withdrawal passed. Unregistering the recipient intentionally makes the next FT transfer fail; the private callback restores its trading balance and clears the pending withdrawal.
- Browser: entry queue, changing P&L, exit queue, receipt, LP switch, 60-second countdown and claim verified at localhost:8890.
- JavaScript syntax checks for demo server/client.

## Regression coverage

Entry fee is credited exactly once. Minting against an open book is rejected. A third party can process a matured dust redemption. Healthy oracle publication resets the observed outage; gaps between observations restart the timer. Both directions conserve funds on full-price gaps. Early exit fees are capped by payout. Session budgets cannot be reused after expired requests. Stale/replayed/future oracle messages fail. Delayed fills cannot execute in their admission block. Failed outbound token transfers restore exactly the pre-debited balance.

The sandbox intentionally prints a failed receipt for the unregistered recipient. The success condition is the subsequent `withdraw_failed_refunded` event and matching balance assertions, not absence of every failed receipt.

## Limits

This is not a security audit, production-load test, or mainnet/testnet deployment. No user wallet signed a transaction. The browser runs a local simulation backed by the shared Rust engine; the separate sandbox suite verifies the native NEAR wrapper and asynchronous receipt path. Local mock-token balances have no value. No persistent public backend, real oracle, wallet login, bridge, or domain cutover was tested.

The sandbox harness uses pinned test-only dependencies. Run `npm audit` when changing them; the transitive archive package is overridden to a patched version. The final audit reported 0 high/critical and 13 low-severity findings in test-tool dependencies. The demo server itself only imports Node built-ins.
