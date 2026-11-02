const $ = (id) => document.getElementById(id);
let stake = 10,
  leverage = 1000,
  last,
  points = [],
  busy = false,
  lpMode = false,
  toastTimer;
const money = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    n / 1e6,
  );
const signed = (n) => (n > 0 ? "+" : "") + money(n);
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
async function api(action, extra = {}) {
  const r = await fetch("/api", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...extra }),
  });
  const d = await r.json();
  if (!r.ok || !d.ok) throw Error(d.error || "Connection unavailable");
  return d;
}
function toast(text) {
  $("toast").textContent = text;
  $("toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($("toast").hidden = true), 6000);
}
async function act(action, extra = {}) {
  if (busy) return;
  busy = true;
  try {
    render(await api(action, extra));
  } catch (e) {
    toast(e.message);
  } finally {
    busy = false;
  }
}
for (const [id, set] of [
  ["stakes", (n) => (stake = n)],
  ["leverages", (n) => (leverage = n)],
]) {
  $(id).addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    set(Number(b.dataset.value));
    for (const child of $(id).children)
      child.setAttribute("aria-pressed", String(child === b));
  });
}
$("long").onclick = () =>
  act("open", { long: true, margin: stake * 1e6, leverage });
$("short").onclick = () =>
  act("open", { long: false, margin: stake * 1e6, leverage });
$("exit").onclick = () => act("close");
$("topup").onclick = () => act("topup");
$("lp-add").onclick = () => act("lp_add");
$("lp-remove").onclick = () => act("lp_remove");
$("lp-claim").onclick = () => act("lp_claim");
$("reset").onclick = () => {
  points = [];
  act("reset");
};
function mode(lp) {
  lpMode = lp;
  $("trader").setAttribute("aria-pressed", String(!lp));
  $("lp").setAttribute("aria-pressed", String(lp));
  $("trading-controls").hidden = lp;
  $("lp-controls").hidden = !lp;
}
$("trader").onclick = () => mode(false);
$("lp").onclick = () => mode(true);
$("help").onclick = () => {
  const on = $("explanation").hidden;
  $("explanation").hidden = !on;
  $("help").setAttribute("aria-expanded", String(on));
};
function render(data) {
  const s = data.state;
  last = data;
  const p = s.positions["trader.local"];
  $("balance").textContent = money(s.accounts["trader.local"].balance);
  const price = money(s.price);
  if ($("price").textContent !== price) {
    $("price").textContent = price;
    $("price").classList.remove("pulse");
    void $("price").offsetWidth;
    $("price").classList.add("pulse");
  }
  if (!points.length || points.at(-1).t !== s.price_at) {
    points.push({ t: s.price_at, p: s.price });
    points = points.slice(-120);
  }
  $("ledger").textContent = data.invariant
    ? "✓ Ledger reconciled"
    : "Ledger error";
  $("long").disabled = $("short").disabled = !!p;
  $("exit-panel").hidden = !p?.entry;
  const pending = p?.close && data.block <= p.close.until;
  $("exit").disabled = !!pending;
  $("exit-caption").textContent = pending
    ? "Pending · two blocks before execution"
    : "Request settlement";
  if (p?.entry) {
    const gross = Math.max(
      -p.margin,
      Math.min(
        p.margin,
        ((p.margin * p.leverage * (s.price - p.entry)) / p.entry) *
          (p.long ? 1 : -1),
      ),
    );
    $("performance").innerHTML =
      `<small>${p.long ? "LONG" : "SHORT"} · ${p.leverage.toLocaleString()}× · OPEN</small><h2 class="live ${gross >= 0 ? "positive" : "negative"}">${gross >= 0 ? "+" : ""}${((gross / p.margin) * 100).toFixed(2)}%</h2><p>${signed(gross)} · Price performance before fees</p>`;
    $("status").textContent = pending
      ? "Exit requested. Keeper is waiting for the fill block."
      : "Position open · reserved LP capital matches your stake.";
  } else {
    $("performance").innerHTML =
      `<small>${p ? "ENTRY REQUESTED" : "CHOOSE YOUR DIRECTION"}</small><h2>${p ? "Finding your entry…" : "Make your move."}</h2><p>${p ? "Two simulated blocks before execution." : "Matching capital. Transparent outcomes."}</p>`;
    $("status").textContent = p
      ? "Entry queued · awaiting keeper execution"
      : "Ready to trade";
  }
  const lp = s.accounts["lp.local"];
  $("lp-available").textContent = money(lp.balance);
  $("lp-value").textContent = money(
    s.shares ? (lp.shares * s.capital) / s.shares : 0,
  );
  $("capital").textContent = money(s.capital);
  $("reserved").textContent = money(s.reserved);
  $("pool-pnl").textContent = signed(s.lp_pnl);
  $("lp-add").disabled = Object.keys(s.positions).length > 0;
  $("lp-remove").disabled = !!lp.redemption || !lp.shares;
  const remaining = lp.redemption
    ? Math.max(0, lp.redemption.ready_at - Math.floor(Date.now() / 1000))
    : 0;
  $("lp-claim").hidden = !lp.redemption;
  $("lp-claim").disabled = remaining > 0 || Object.keys(s.positions).length > 0;
  $("lp-status").textContent = lp.redemption
    ? remaining
      ? `Removal unlocks in ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`
      : Object.keys(s.positions).length
        ? "Notice complete · waiting for open trades"
        : "Ready to claim to your demo balance"
    : "No pending removals";
  $("history").innerHTML = data.history.length
    ? data.history
        .slice(0, 8)
        .map(
          (h) =>
            `<div class="trade"><div>↓ ${money(h.entry * 1)} → ↑ ${money(h.exit * 1)}<small>◷ ${h.duration}s journey · After fees</small></div><b class="${h.net >= 0 ? "positive" : "negative"}">${esc(signed(h.net))}</b></div>`,
        )
        .join("")
    : "<p>No closed trades yet.</p>";
  draw();
}
function draw() {
  const canvas = $("chart"),
    r = canvas.getBoundingClientRect(),
    dpr = devicePixelRatio || 1;
  canvas.width = r.width * dpr;
  canvas.height = r.height * dpr;
  const c = canvas.getContext("2d");
  c.scale(dpr, dpr);
  const w = r.width,
    h = r.height;
  if (points.length < 2) return;
  const p = last?.state.positions["trader.local"];
  const vals = points.map((v) => v.p);
  if (p?.entry) vals.push(p.entry);
  let min = Math.min(...vals),
    max = Math.max(...vals);
  const pad = Math.max((max - min) * 0.25, 2e6);
  min -= pad;
  max += pad;
  const y = (v) => h - 28 - ((v - min) / (max - min)) * (h - 55),
    x = (t) =>
      18 +
      ((t - points[0].t) / Math.max(1, points.at(-1).t - points[0].t)) *
        (w - 60);
  c.strokeStyle = "#302b3c";
  c.lineWidth = 1;
  for (let i = 1; i < 5; i++) {
    c.beginPath();
    c.moveTo(0, (h * i) / 5);
    c.lineTo(w, (h * i) / 5);
    c.stroke();
  }
  c.beginPath();
  points.forEach((v, i) =>
    i ? c.lineTo(x(v.t), y(v.p)) : c.moveTo(x(v.t), y(v.p)),
  );
  c.strokeStyle = "#b793ff";
  c.lineWidth = 2.5;
  c.stroke();
  if (p?.entry) {
    c.setLineDash([4, 5]);
    c.strokeStyle = "#a5a0b6";
    c.beginPath();
    c.moveTo(0, y(p.entry));
    c.lineTo(w, y(p.entry));
    c.stroke();
    c.setLineDash([]);
    c.fillStyle = "#ded0ff";
    c.font = "11px system-ui";
    c.fillText("↓ ENTRY " + money(p.entry), 18, y(p.entry) - 10);
  }
  const end = points.at(-1);
  c.fillStyle = "#b793ff";
  c.shadowColor = "#b793ff";
  c.shadowBlur = 20;
  c.beginPath();
  c.arc(x(end.t), y(end.p), 6, 0, Math.PI * 2);
  c.fill();
  c.shadowBlur = 0;
  if (p?.entry) {
    c.font = "26px system-ui";
    c.fillText("🐦", x(end.t) - 14, y(end.p) - 14);
  }
}
addEventListener("resize", draw);
async function poll() {
  try {
    render(await api("state"));
  } catch (e) {
    $("ledger").textContent = "Disconnected";
    toast(e.message);
  } finally {
    setTimeout(poll, 1000);
  }
}
poll();
