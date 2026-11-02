import { Worker } from "near-workspaces";
import { Binary } from "near-sandbox";
import assert from "node:assert/strict";
// Pin a modern sandbox: workspaces 5 defaults to nearcore 2.6.2, too old for SDK 5.29.
process.env.NEAR_SANDBOX_BIN_PATH = "1";
process.env.NEAR_SANDBOX_BINARY_PATH = new URL(
  "../.local/near-sandbox/",
  import.meta.url,
).pathname;
const platform =
  process.platform === "darwin" ? "Darwin-arm64" : "Linux-x86_64";
process.env.SANDBOX_ARTIFACT_URL = `https://s3-us-west-1.amazonaws.com/build.nearprotocol.com/nearcore/${platform}/2.14.0/near-sandbox.tar.gz`;
const binary = await Binary.create(
  "near-sandbox",
  process.env.SANDBOX_ARTIFACT_URL,
  process.env.NEAR_SANDBOX_BINARY_PATH,
);
if (!(await binary.exists())) await binary.install();
const worker = await Worker.init();
const root = worker.rootAccount;
const gas = 100_000_000_000_000n;
try {
  const alice = await root.createSubAccount("alice", {
    initialBalance: 20n * 10n ** 24n,
  });
  const lp = await root.createSubAccount("lp", {
    initialBalance: 20n * 10n ** 24n,
  });
  const token = await root.devDeploy("artifacts/purple_mock_token.wasm", {
    method: "new",
    args: { owner_id: root.accountId, total_supply: "1000000000000" },
  });
  const exchange = await root.devDeploy("artifacts/near_purple_exchange.wasm", {
    method: "new",
    args: {
      token: token.accountId,
      oracle: root.accountId,
      guardian: root.accountId,
    },
  });
  for (const a of [alice, lp, root])
    await a.call(
      exchange,
      "register",
      {},
      { attachedDeposit: 10n ** 23n, gas },
    );
  for (const a of [alice, lp, exchange])
    await root.call(
      token,
      "storage_deposit",
      { account_id: a.accountId },
      { attachedDeposit: 10n ** 23n, gas },
    );
  for (const [a, amount] of [
    [alice, "1000000000"],
    [lp, "10000000000"],
  ]) {
    await root.call(
      token,
      "ft_transfer",
      { receiver_id: a.accountId, amount },
      { attachedDeposit: 1n, gas },
    );
    await a.call(
      token,
      "ft_transfer_call",
      { receiver_id: exchange.accountId, amount, msg: "deposit" },
      { attachedDeposit: 1n, gas: 250_000_000_000_000n },
    );
  }
  let s = await exchange.view("get_state");
  assert.equal(s.total, 11_000_000_000);
  assert.equal(s.accounts[alice.accountId].balance, 1_000_000_000);
  await lp.call(exchange, "add_liquidity", { amount: "9000000000" }, { gas });
  const timestamp = async () =>
    Math.floor(
      Number(
        (await worker.provider.block({ finality: "final" })).header
          .timestamp_nanosec,
      ) / 1e9,
    );
  let seq = 1;
  await root.call(
    exchange,
    "publish_price",
    { price: "80000000000", timestamp: await timestamp(), sequence: seq++ },
    { gas },
  );
  await alice.call(
    exchange,
    "request_open",
    {
      owner: alice.accountId,
      long: true,
      margin: "10000000",
      leverage: 1000,
      min_price: "79000000000",
      max_price: "81000000000",
    },
    { gas },
  );
  await worker.provider.fastForward(2);
  await root.call(exchange, "fill_open", { owner: alice.accountId }, { gas });
  s = await exchange.view("get_state");
  assert.equal(s.positions[alice.accountId].entry, 80_000_000_000);
  await root.call(
    exchange,
    "publish_price",
    { price: "80010000000", timestamp: await timestamp(), sequence: seq++ },
    { gas },
  );
  await alice.call(
    exchange,
    "request_close",
    {
      owner: alice.accountId,
      min_price: "79000000000",
      max_price: "81000000000",
    },
    { gas },
  );
  await worker.provider.fastForward(2);
  await root.call(exchange, "settle", { owner: alice.accountId }, { gas });
  s = await exchange.view("get_state");
  assert.equal(Object.keys(s.positions).length, 0);
  const before = s.accounts[alice.accountId].balance;
  await alice.call(
    exchange,
    "withdraw",
    { amount: "1000000" },
    { attachedDeposit: 1n, gas: 250_000_000_000_000n },
  );
  s = await exchange.view("get_state");
  assert.equal(s.accounts[alice.accountId].balance, before - 1_000_000);
  assert.equal(
    await token.view("ft_balance_of", { account_id: alice.accountId }),
    "1000000",
  );
  // Burn the test recipient's token balance and unregister it: outbound FT must fail and refund the exchange ledger.
  await alice.call(
    token,
    "storage_unregister",
    { force: true },
    { attachedDeposit: 1n, gas },
  );
  await alice.call(
    exchange,
    "withdraw",
    { amount: "1000000" },
    { attachedDeposit: 1n, gas: 250_000_000_000_000n },
  );
  const after = await exchange.view("get_state");
  assert.equal(
    after.accounts[alice.accountId].balance,
    s.accounts[alice.accountId].balance,
  );
  assert.equal(
    await exchange.view("get_pending_withdrawal", { owner: alice.accountId }),
    "0",
  );
  console.log(
    "PASS: native WASM deployment, NEP-141 deposits, LP mint, delayed open/close, real FT withdrawal and failed-transfer refund on local NEAR sandbox.",
  );
} finally {
  await worker.tearDown();
}
