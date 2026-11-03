# Verified oracle candidate — 2026-11-03

The user chose provider-authenticated prices with no operator/manual-price fallback. Implementation is a **custom Pyth Pro NEAR verifier candidate**, not an official Pyth-supported NEAR receiver, completed audit or deployed mainnet service.

## Implemented boundary

- `near_purple_exchange_verified.wasm` exports `new_verified` and `submit_verified_price`. It does not export the trusted-test `new` or `publish_price`. `scripts/check-verified-artifact.mjs` checks the actual WASM export table.
- The separate `test-oracle` Cargo feature preserves the existing testnet/sandbox workflow. Even that build rejects manual prices when initialized in verified mode.
- A signer, expiration, feed, channel and confidence bound are fixed at initialization. There is no in-contract setter or fallback. A permissionless submitter carries an opaque signed message; it cannot set the price directly.
- NEAR's Ed25519 host function verifies the exact payload bytes against the pinned key. Bounded parser accepts one feed, rejects unknown/duplicate/missing fields, invalid lengths, trailing bytes and unsupported formats.
- Required signed properties: price, exponent, confidence, publisher count, market session, feed observation timestamp. Minimum three publishers, regular session, positive price/confidence and checked six-decimal scaling. Unknown/new formats fail closed.
- Both envelope and observation timestamps are checked. Observation must be strictly newer than the previous accepted microsecond timestamp, not in the future, no more than two seconds old and no newer than the envelope timestamp. A new envelope cannot refresh an old carried-forward observation.
- The two-second bound and signer expiry are checked again at admission/fill/settlement, not just publication. Request ordering separately requires a post-request observation.
- Current candidate confidence configuration permits at most 5 bps. **Do not loosen this silently.** It is a provisional testing bound, not a proven safe risk profile.

## Provider evidence

[Pyth Pro payload documentation](https://docs.pyth.network/pro/payload-reference) describes Ed25519 messages and `feedUpdateTimestamp`. [Official protocol source](https://github.com/pyth-network/pyth-lazer-public/tree/main/sdk/rust/protocol/src) defines the envelope and property layout. The historical signed fixture in `pyth-fixture.hex` comes from `payload/standard.rs` and is distributed under [Apache 2.0](licenses/PYTH-APACHE-2.0.txt). It is historical public test data, not a production quote or signing key.

We independently read the signer registry specified by the [official Solana receiver source](https://github.com/pyth-network/pyth-lazer-public/blob/main/contracts/solana/programs/pyth-lazer-solana-contract/src/lib.rs): `3rdJbqfnagQ4yx9HXJViD4zc4xpiSqmFsKpPuSCQVyQL`, owner `pytd2yyk641x7ak7mkaasSJVXh6YYZnC7wTmtgAyxPt`. The finalized read at slot 464839147 passed owner/layout/discriminator checks. Its active Ed25519 key matches six authenticated live samples. Public evidence is in `mainnet/pyth-candidate.json`.

This is a deployment-time RPC observation, **not** a Solana light-client proof in NEAR. The provider's registry and signing infrastructure remain trust dependencies. The official receiver allows its top authority to change signers; this candidate does not automatically follow those changes. A revoked key must not remain trusted merely because its originally recorded expiry is far in the future. Verified key rotation/revocation handling remains a deployment gate.

A full-access NEAR key can also replace contract code, bypassing any code-level restriction. A no-manual-method claim is not a no-override guarantee until deployment keys are removed or controlled by a reviewed delayed multisig upgrade design. No keys were deleted or new mainnet keys created here.

## Live data finding

The user's key is saved only in ignored `.local/pyth-api-key` with mode 0600. The one-shot loopback setup does not echo or return it. Only the backend probe sends it to the documented Pyth API; it is never included in frontend assets or Git.

Six live signed BTC/USD samples reported 27 publishers and confidence between 8.98 and 12.70 bps (about 0.09–0.13%). At 1,000×, that corresponds to 90–127% of margin; it exceeds the 80% forced-settlement threshold. The candidate's confidence guard rejects these samples. A valid signature authenticates the provider's message, not its suitability for high-leverage settlement.

Observed HTTP round trips were 115–291 ms. Local-clock sample ages ranged from -117 to +26 ms, indicating clock/batching differences; these are not NEAR execution-latency measurements. The contract retains strict no-future/no-stale checks. End-to-end receipt-time testing is outstanding.

The user has been asked whether to evaluate 10×/25×/50× V1 or keep higher leverage blocked while seeking a tighter verified feed. No risk limits were relaxed, lower-leverage economic changes made or public trading enabled pending that decision.

## Verification and next gates

Historical fixture tests cover authentic signature, every truncation, trailing bytes, tampering, wrong signer/feed, expiry, replay, future/stale prices and confidence rejection. Contract tests cover verified publication, manual-fallback rejection and expiry of execution freshness. Existing engine/accounting and WASM token flows are also retained.

Remaining: independent review of the adapter/parser, authoritative current BTC/USD feed metadata, signer rotation/revocation, multisig/timelock or immutable deployment choice, live WASM and testnet integration, sustained latency/availability testing, production host/monitoring, account capacity, final leverage/fee/liquidity limits and real-USDC transfer integration. The generic mainnet config intentionally remains blocked.

## V1 leverage decision

The owner requested 100× and 500× for V1. The verified contract rejects other leverage choices, including 1,000×. This product selection does not relax the 5 bps confidence gate or authorize unsafe quotes. The six measured samples remain rejected. Their 8.98–12.70 bps confidence corresponds to approximately 9–13% of margin at 100× and 45–64% at 500×. Both options remain unavailable for live trading pending oracle suitability and release checks. Existing testnet demo settings are unchanged.
