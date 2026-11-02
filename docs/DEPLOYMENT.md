# Deployment handoff

Current stage: native exchange and mock token deployed to NEAR testnet on 2026-11-02. Requested eventual domain: purplehands.wtf. A separate connected testnet frontend is available at localhost:8891; see TESTNET-APP.md.

The user explicitly approved the account/key plan in `deployments/testnet-plan.json`. The deployment uses only faucet-funded testnet accounts. `deployments/testnet.json` records public accounts, code hashes, receipts, and smoke-test outcome. Keys are stored locally in `.local/testnet-keys/` with directory mode 0700 and file mode 0600; they are excluded from Git.

Commands:

- `npm run deploy:testnet -- --approved`: resume the approved deployment; refuses differing existing bytecode and atomically initializes contracts.
- `npm run smoke:testnet`: mock-token deposit, LP funding, delayed open/close, withdrawal and ledger checks. Re-pauses entries on exit. Skips when the manifest already records success.
- `npm run verify:testnet`: public read-only code, finality and ledger verification; needs no keys.

The exchange is paused by deployment/smoke scripts and enabled by the healthy oracle/keeper service. It has a trusted test oracle, not a production oracle. No public domain cutover, always-on hosting, or real-funds path has been enabled.

## Connected application

See [TESTNET-APP.md](TESTNET-APP.md) for the wallet frontend, live trusted oracle, keeper, local startup and tests. Wallet signing and native RPC calls are implemented. The service smoke test verifies automatic open and close execution.

Remaining before public availability: user-wallet approval test, isolated always-on hosting, full event backfill/monitoring and separate frontend hosting. Only then move purplehands.wtf; Yellowhands must remain unchanged. Production oracle, economic parity, governance and security review remain prerequisites for real funds.

The local services stop when their processes or laptop stop. There is no automated domain/mainnet deployment step.
