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

The local checks above are not a security audit or production-load test. The subsequently completed testnet checks are recorded below. No user wallet signed a transaction. The browser runs a local simulation backed by the shared Rust engine; the separate sandbox suite verifies the native NEAR wrapper and asynchronous receipt path. Local mock-token balances have no value. No persistent public backend, real oracle, wallet login, bridge, or domain cutover was tested.

The sandbox harness uses pinned test-only dependencies. Run `npm audit` when changing them; the transitive archive package is overridden to a patched version. The final audit reported 0 high/critical and 13 low-severity findings in test-tool dependencies. The demo server itself only imports Node built-ins.

## Public testnet verification — 2026-11-02

Deployed and atomically initialized the native exchange and mock NEP-141 token. Independent read-only verification confirms both remote bytecode SHA-256 hashes match the tested artifacts and both deployment transactions are FINAL.

The approved fixture accounts completed NEP-141 deposits, a 9,000 mock-token LP deposit, a delayed $10/1,000× long entry, delayed exit, and a 1 mock-token withdrawal. All balances reconciled. The withdrawal callback completed and the wallet received the token. Test oracle prices were synthetic (80,000 → 80,010), not market observations.

- Exchange deployment: `4wzDaQFa2EA3ydjeC2XGJRSNeryiUnyavKLWWjAMYeh9`
- Token deployment: `5UDv38uBguEnREcLS3om224Axdn1Qz15wVUdjpZwxfjT`
- Settlement: `BU6LY3q5cTP2KbaWeN1PCMzrk9AWm6HucNQvuhGqFy79`
- Withdrawal: `EmnHGyE1hMJk5kB9KsVJtkTB1hukuZHYw2szxfPjEAuu`
- Final pause: `Aq41qNQ8Xg6yQaJEfAfxURaEmAsrLVzn2XmMP4wx4Sns`

Final state: entries paused, zero open positions, zero reserved capital. There is no persistent testnet oracle/keeper service or connected wallet UI. Credentials are local and ignored by Git. The legacy RPC reported deprecation; the scripts now use the documented free FastNEAR testnet endpoint with pacing and bounded HTTP-429 backoff.
