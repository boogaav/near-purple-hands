# Deployment handoff

Current stage: native exchange and mock token deployed to NEAR testnet on 2026-11-02. Requested eventual domain: purplehands.wtf. The browser remains a local simulator.

The user explicitly approved the account/key plan in `deployments/testnet-plan.json`. The deployment uses only faucet-funded testnet accounts. `deployments/testnet.json` records public accounts, code hashes, receipts, and smoke-test outcome. Keys are stored locally in `.local/testnet-keys/` with directory mode 0700 and file mode 0600; they are excluded from Git.

Commands:

- `npm run deploy:testnet -- --approved`: resume the approved deployment; refuses differing existing bytecode and atomically initializes contracts.
- `npm run smoke:testnet`: mock-token deposit, LP funding, delayed open/close, withdrawal and ledger checks. Re-pauses entries on exit. Skips when the manifest already records success.
- `npm run verify:testnet`: public read-only code, finality and ledger verification; needs no keys.

The exchange is left paused after testing. It has a trusted test oracle, not a production oracle. No public website, always-on keeper, or real-funds path has been enabled.

## Remaining application work

1. Connect a user-controlled NEAR testnet wallet; do not expose fixture private keys.
2. Use the deployed six-decimal mock token for testing; current contract risk defaults are fixed.
3. Integrate a NEAR wallet selector and transaction signing. Owner/session permissions must be preserved. Replace the local JSON-lines adapter with JSON-RPC change/view calls; never expose the demo faucet or shared fixture identities.
4. Run a testnet oracle publisher and keeper. Index transaction hashes, receipts, finality, contract events and failed callbacks. Confirm final receipt results, not just transaction acceptance.
5. Review production oracle, gas/storage bounds, token identity/decimals, economic parity gaps, treasury withdrawal and governance before discussing real funds.
6. Create a separate frontend hosting project, verify the testnet UI there, then move only purplehands.wtf. Yellowhands' live site and contracts must continue unchanged.

There is no automated domain/mainnet deployment step. The local server is not an always-on backend and shuts down when its process/laptop stops.
