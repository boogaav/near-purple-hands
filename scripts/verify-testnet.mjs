import { TESTNET_RPC, paceRpc } from "./testnet-rpc.mjs";
// Public, read-only verification. No credentials required.
import { providers } from "near-api-js";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
const m = JSON.parse(
  await readFile(
    new URL("../deployments/testnet.json", import.meta.url),
    "utf8",
  ),
);
assert.equal(m.network, "testnet");
const p = new providers.JsonRpcProvider({ url: TESTNET_RPC });
paceRpc(p);
assert.equal((await p.status()).chain_id, "testnet");
const hash = (b) => createHash("sha256").update(b).digest("hex");
for (const role of ["token", "exchange"]) {
  const r = await p.query({
    request_type: "view_code",
    account_id: m.accounts[role],
    finality: "final",
  });
  assert.equal(hash(Buffer.from(r.code_base64, "base64")), m[role].sha256);
  const tx = m.transactions.find((t) => t.label === "deploy_init_" + role);
  const outcome = await p.txStatus(tx.hash, tx.signer, "FINAL");
  assert.ok(outcome.status.SuccessValue !== undefined);
  assert.ok(!outcome.receipts_outcome.some((r) => r.outcome.status.Failure));
  console.log(
    role,
    "bytecode and finalized deployment verified",
    m.accounts[role],
  );
}
const result = await p.query({
  request_type: "call_function",
  account_id: m.accounts.exchange,
  method_name: "get_state",
  args_base64: Buffer.from("{}").toString("base64"),
  finality: "final",
});
const s = JSON.parse(Buffer.from(result.result).toString());
const available = Object.values(s.accounts).reduce((a, x) => a + x.balance, 0);
const positions = Object.values(s.positions).reduce(
  (a, x) => a + x.margin + x.escrow + (x.entry === 0 ? x.fee : 0),
  0,
);
assert.equal(s.total, available + positions + s.capital + s.treasury);
assert.ok(s.reserved <= s.capital);
const tokenResult = await p.query({
  request_type: "call_function",
  account_id: m.accounts.token,
  method_name: "ft_balance_of",
  args_base64: Buffer.from(
    JSON.stringify({ account_id: m.accounts.exchange }),
  ).toString("base64"),
  finality: "final",
});
const actualTokens = BigInt(
  JSON.parse(Buffer.from(tokenResult.result).toString()),
);
assert.equal(
  actualTokens,
  BigInt(s.total),
  "Token custody must equal ledger total",
);
console.log(
  JSON.stringify({
    paused: s.paused,
    total: s.total,
    capital: s.capital,
    reserved: s.reserved,
    openPositions: Object.keys(s.positions).length,
    smokePassed: !!m.smoke?.passed,
  }),
);
