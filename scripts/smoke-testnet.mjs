import { TESTNET_RPC, paceRpc } from "./testnet-rpc.mjs";
// Real testnet transactions using only the approved fixture accounts and mock token.
import { connect, KeyPair, keyStores } from "near-api-js";
import { readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const path = new URL("../deployments/testnet.json", import.meta.url);
const m = JSON.parse(await readFile(path, "utf8"));
if (m.network !== "testnet" || !m.deployed)
  throw Error("Verified testnet deployment required");
if (m.smoke?.passed) {
  console.log("Smoke test already passed; no transactions sent.");
  process.exit(0);
}
const ids = m.accounts,
  store = new keyStores.InMemoryKeyStore();
for (const id of [m.root, ...Object.values(ids)]) {
  if (!id.endsWith(".testnet")) throw Error("Testnet only");
  const k = JSON.parse(
    await readFile(
      new URL(`../.local/testnet-keys/${id}.json`, import.meta.url),
      "utf8",
    ),
  );
  await store.setKey("testnet", id, KeyPair.fromString(k.private_key));
}
const near = await connect({
  networkId: "testnet",
  nodeUrl: TESTNET_RPC,
  keyStore: store,
});
paceRpc(near.connection.provider);
if ((await near.connection.provider.status()).chain_id !== "testnet")
  throw Error("Wrong chain");
const accounts = {};
for (const [role, id] of Object.entries({ ...ids, root: m.root }))
  accounts[role] = await near.account(id);
const save = () => writeFile(path, JSON.stringify(m, null, 2) + "\n");
async function call(
  role,
  contractId,
  methodName,
  args = {},
  attachedDeposit = 0n,
  gas = 100_000_000_000_000n,
) {
  const signer = await near.account(role === "root" ? m.root : ids[role]);
  const sent = await signer.functionCall({
    contractId,
    methodName,
    args,
    attachedDeposit,
    gas,
  });
  const r = await near.connection.provider.txStatus(
    sent.transaction.hash,
    signer.accountId,
    "FINAL",
  );
  if (
    r.status?.Failure ||
    r.receipts_outcome?.some((x) => x.outcome.status?.Failure)
  )
    throw Error(methodName + " failed");
  m.transactions.push({
    label: "smoke_" + methodName,
    hash: r.transaction.hash,
    signer: r.transaction.signer_id,
  });
  await save();
  console.log(methodName, r.transaction.hash);
  return r;
}
const view = (contractId, methodName, args = {}) =>
  accounts.exchange.viewFunction({ contractId, methodName, args });
const state = () => view(ids.exchange, "get_state");
const block = () => near.connection.provider.block({ finality: "final" });
async function price(n) {
  const s = await state(),
    b = await block();
  await call("oracle", ids.exchange, "publish_price", {
    price: String(n),
    timestamp: Math.floor(Number(b.header.timestamp_nanosec) / 1e9),
    sequence: s.sequence + 1,
  });
}
async function waitBlock(height) {
  for (let i = 0; i < 30; i++) {
    if ((await block()).header.height >= height) return;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw Error("Timed out waiting for fill block");
}
function invariant(s) {
  const a = Object.values(s.accounts).reduce((n, a) => n + a.balance, 0);
  const p = Object.values(s.positions).reduce(
    (n, p) => n + p.margin + p.escrow + (p.entry === 0 ? p.fee : 0),
    0,
  );
  assert.equal(s.total, a + p + s.capital + s.treasury);
  assert.ok(s.reserved <= s.capital);
}
try {
  for (const role of ["trader", "lp", "keeper"]) {
    if (!(await state()).accounts[ids[role]])
      await call(role, ids.exchange, "register", {}, 10n ** 23n);
  }
  for (const role of ["trader", "lp", "exchange"]) {
    if (
      !(await view(ids.token, "storage_balance_of", { account_id: ids[role] }))
    )
      await call(
        "root",
        ids.token,
        "storage_deposit",
        { account_id: ids[role], registration_only: true },
        10n ** 23n,
      );
  }
  for (const [role, n] of [
    ["trader", 1_000_000_000],
    ["lp", 10_000_000_000],
  ]) {
    const s = await state();
    if (
      s.accounts[ids[role]].balance > 0 ||
      s.accounts[ids[role]].shares > 0 ||
      s.positions[ids[role]]
    )
      continue;
    const wallet = BigInt(
      await view(ids.token, "ft_balance_of", { account_id: ids[role] }),
    );
    if (wallet < BigInt(n))
      await call(
        "root",
        ids.token,
        "ft_transfer",
        { receiver_id: ids[role], amount: String(BigInt(n) - wallet) },
        1n,
      );
    await call(
      role,
      ids.token,
      "ft_transfer_call",
      { receiver_id: ids.exchange, amount: String(n), msg: "deposit" },
      1n,
      250_000_000_000_000n,
    );
  }
  if (!(await state()).accounts[ids.lp].shares)
    await call("lp", ids.exchange, "add_liquidity", { amount: "9000000000" });
  await call("guardian", ids.exchange, "pause_entries", { paused: false });
  let s = await state();
  if (!s.positions[ids.trader]) {
    await price(80_000_000_000);
    await call("trader", ids.exchange, "request_open", {
      owner: ids.trader,
      long: true,
      margin: "10000000",
      leverage: 1000,
      min_price: "79000000000",
      max_price: "81000000000",
    });
  }
  s = await state();
  if (s.positions[ids.trader].entry === 0) {
    await waitBlock(s.positions[ids.trader].open.from);
    await price(80_000_000_000);
    await call("keeper", ids.exchange, "fill_open", { owner: ids.trader });
  }
  s = await state();
  invariant(s);
  assert.equal(s.positions[ids.trader].entry, 80_000_000_000);
  await price(80_010_000_000);
  s = await state();
  if (
    !s.positions[ids.trader].close ||
    s.positions[ids.trader].close.until < (await block()).header.height
  )
    await call("trader", ids.exchange, "request_close", {
      owner: ids.trader,
      min_price: "79000000000",
      max_price: "81000000000",
    });
  s = await state();
  await waitBlock(s.positions[ids.trader].close.from);
  await price(80_010_000_000);
  await call("keeper", ids.exchange, "settle", { owner: ids.trader });
  s = await state();
  assert.equal(Object.keys(s.positions).length, 0);
  invariant(s);
  const before = s.accounts[ids.trader].balance;
  const walletBefore = BigInt(
    await view(ids.token, "ft_balance_of", { account_id: ids.trader }),
  );
  await call(
    "trader",
    ids.exchange,
    "withdraw",
    { amount: "1000000" },
    1n,
    250_000_000_000_000n,
  );
  s = await state();
  assert.equal(s.accounts[ids.trader].balance, before - 1_000_000);
  assert.equal(
    BigInt(await view(ids.token, "ft_balance_of", { account_id: ids.trader })),
    walletBefore + 1_000_000n,
  );
  assert.equal(
    await view(ids.exchange, "get_pending_withdrawal", { owner: ids.trader }),
    "0",
  );
  invariant(s);
  m.smoke = {
    passed: true,
    at: new Date().toISOString(),
    checks: [
      "NEP-141 deposit",
      "LP mint",
      "delayed open",
      "delayed close",
      "token withdrawal",
      "ledger conservation",
    ],
    snapshot: {
      total: s.total,
      capital: s.capital,
      treasury: s.treasury,
      reserved: s.reserved,
    },
  };
  await save();
  console.log(
    "PASS: testnet deposit, LP funding, trade, withdrawal and ledger reconciliation",
  );
} finally {
  await call("guardian", ids.exchange, "pause_entries", { paused: true });
  m.entriesPaused = true;
  await save();
}
