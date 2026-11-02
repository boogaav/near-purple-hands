# Deployment handoff

Current stage: local demo complete; testnet deployment requested on 2026-11-02. Requested eventual domain: purplehands.wtf.

The concrete account/key plan is in `deployments/testnet-plan.json`. Automatic approval review requires explicit account-creation and local credential-storage confirmation before execution. No testnet deployment is yet recorded. Once approved, run `node scripts/deploy-testnet.mjs --approved`; this is testnet-only, refuses to overwrite differing code, atomically initializes contracts, verifies remote bytecode hashes, and pauses entries. Private keys remain in ignored `.local/testnet-keys/` with restricted permissions. Public receipts are saved to `deployments/testnet.json`.

1. Select a NEAR testnet account and separate oracle/guardian identities. No mainnet account is inferred from an email or an EVM address.
2. Deploy the tested WASM with the configured six-decimal **test** NEP-141 token. Register the exchange with that token before funding it. Initialize `token`, `oracle`, `guardian`; current contract risk defaults are fixed.
3. Integrate a NEAR wallet selector and transaction signing. Owner/session permissions must be preserved. Replace the local JSON-lines adapter with JSON-RPC change/view calls; never expose the demo faucet or shared fixture identities.
4. Run a testnet oracle publisher and keeper. Index transaction hashes, receipts, finality, contract events and failed callbacks. Confirm final receipt results, not just transaction acceptance.
5. Review production oracle, gas/storage bounds, token identity/decimals, economic parity gaps, treasury withdrawal and governance before discussing real funds.
6. Create a separate frontend hosting project, verify the testnet UI there, then move only purplehands.wtf. Yellowhands' live site and contracts must continue unchanged.

There is no automated domain/mainnet deployment step. The local server is not an always-on backend and shuts down when its process/laptop stops.
