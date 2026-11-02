// Explicit --approved flag acknowledges the separately reviewed account/key plan.
// No mainnet support. Never print or commit private keys.
import { connect, KeyPair, keyStores, transactions } from "near-api-js";
import { readFile, writeFile, mkdir, chmod } from "node:fs/promises";
import { createHash } from "node:crypto";
if (!process.argv.includes("--approved"))
  throw Error(
    "Review deployments/testnet-plan.json and obtain account/key approval before running with --approved",
  );
const plan = JSON.parse(
  await readFile(
    new URL("../deployments/testnet-plan.json", import.meta.url),
    "utf8",
  ),
);
const root = plan.rootAccount,
  ids = plan.accounts;
if (
  plan.network !== "testnet" ||
  ![root, ...Object.values(ids)].every((id) => id.endsWith(".testnet"))
)
  throw Error("Testnet only");
const keysDir = new URL("../.local/testnet-keys/", import.meta.url);
await mkdir(keysDir, { recursive: true, mode: 0o700 });
await chmod(keysDir, 0o700);
const store = new keyStores.InMemoryKeyStore();
for (const id of [root, ...Object.values(ids)]) {
  const path = new URL(id + ".json", keysDir);
  let data;
  try {
    data = JSON.parse(await readFile(path, "utf8"));
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
    const key = KeyPair.fromRandom("ed25519");
    data = {
      account_id: id,
      public_key: key.getPublicKey().toString(),
      private_key: key.toString(),
    };
    await writeFile(path, JSON.stringify(data) + "\n", {
      flag: "wx",
      mode: 0o600,
    });
  }
  await chmod(path, 0o600);
  await store.setKey("testnet", id, KeyPair.fromString(data.private_key));
}
const near = await connect({
  networkId: "testnet",
  nodeUrl: "https://rpc.testnet.near.org",
  keyStore: store,
});
if ((await near.connection.provider.status()).chain_id !== "testnet")
  throw Error("Unexpected RPC network");
const path = new URL("../deployments/testnet.json", import.meta.url);
let manifest;
try {
  manifest = JSON.parse(await readFile(path, "utf8"));
} catch (e) {
  if (e.code !== "ENOENT") throw e;
  manifest = {
    network: "testnet",
    root,
    accounts: ids,
    transactions: [],
    deployed: false,
  };
}
const save = () => writeFile(path, JSON.stringify(manifest, null, 2) + "\n");
async function state(account) {
  try {
    return await account.state();
  } catch (e) {
    if (
      e.type === "AccountDoesNotExist" ||
      /does not exist|UNKNOWN_ACCOUNT/.test(e.message)
    )
      return null;
    throw e;
  }
}
async function record(label, promise) {
  const r = await promise;
  if (
    r.status?.Failure ||
    r.receipts_outcome?.some((x) => x.outcome.status?.Failure)
  )
    throw Error(label + " failed; inspect testnet receipt");
  manifest.transactions.push({
    label,
    hash: r.transaction?.hash || r.transaction_outcome?.id,
    signer: r.transaction?.signer_id,
  });
  await save();
  console.log(label, manifest.transactions.at(-1).hash);
  return r;
}
const account = await near.account(root);
if (!(await state(account))) {
  const key = await store.getKey("testnet", root);
  const r = await fetch("https://helper.nearprotocol.com/account", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      newAccountId: root,
      newAccountPublicKey: key.getPublicKey().toString(),
    }),
    signal: AbortSignal.timeout(60000),
  });
  const data = await r.json();
  if (!r.ok || data.error)
    throw Error("Faucet failed: " + JSON.stringify(data));
  manifest.faucet = {
    account: root,
    hash: data.transaction?.hash || data.transaction_outcome?.id || null,
  };
  await save();
  if (!(await state(account))) throw Error("Account creation not confirmed");
  console.log("Created faucet account", root);
}
for (const [role, id] of Object.entries(ids)) {
  if (await state(await near.account(id))) continue;
  const funding =
    role === "exchange"
      ? 4n * 10n ** 24n
      : role === "token"
        ? 3n * 10n ** 24n
        : 5n * 10n ** 23n;
  await record(
    "create_" + role,
    account.createAccount(
      id,
      (await store.getKey("testnet", id)).getPublicKey(),
      funding,
    ),
  );
}
const digest = (b) => createHash("sha256").update(b).digest("hex");
for (const role of ["token", "exchange"]) {
  const a = await near.account(ids[role]);
  const code = await readFile(
    new URL(
      `../artifacts/${role === "token" ? "purple_mock_token" : "near_purple_exchange"}.wasm`,
      import.meta.url,
    ),
  );
  if ((await state(a)).code_hash === "11111111111111111111111111111111") {
    const args =
      role === "token"
        ? { owner_id: root, total_supply: "1000000000000" }
        : { token: ids.token, oracle: ids.oracle, guardian: ids.guardian };
    await record(
      "deploy_init_" + role,
      a.signAndSendTransaction({
        receiverId: ids[role],
        actions: [
          transactions.deployContract(code),
          transactions.functionCall(
            "new",
            Buffer.from(JSON.stringify(args)),
            100_000_000_000_000n,
            0n,
          ),
        ],
      }),
    );
  }
  const deployed = await near.connection.provider.query({
    request_type: "view_code",
    account_id: ids[role],
    finality: "final",
  });
  if (digest(Buffer.from(deployed.code_base64, "base64")) !== digest(code))
    throw Error("Code mismatch; refusing to overwrite " + ids[role]);
  manifest[role] = {
    account: ids[role],
    sha256: digest(code),
    codeHash: deployed.hash,
  };
  await save();
}
const exchange = await near.account(ids.exchange);
if (
  !(
    await exchange.viewFunction({
      contractId: ids.exchange,
      methodName: "get_state",
      args: {},
    })
  ).paused
) {
  await record(
    "pause_entries",
    (await near.account(ids.guardian)).functionCall({
      contractId: ids.exchange,
      methodName: "pause_entries",
      args: { paused: true },
      gas: 100_000_000_000_000n,
      attachedDeposit: 0n,
    }),
  );
}
manifest.deployed = true;
manifest.entriesPaused = true;
manifest.updatedAt = new Date().toISOString();
await save();
console.log("Verified deployed bytecode; entries paused:", ids.exchange);
