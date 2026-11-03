# V5 port scope

Baseline: `dc0063dca2caf0cef69d730c003958d3fdab2287`.

| V5 element | NEAR local fork |
| --- | --- |
| Symmetric capped trader/LP exposure | Implemented in integer Rust engine |
| Stakes/leverage, entry/winner/early-exit fees | Implemented with fixed local risk profile |
| Fully reserved LP capital and exposure limits | Implemented; fixed $100 buffer rather than V5’s deployment-specific buffer |
| Delayed open/close, expiry, forced settlement | Implemented; two-block delay and a 20-block fill window (more generous than pilot V5) |
| Keeper escrow | Implemented; unused amounts refunded |
| EIP-712 authorization | Replaced with NEAR predecessor identity and bounded account delegation |
| ERC-20 transfer | Replaced with authenticated NEP-141 callback and asynchronous withdrawal/refund |
| HyperCore price adapter | Replaced with a trusted demo publisher, NOT a production oracle |
| LP notice | 24h contract; 60s in local simulator only |
| Review F1 dust request lock | Permissionless processing to fixed owner balance; request owner need not return |
| Review F2 unrealized P&L dilution | Reject minting until both positions and pending requests are gone |
| Review F3 stale outage clock | Healthy publish resets; consecutive observed failures require bounded gaps |
| Review F4 Lab capital double counting | Demo links the actual engine; invariant tested across transitions |
| Skew premium | Not ported yet; flat 1% entry fee explicitly shown |
| Versioned risk governance/timelock | Not ported; immutable code constants plus entry pause |
| Per-block admission quota | Not ported; bounded accounts/one position per owner and exposure caps only |
| Treasury fee collection | Accrued and reconciled, not yet withdrawable |
| Production relayer/indexer/gas sponsorship/bridges | Not ported; loopback simulator only |
| Native NEAR wallet/login | Next stage; no browser signing or real account linked |

This is a working local first slice, not byte-for-byte V5 parity or an assertion that V5 review issues are resolved in the Solidity deployment. No existing deployment is modified.

## Mainnet preparation — 2026-11-03

The connected testnet frontend/wallet and laptop oracle/keeper now exist (see `TESTNET-APP.md`); the earlier local-stage table is not a mainnet readiness claim. The next contract artifact starts paused and requires post-request oracle observations for entry/voluntary exit. Its request storage layout differs from the currently deployed testnet contract, so an in-place upgrade is unsupported. See `MAINNET-READINESS.md` for review findings, verification and the outstanding real-USDC launch dependencies.
