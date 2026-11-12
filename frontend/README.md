# Current NEAR interface source

Source snapshot from the shared Yellowhands frontend at commit `10bb0913488a53493faebf47eaf7abf54b02fc8d`. `current/` contains the NEAR adapter, Meteor permissions, dashboard, live chart, finalized result card, progress road and their local module dependencies. No credentials or local wallet state are included.

This is an integration source snapshot, not an independent build of the entire shared multi-chain website. The existing runnable NEAR frontend is in `mainnet/yellow/`; its Vite configuration and the root package dependencies are included. The offline demo and testnet UI remain runnable using the root README commands.

Live NEAR interface: https://yellowhands.wtf/near

Dashboard bundling supplies `METEOR_MODULE_URL`; the shared bootstrap supplies `NEAR_MODULE_URL` and `EVM_MODULE_URL`. The original shared site also provides HTML, assets and `/api/near/status`. See `docs/YELLOWHANDS-SHARED-UI.md` for integration requirements.
