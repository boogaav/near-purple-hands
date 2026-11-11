# NEAR queued Hyperliquid pilot

Status: activated on NEAR mainnet on 2026-11-11; owner trading test remains outstanding. Activation transaction: 777WX9VEPKuYAMwtRT7qY3Gev3jKm8QeGVhPHcGJZbXH. USDC ledger preservation checks passed. Restricted HyperEVM emitter is deployed at the address in deployments/hyperevm-btc-restricted.json.

The adapter uses contract.wormhole_crypto.near to authenticate VAAs and pins the HyperEVM chain, emitter, market, payload and consistency level. It accepts quotes in source sequence order. Each accepted quote automatically attempts entry and settlement for all pilot positions. Existing USDC ledger serialization is preserved.

Execution uses a post-request observation, existing signed price bounds, and a 120-block request window. The delivery age allowance is 15 seconds. This replaces the previous two-second freshness check only after activation. It is a maximum age limit, not an execution speed promise. The relay delay and NEAR receipts remain part of click-to-confirmation time.

The feed uses HyperCore BTC BBO midpoint, with raw values scaled by 10 to dollars and a five-basis-point maximum spread. BBO spread is not a statistical confidence interval. Wormhole authenticates the source message. Market manipulation, guardian trust, relay availability and the exchange deployment key remain relevant risks.

Recovery refuses to skip stale observations while orders or positions exist. Expired entries can be cancelled using the existing method. An active position can use the existing one-hour oracle-outage recovery. When no positions remain, historical proofs can be consumed in sequence without executing trades.

Validation completed:
- Rust unit tests cover parsing, wrong source/market, malformed messages, failed verification, duplicate messages and callback entry/exit accounting.
- A real probe VAA was successfully verified by the NEAR Wormhole core in transaction AR4bRa6qsuLoEBhijpigwhADzkBebCwga5cQghUNGz9T.
- Existing local WASM integration covers the original NEP-141 deposit, trade, withdrawal and refund paths.
- The callback unit test assumes a successful verifier result. It does not replace a full live upgraded exchange test.

Activation:
1. Install and supervise the relay on the host. Provision restricted function-call signing for submit_hyperliquid_price on the exchange account. Keep deployment credentials off the relay host.
2. Run scripts/activate-hyperliquid-mainnet.mjs for the preflight and ledger backup.
3. With the relay ready, run the same script with ACTIVATE_HYPERLIQUID=yes. It deploys the WASM and activates the pinned feed in one transaction, requires no existing positions, and verifies ledger preservation.
4. Run mainnet/service/hyperliquid-relay.mjs with HYPERLIQUID_SIGNER_FILE and NEAR_RELAY_KEY_FILE. RELAY_STATUS_FILE must point to the status service's operator.json.
5. Set RELAY_CONTINUOUS=true for the supervised cloud relay. RELAY_ACTIVITY_FILE enables idle sleep after 30 seconds without owner status requests, unless a position exists. The relay key permits only submit_hyperliquid_price and cancel_open, with a 0.25 NEAR allowance. Source gas is capped at 0.5 gwei, capture gas at 250,000 and message fee at 0.000001 HYPE. New-entry heartbeat is disabled below 20 conservative capture budgets. This is a limited owner-test reserve, not a public-service funding guarantee.
6. Verify complete entry and exit receipts and publish the frontend compatibility change before declaring the pilot ready.

Cloud relay and frontend v175 are deployed. Live exchange proofs advanced through source sequences 1–3; transaction DRMmVTSp1AHBDL5E1YXbYJsxMaA8qGRv9mbkzEzqMV9v accepted sequence 3. Observed quote age at confirmation was approximately 6.7–7 seconds. Relay returned to idle with zero container restarts. Remaining: owner-signed real entry/exit test and measured click-to-settlement latency. No real user trade was placed during deployment. The reserve needs monitoring and replenishment before extended testing.
