import http from "node:http";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { readFile } from "node:fs/promises";
const child = spawn("./target/debug/demo", [], {
  stdio: ["pipe", "pipe", "inherit"],
});
let pending = [];
let stopped = false;
createInterface({ input: child.stdout }).on("line", (line) =>
  pending.shift()?.resolve(JSON.parse(line)),
);
child.on("exit", () => {
  stopped = true;
  for (const p of pending) p.reject(Error("Engine stopped"));
  pending = [];
});
let block = 1;
const command = (action) =>
  new Promise((resolve, reject) => {
    if (stopped) return reject(Error("Engine stopped"));
    pending.push({ resolve, reject });
    child.stdin.write(
      JSON.stringify({ ...action, now: Math.floor(Date.now() / 1000), block }) +
        "\n",
    );
  });
const start = Date.now();
let price = 80000;
await command({ action: "tick", price: price * 1e6 });
setInterval(() => {
  block++;
  const t = (Date.now() - start) / 1000;
  price = 80000 + 12 * Math.sin(t / 8) + 5 * Math.sin(t / 3);
  command({ action: "tick", price: Math.round(price * 1e6) }).catch(() => {});
}, 1000);
const files = {
  "/": ["index.html", "text/html"],
  "/app.js": ["app.js", "text/javascript"],
  "/style.css": ["style.css", "text/css"],
};
const server = http.createServer(async (req, res) => {
  try {
    if (!["127.0.0.1:8890", "localhost:8890"].includes(req.headers.host)) {
      res.writeHead(403);
      return res.end();
    }
    if (req.url === "/api" && req.method === "POST") {
      if (
        req.headers.origin &&
        !["http://127.0.0.1:8890", "http://localhost:8890"].includes(
          req.headers.origin,
        )
      ) {
        res.writeHead(403);
        return res.end();
      }
      let body = "";
      for await (const c of req) {
        body += c;
        if (body.length > 4096) {
          res.writeHead(413);
          return res.end();
        }
      }
      const input = JSON.parse(body);
      if (
        ![
          "state",
          "open",
          "close",
          "topup",
          "lp_add",
          "lp_remove",
          "lp_claim",
          "reset",
        ].includes(input.action)
      )
        throw Error("Invalid action");
      const result = await command(input);
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Cache-Control", "no-store");
      return res.end(
        JSON.stringify({ ...result, block, mode: "local-simulation" }),
      );
    }
    const f = files[req.url];
    if (!f) {
      res.writeHead(404);
      return res.end();
    }
    res.setHeader("Content-Type", f[1]);
    res.end(await readFile(new URL("./public/" + f[0], import.meta.url)));
  } catch (e) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: e.message }));
  }
});
server.listen(8890, "127.0.0.1", () =>
  console.log(
    "Purple Hands local demo: http://127.0.0.1:8890 — simulated funds and price, same Rust engine as NEAR contract",
  ),
);
process.on("SIGINT", () => {
  child.kill();
  server.close();
  process.exit();
});
