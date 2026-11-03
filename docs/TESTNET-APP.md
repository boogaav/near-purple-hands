# Connected testnet app

This runs against the deployed native NEAR exchange, using mock USDC (no monetary value). It does not modify either live domain.

Start three terminals from the repository:

```sh
npm run api:testnet
npm run worker:testnet
npm run dev:testnet
```

Open http://127.0.0.1:8891. The API on 8892 is read-only and loads no keys. Vite proxies it locally. The legacy simulator remains available through `npm run dev` on 8890.

## Wallet flow

Connect a user-controlled Meteor Wallet on testnet. Wallet Selector retains the selected account. Register on the exchange (0.1 test NEAR non-refundable storage), then load 100 mock USDC using the balance button. The user signs transactions in their wallet. Fixture keys are never sent to the browser. The withdraw button withdraws the available trading balance to the same account; token storage registration is required.

To provision a tester with mock tokens, the operator runs:

```sh
node scripts/fund-testnet-user.mjs alice.testnet
```

This uses the approved root fixture to register token storage and top the wallet up to 1,000 mock tokens. It cannot transfer real USDC, has no HTTP endpoint, and must never be exposed publicly. The tester obtains test NEAR separately through the NEAR faucet. Do not import operator fixture keys into the browser.

## Oracle / keeper

The worker loads only the approved oracle, keeper and guardian local keys. It reads Coinbase BTC-USD ticker (last trade, source timestamp and bid/ask validation), rejects quotes older than 10 seconds, future timestamps, crossed/wide quotes and invalid values. It publishes six-decimal BTC prices to the deployed exchange. This is a **trusted single-source test oracle**, not a cryptographically verified decentralized oracle. Pyth's current public endpoint requires authentication, so it is not used.

The chart and P&L use the published contract price. Typical update latency is several seconds due to NEAR finality and the public RPC, not a high-frequency execution service.

The keeper scans contract state for open/close requests, waits for the fill block, honors price bounds and expiration, refunds expired entries, settles cap/expiry events and processes mature LP removals. Contract state is the source of truth after restart. Expired close requests need a new user-signed request; the worker cannot fabricate authorization. A single-instance lock prevents nonce contention. A stale process lock is recovered only when its PID is absent.

Final receipts and settlement outcomes are written to `.local/testnet-runtime/events.jsonl`. The UI shows worker-observed settlements for the selected account with explorer links. This is not a full historical chain indexer: transactions settled by other keepers or before this journal began are not backfilled. Back up this directory before moving the service.

Entries are enabled while the worker is healthy. Oracle errors pause new entries; graceful shutdown pauses them too. A hard crash cannot send a pause, but the contract rejects stale oracle prices after 15 seconds and the UI disables entry when the worker heartbeat expires. Pending exits still need healthy prices and an operating keeper. No automatic restart or always-on hosting is installed on this laptop.

## Verification

- `npm run test:services`: quote validation, entry windows, expiry and close conditions.
- `npm run build:testnet`: bundled browser build.
- `node scripts/smoke-services.mjs`: approved trader fixture requests one trade; the running oracle/keeper must fill and settle it autonomously. Records public hashes in `deployments/services-testnet.json`.
- `npm run verify:testnet`: bytecode and custody reconciliation.

Before public deployment: separate host, durable journal/indexing, monitored service supervisor, oracle design review and tester wallet end-to-end approval. Keep keys server-side and deploy only the built frontend assets. Do not serve the repository or `.local` directory. The contracts remain bounded testnet prototypes.

MyNearWallet was removed because it no longer accepts new app connections. The wallet picker uses Meteor’s testnet connector. Trust Wallet’s documented connector lists EVM, Solana and Bitcoin, not native NEAR; holding NEAR does not establish support for this contract-signing flow.
