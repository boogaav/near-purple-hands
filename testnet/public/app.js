import {owner,login,send,selector,walletReady} from './wallet.js';
const $ = (id) => document.getElementById(id);
const margin = 10_000_000; // Six-decimal mock USDC
const leverage = 100;
let last,
  points = [],
  busy = false,
  lpMode = false,
  toastTimer, lastBlockReceived=0;
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
  const r = await fetch('/api/state'); const d=await r.json();
  if (!r.ok || !d.ok) throw Error(d.error || 'Connection unavailable');
  if(action==='state') return d;
  if(action==='reset') { if(owner()) await (await selector.wallet()).signOut(); return d; }
  const id=owner();
  if(!id) {await login(d.ids.exchange); return d;}
  const account=d.state.accounts[id];
  if(!account) {await send(d.ids.exchange,'register',{},'100000000000000000000000'); return d;}
  const bounds={min_price:String(Math.floor(d.state.price*.99)),max_price:String(Math.ceil(d.state.price*1.01))};
  if(action==='open') {
    if(!d.worker || d.state.paused || Date.now()/1000-d.state.price_at>d.maxPriceAge) throw Error('Oracle / keeper unavailable. Please wait.');
    await send(d.ids.exchange,'request_open',{owner:id,...extra,margin:String(extra.margin),...bounds});
  } else if(action==='close') await send(d.ids.exchange,'request_close',{owner:id,...bounds});
  else if(action==='topup') {
    await send(d.ids.token,'ft_transfer_call',{receiver_id:d.ids.exchange,amount:'100000000',msg:'deposit'},'1','250000000000000');
  } else if(action==='lp_add') await send(d.ids.exchange,'add_liquidity',{amount:'100000000'});
  else if(action==='lp_remove') await send(d.ids.exchange,'request_remove',{shares:String(Math.floor(account.shares/10))});
  else if(action==='lp_claim') await send(d.ids.exchange,'process_remove',{owner:id});
  else if(action==='withdraw') await send(d.ids.exchange,'withdraw',{amount:String(account.balance)},'1','250000000000000');
  else if(action==='reset') await (await selector.wallet()).signOut();
  toast('Transaction submitted. Waiting for confirmed contract state.');
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
  document.querySelectorAll(".hands button, #exit, #topup, #connect, #register, #withdraw").forEach(b=>b.disabled=true);
  try {
    render(await api(action, extra));
  } catch (e) {
    toast(e.message);
  } finally {
    busy = false;
    document.querySelectorAll("#topup, #connect, #register, #withdraw").forEach(b=>b.disabled=false);
  }
}
$("long").onclick = () =>
  act("open", { long: true, margin, leverage });
$("short").onclick = () =>
  act("open", { long: false, margin, leverage });
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
function syncIdentity() {
  const id = owner();
  $('connect').hidden = !!id;
  $('topup').hidden = !id;
  $('reset').hidden = !id;
  $('withdraw').hidden = !id;
  $('register').hidden = !id || !last || !!last.state.accounts[id];
  $('balance').textContent = id && last ? money(last.state.accounts[id]?.balance || 0) : '—';
}
walletReady.then(() => selector.store.observable.subscribe(() => {
  syncIdentity();
  if (last) render(last);
})).catch(e => toast("Wallet unavailable: " + e.message));
function render(data) {
  const s = data.state;
  last = data;
  if(!points.length || Date.now()-lastBlockReceived>5000) {
    const fallback={block:data.block,t:data.blockTime || Date.now()/1000,p:s.price,priceAt:s.price_at};
    if(fallback.p>0 && (!points.length || fallback.block>points.at(-1).block)) {
      points.push(fallback);points=points.slice(-240);
      $('chart-status').textContent='RPC delayed · showing latest account snapshot';
    }
  }
  const p = s.positions[owner()];
  $("balance").textContent = money((s.accounts[owner()]?.balance || 0));
  const price = money(points.at(-1)?.block >= data.block ? points.at(-1).p : s.price);
  if ($("price").textContent !== price) {
    $("price").textContent = price;
    $("price").classList.remove("pulse");
    void $("price").offsetWidth;
    $("price").classList.add("pulse");
  }
  $("ledger").textContent = data.invariant
    ? "✓ Ledger reconciled"
    : "Ledger error";
  $("long").disabled = $("short").disabled = busy || !!p || !owner() || !s.accounts[owner()] || s.paused || !data.worker || Date.now()/1000-s.price_at>data.maxPriceAge;
  syncIdentity();
  $("performance").classList.toggle("idle",!p);
  $("exit-panel").hidden = !p?.entry;
  const pending = p?.close && data.block <= p.close.until;
  $("exit").disabled = !!pending || busy;
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
      `<small>${p ? "ENTRY REQUESTED" : "CHOOSE YOUR DIRECTION"}</small><h2>${p ? "Finding your entry…" : "Make your move."}</h2><p>${p ? "Two NEAR blocks before execution." : "Matching capital. Transparent outcomes."}</p>`;
    $("status").textContent = p
      ? "Entry queued · awaiting keeper execution"
      : (s.paused || !data.worker || Date.now()/1000-s.price_at>data.maxPriceAge ? "Oracle / keeper unavailable · entries paused" : !owner() ? "Connect your testnet wallet" : !s.accounts[owner()] ? "Register your account first" : "Ready to trade");
  }
  const lp = (s.accounts[owner()] || {balance:0,shares:0});
  $("lp-available").textContent = money(lp.balance);
  $("lp-value").textContent = money(
    s.shares ? (lp.shares * s.capital) / s.shares : 0,
  );
  $("capital").textContent = money(s.capital);
  $("reserved").textContent = money(s.reserved);
  $("pool-pnl").textContent = signed(s.lp_pnl);
  $("lp-add").disabled = !owner() || !s.accounts[owner()] || Object.keys(s.positions).length > 0;
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
        : "Ready to claim to your trading balance"
    : "No pending removals";
  $("history").innerHTML = data.history.filter(h=>h.owner===owner()).length
    ? data.history.filter(h=>h.owner===owner())
        .slice(0, 8)
        .map(
          (h) =>
            `<div class="trade"><div>↓ ${money(h.entry * 1)} → ↑ ${money(h.exit * 1)}<small>◷ ${h.duration}s journey · After fees · <a target="_blank" rel="noopener" href="https://testnet.nearblocks.io/txns/${esc(h.hash)}">Receipt ↗</a></small></div><b class="${h.net >= 0 ? "positive" : "negative"}">${esc(signed(h.net))}</b></div>`,
        )
        .join("")
    : "<p>No closed trades yet.</p>";
  draw();
}
let chartRange, animationFrame;
const reducedChartMotion = matchMedia("(prefers-reduced-motion: reduce)");
function draw() {
  cancelAnimationFrame(animationFrame);
  const canvas = $("chart"),
    r = canvas.getBoundingClientRect(),
    dpr = devicePixelRatio || 1;
  if(canvas.width !== Math.round(r.width*dpr) || canvas.height !== Math.round(r.height*dpr)) {
    canvas.width = Math.round(r.width*dpr); canvas.height = Math.round(r.height*dpr);
  }
  const c = canvas.getContext("2d");
  c.setTransform(dpr,0,0,dpr,0,0);
  c.clearRect(0,0,r.width,r.height);
  c.textAlign="left";
  const w = r.width,
    h = r.height;
  if (!points.length) {
    c.fillStyle='#a5a0b6';c.font='14px system-ui';c.textAlign='center';
    c.fillText('Connecting to NEAR blocks…',w/2,h/2);return;
  }
  const p = last?.state.positions[owner()];
  const vals = points.map((v) => v.p);
  if (p?.entry) vals.push(p.entry);
  let min = Math.min(...vals),
    max = Math.max(...vals);
  const pad = Math.max((max - min) * 0.25, 2e6);
  min -= pad;
  max += pad;
  const target={min,max};
  if(!chartRange || matchMedia('(prefers-reduced-motion: reduce)').matches) chartRange=target;
  else chartRange={min:chartRange.min+(min-chartRange.min)*.22,max:chartRange.max+(max-chartRange.max)*.22};
  min=chartRange.min;max=chartRange.max;
  const end = points.at(-1);
  const reduced = reducedChartMotion.matches;
  // Extend time at the last observed price; never predict a future price.
  const liveTime = reduced ? end.t : Math.max(end.t, Math.min(Date.now()/1000, end.t + 5));
  const startTime = points[0].t;
  const span = Math.max(30, end.t-startTime+5);
  if(!reduced && !document.hidden) animationFrame=requestAnimationFrame(draw);
  const y = (v) => h - 28 - ((v - min) / (max - min)) * (h - 55),
    x = (t) =>
      18 +
      ((t - startTime) / span) *
        (w - 60);
  c.strokeStyle = "#302b3c";
  c.lineWidth = 1;
  for (let i = 1; i < 5; i++) {
    c.beginPath();
    c.moveTo(0, (h * i) / 5);
    c.lineTo(w, (h * i) / 5);
    c.stroke();
  }
  c.strokeStyle = "#b793ff";
  c.lineWidth = 2.5;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  for(let i=1;i<points.length;i++) {
    const a=points[i-1], b=points[i], mid=(x(a.t)+x(b.t))/2;
    c.beginPath(); c.moveTo(x(a.t),y(a.p));
    // Horizontal tangents keep the curve within observed price bounds.
    c.setLineDash(b.t-a.t>5 ? [3,6] : []);
    c.bezierCurveTo(mid,y(a.p),mid,y(b.p),x(b.t),y(b.p));
    c.stroke();
  }
  c.setLineDash([]);
  c.beginPath(); c.moveTo(x(end.t),y(end.p));
  c.lineTo(x(liveTime),y(end.p)); c.stroke();
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
  c.fillStyle='#a5a0b6';c.font='11px system-ui';
  c.fillText(new Date(points[0].t*1000).toLocaleTimeString(),18,h-6);
  c.textAlign='right';c.fillText(new Date(points.at(-1).t*1000).toLocaleTimeString(),w-42,h-6);c.textAlign='left';
  const pulse = reduced ? 0 : (Math.sin(performance.now()/300)+1)/2;
  c.beginPath();
  c.arc(x(liveTime),y(end.p),10+pulse*7,0,Math.PI*2);
  c.fillStyle=`rgba(183,147,255,${.08+pulse*.12})`; c.fill();
  c.fillStyle = "#b793ff";
  c.shadowColor = "#b793ff";
  c.shadowBlur = 20;
  c.beginPath();
  c.arc(x(liveTime), y(end.p), 6 + pulse, 0, Math.PI * 2);
  c.fill();
  c.shadowBlur = 0;

}
addEventListener("resize", draw);
document.addEventListener("visibilitychange", draw);
reducedChartMotion.addEventListener("change", draw);
async function poll() {
  try {
    render(await api("state"));
  } catch (e) {
    $("ledger").textContent = "Disconnected";
    toast(e.message);
  } finally {
    setTimeout(poll, 3000);
  }
}
$('connect').onclick=()=>act('connect');
$('register').onclick=()=>act('connect');
syncIdentity();
$('withdraw').onclick=()=>act('withdraw');
poll();

const blockStream = new EventSource('/api/blocks');

function appendBlock(point) {
 if(!Number.isFinite(point.p)||point.p<=0||!Number.isFinite(point.t))return;
 if(points.length && point.block<=points.at(-1).block)return;
 points.push(point);points=points.slice(-240);lastBlockReceived=Date.now();
 if(!last || point.block>=last.block) $('price').textContent=money(point.p);
 $('chart-status').textContent=`Finalized block #${point.block.toLocaleString()} · Oracle ${Math.max(0,Math.floor(Date.now()/1000-point.priceAt))}s old`;
 draw();
}
blockStream.addEventListener('history',e=>{for(const p of JSON.parse(e.data))appendBlock(p);});
blockStream.addEventListener('block',e=>appendBlock(JSON.parse(e.data)));
blockStream.addEventListener('health',e=>{if(!JSON.parse(e.data).ok)$('chart-status').textContent='Block feed delayed · reconnecting';});
blockStream.onerror=()=>{$('chart-status').textContent='Block feed disconnected · reconnecting';};
setInterval(()=>{if(lastBlockReceived&&Date.now()-lastBlockReceived>5000)$('chart-status').textContent='Waiting for fresh finalized blocks…';},1000);
new ResizeObserver(draw).observe($('chart'));
draw();
