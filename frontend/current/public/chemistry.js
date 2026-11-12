/* Yellow Hands Chemistry · <yh-chemistry> v1
   Embed:  <script src="https://yh-chemistry.boogaav.workers.dev/chemistry.js"></script>
           <yh-chemistry room="WATCH_ROOM_KEY" account="0xYOUR_ADDRESS"></yh-chemistry>
   Attributes: room     Pulse watch-app room key (live heart rate)
               account  Yellow Hands address to follow; without it the panel offers manual UP/DOWN practice rounds
               layout   "body" shows only the body panel (for a sidebar inside the Yellow Hands app)
               relay    relay origin, defaults to this script's origin
               rest     resting BPM; otherwise learned from the watch while no trade is open
   Host API:   el.setTrade({isLong, entryPrice, margin, leverage}) and el.endTrade(pnl) for apps that push trades themselves.
   The three fills are an illustration, not hormone levels. Only the BPM is measured, and only while the watch is live. */
(() => {
'use strict';
const BASE = .06, TICK = .1, N = 300, ROUND = 30, BOT = 391, U = 126; // U: one layer's max height; three layers fill the body
const HR_STALE = 15000, PRICE_STALE = 5000;
const HL_WS = 'wss://api.hyperliquid.xyz/ws'; // same BTC book the Yellow Hands app prices from
const ORIGIN = typeof document !== 'undefined' && document.currentScript && document.currentScript.src ? new URL(document.currentScript.src).origin : '';
const cl = v => Math.max(0, Math.min(1, v));
const money = v => (v < 0 ? '−' : v > 0 ? '+' : '') + '$' + Math.abs(v).toFixed(2);

// Account snapshot from /v1/accounts/{addr}: `position` is the on-chain struct with integers as strings. Open = filled and not settled.
function parsePosition(snap) {
  const p = snap && snap.position;
  if (!p || !snap.positionId || p.settled === true || p.filled === false) return null;
  const margin = Number(p.margin) / 1e6, leverage = Number(p.leverage); // USDC has 6 decimals
  if (!(margin > 0 && leverage > 0)) return null;
  return { id: String(snap.positionId), dir: p.isLong ? 1 : -1, margin, leverage, entryRaw: Number(p.entryPrice), openedAt: Number(p.openedAt) * 1000 || 0 };
}
// shortcut: the API doesn't state entryPrice's fixed-point scale, so pick the power of ten that lands next to the live price; read the decimals from the contract if a market ever trades far from its feed.
function scaleEntry(raw, mid) {
  if (!(raw > 0)) return mid;
  if (!(mid > 0)) return raw;
  return raw / 10 ** Math.round(Math.log10(raw / mid));
}
function parseBook(msg) {
  const lv = msg && msg.channel === 'l2Book' && msg.data && msg.data.coin === 'BTC' && msg.data.levels;
  if (!lv || !lv[0] || !lv[1] || !lv[0][0] || !lv[1][0]) return null;
  const bid = +lv[0][0].px, ask = +lv[1][0].px;
  return bid > 0 && ask >= bid ? (bid + ask) / 2 : null;
}

const BODY = 'M195 105 C170 96 161 76 165 51 C168 19 208 13 232 26 C258 41 263 70 250 88 L239 105 L241 128 C267 135 290 135 302 154 L323 226 L308 232 L283 179 L281 272 L265 391 L246 391 L247 286 L225 286 L212 391 L194 391 L195 275 L185 179 L165 231 L149 226 L172 156 C179 139 200 135 212 129 L211 112 Z';
const CSS = `
:host{display:block;--k-bg:#0f1110;--k-panel:#161815;--k-line:#2b2e28;--k-ink:#f2f2ea;--k-mut:#979a8d;--k-yel:#e7ee74;--k-d:#d5ec8c;--k-a:#f0a35e;--k-c:#86bfd0;--k-up:#9be37b;--k-down:#f0786c;--mono:"JetBrains Mono",ui-monospace,Menlo,monospace;--reel:"Barlow Condensed","Arial Narrow",Impact,sans-serif;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
*{box-sizing:border-box}[hidden]{display:none!important}
.sim{display:grid;grid-template-columns:minmax(0,40fr) minmax(0,60fr);background:var(--k-bg);color:var(--k-ink);border:1px solid var(--k-line);border-radius:16px;overflow:hidden}
.sim.body-only{grid-template-columns:1fr}.sim.body-only .sim-app{display:none}.sim.body-only .sim-body{border-right:0}
.sim-body{padding:12px 10px 14px;border-right:1px solid var(--k-line);display:flex;flex-direction:column;gap:10px;min-width:0}
.chips{display:flex;flex-wrap:wrap;gap:4px}
.chips span{font:600 .58rem/1 var(--mono);letter-spacing:.05em;color:var(--k-mut);border:1px solid var(--k-line);border-radius:999px;padding:4px 7px}
.chips .on{color:#121410;background:var(--k-up);border-color:var(--k-up)}.chips .bad{color:var(--k-down);border-color:var(--k-down)}
svg.body{width:100%;height:auto;display:block;max-height:380px}
.hr{display:flex;align-items:baseline;gap:6px;font:500 .68rem var(--mono);color:var(--k-mut)}
.hr b{font:700 1.7rem/1 var(--reel);color:var(--k-ink);font-variant-numeric:tabular-nums}.hr em{font-style:normal;margin-left:auto}
.levels{display:grid;gap:8px}
.lv{display:grid;grid-template-columns:auto minmax(0,1fr);align-items:center;gap:4px 8px;font:500 .66rem/1.2 var(--mono);color:var(--k-mut)}
.lv span{color:var(--k-ink)}.lv i{grid-column:1/-1;height:5px;background:var(--k-line);border-radius:3px;overflow:hidden;display:block}
.lv b{display:block;height:100%;width:6%;border-radius:3px}
#mD{background:var(--k-d)}#mA{background:var(--k-a)}#mC{background:var(--k-c)}
.sim-app{padding:14px;display:flex;flex-direction:column;gap:10px;min-width:0;position:relative;background:var(--k-panel)}
.app-top{display:flex;justify-content:space-between;gap:8px;font:600 .68rem var(--mono);letter-spacing:.05em;color:var(--k-mut)}
.app-price{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;font-variant-numeric:tabular-nums}
#sPrice{font:600 1.45rem/1 var(--mono);letter-spacing:-.02em}#sMove{font:500 .74rem var(--mono);color:var(--k-mut)}
#sChart{width:100%;height:130px;display:block;background:var(--k-bg);border-radius:8px}
.chart-key{display:flex;flex-wrap:wrap;gap:4px 12px;font:.62rem var(--mono);color:var(--k-mut);margin-top:-4px}
.app-stats{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.app-stats small{display:block;font:600 .62rem var(--mono);letter-spacing:.06em;color:var(--k-mut)}
.app-stats strong{font:700 1.9rem/1 var(--reel);font-variant-numeric:tabular-nums}
.app-stats em{display:block;font:normal .66rem var(--mono);color:var(--k-mut);margin-top:3px}
.pos{color:var(--k-up)}.neg{color:var(--k-down)}
.app-btns{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.app-btns button{border:0;border-radius:10px;padding:12px 8px;font:700 1.15rem/1 var(--reel);letter-spacing:.04em;color:#121410;cursor:pointer}
#bUp{background:var(--k-up)}#bDown{background:var(--k-down)}#bClose{grid-column:1/-1;background:var(--k-yel)}
.app-btns button:focus-visible{outline:3px solid #fff;outline-offset:2px}
.app-cap{font:700 1.15rem/1.05 var(--reel);text-transform:uppercase;color:#fff;min-height:2.2em;margin:0}
.k-stamp{position:absolute;right:12px;top:92px;border:3px solid #e0362a;color:#e0362a;font:700 1.35rem/1 var(--reel);padding:4px 8px;transform:rotate(-8deg);border-radius:6px;background:rgba(15,17,16,.8)}
@media(max-width:520px){.sim-app{padding:10px}.sim-body{padding:10px 6px}#sPrice{font-size:1.1rem}.app-stats strong{font-size:1.5rem}.app-cap{font-size:1rem}#sChart{height:110px}.k-stamp{top:80px;font-size:1.1rem}}`;
const HTML = `
<div class="sim" part="panel">
 <div class="sim-body">
  <div class="chips"><span id="cWatch">WATCH</span><span id="cPrice">BTC</span><span id="cAcct">PRACTICE</span></div>
  <svg class="body" viewBox="140 0 200 400" role="img" aria-label="Body filling with three illustrative chemistry layers">
   <defs><path id="bodyShape" d="${BODY}"/><clipPath id="bodyClip"><use href="#bodyShape"/></clipPath></defs>
   <use href="#bodyShape" fill="#1b1e1a"/>
   <g clip-path="url(#bodyClip)"><path id="lyD" fill="#d5ec8c" fill-opacity=".9"/><path id="lyA" fill="#f0a35e" fill-opacity=".92"/><path id="lyC" fill="#86bfd0" fill-opacity=".95"/></g>
   <path id="oBrain" d="M186 47 C177 44 174 58 179 64 C171 76 182 85 193 82 C198 94 214 88 218 82 C234 88 246 75 240 66 C249 54 237 42 226 44 C216 31 196 34 193 46 Z" fill="#e7ee74" fill-opacity=".15" stroke="#e7ee74" stroke-opacity=".7" stroke-width="1.2"/>
   <path id="oHeart" d="M228 166 C218 151 200 164 210 181 L228 200 L245 181 C257 164 239 152 228 166" fill="#ff4d3d" stroke="#ffb3a9" stroke-width="1"/>
   <path id="oAdr" d="M207 223 Q216 214 223 227 M241 227 Q249 214 257 224" stroke="#bfe6f2" stroke-width="5" fill="none" stroke-linecap="round" stroke-opacity=".2"/>
   <use href="#bodyShape" fill="none" stroke="#5c6458" stroke-width="1.6"/>
  </svg>
  <div class="hr"><b id="hBpm">72</b>BPM<em id="hSrc">modeled</em></div>
  <div class="levels" aria-hidden="true">
   <div class="lv"><span>Dopamine</span>anticipation<i><b id="mD"></b></i></div>
   <div class="lv"><span>Adrenaline</span>arousal<i><b id="mA"></b></i></div>
   <div class="lv"><span>Cortisol</span>unresolved<i><b id="mC"></b></i></div>
  </div>
 </div>
 <div class="sim-app">
  <div class="app-top"><span id="sHead">BTC · 1,000× · $10</span><span id="sTimer">READY</span></div>
  <div class="app-price"><span id="sPrice">—</span><span id="sMove"></span></div>
  <svg id="sChart" viewBox="0 0 300 120" preserveAspectRatio="none" role="img" aria-label="Bitcoin price for the current round">
   <line id="sEntry" x1="0" x2="300" y1="60" y2="60" stroke="#e7ee74" stroke-opacity=".55" stroke-dasharray="4 4" vector-effect="non-scaling-stroke" visibility="hidden"/>
   <line id="sLiq" x1="0" x2="300" y1="97" y2="97" stroke="#f0786c" stroke-dasharray="2 4" vector-effect="non-scaling-stroke" visibility="hidden"/>
   <polyline id="sLine" fill="none" stroke="#979a8d" stroke-width="2" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
  </svg>
  <div class="chart-key"><span>– – entry</span><span style="color:#f0786c">· · margin gone</span></div>
  <div class="app-stats">
   <div><small>P/L</small><strong id="sPnl">$0.00</strong><em id="sRet">no position</em></div>
   <div><small>HEART</small><strong id="sBpm">72</strong><em id="sPeak">BPM</em></div>
  </div>
  <div class="app-btns"><button id="bUp" type="button">▲ UP</button><button id="bDown" type="button">▼ DOWN</button><button id="bClose" type="button" hidden>CLOSE NOW</button></div>
  <p class="app-cap" id="sCap" aria-live="polite"></p>
  <div class="k-stamp" id="sStamp" hidden></div>
 </div>
</div>`;

if (typeof HTMLElement !== 'undefined') {
  class YHChemistry extends HTMLElement {
    connectedCallback() {
      if (this.S) return;
      if (!document.querySelector('link[data-yh-fonts]')) {
        const l = document.createElement('link');
        l.rel = 'stylesheet'; l.dataset.yhFonts = '';
        l.href = 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;600&family=Barlow+Condensed:wght@700&display=swap';
        document.head.appendChild(l);
      }
      const root = this.shadowRoot || this.attachShadow({ mode: 'open' });
      root.innerHTML = `<style>${CSS}</style>${HTML}`;
      this.$ = id => root.getElementById(id);
      if (this.getAttribute('layout') === 'body') root.querySelector('.sim').classList.add('body-only');
      this.RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.relay = (this.getAttribute('relay') || ORIGIN || location.origin).replace(/\/$/, '');
      this.room = (this.getAttribute('room') || '').trim().toLowerCase();
      this.account = (this.getAttribute('account') || '').trim();
      this.dead = false;
      const S = this.S = { phase: 'idle', P: 97000, hist: [], E: 0, dir: 1, margin: 10, lev: 1000, t: 0, r: 0, pnl: 0, best: 0, res: 0, approx: false,
        d: BASE, a: BASE, c: BASE, mbpm: 72, hr: 0, hrAt: 0, rest: +this.getAttribute('rest') || 0, peak: 72, hover: 0,
        src: this.account ? 'account' : 'manual', posId: null, mid: 0, midAt: 0, realSeen: false, acct: '', cap: '', capAt: 0, capPh: '' };
      for (let i = 0; i < N; i++) { this.walk(); S.hist.push(S.P); }
      ['bUp', 'bDown'].forEach(id => {
        const b = this.$(id), on = () => { if (S.phase === 'idle') S.hover = 1; }, off = () => { S.hover = 0; };
        b.addEventListener('pointerenter', on); b.addEventListener('pointerleave', off); b.addEventListener('focus', on); b.addEventListener('blur', off);
      });
      this.$('bUp').addEventListener('click', () => this.enter(1));
      this.$('bDown').addEventListener('click', () => this.enter(-1));
      this.$('bClose').addEventListener('click', () => { if (S.phase === 'trade') this.close('manual'); });
      this.connectPrice();
      if (/^[0-9a-f]{32}$/.test(this.room)) this.connectHeart();
      if (/^0x[0-9a-fA-F]{40}$/.test(this.account)) this.pollAccount();
      this.ui();
      this.last = performance.now(); this.acc = 0; this.beat = 0;
      this.raf = requestAnimationFrame(t => this.frame(t));
    }
    disconnectedCallback() {
      this.dead = true; cancelAnimationFrame(this.raf); clearInterval(this.acctTimer); clearInterval(this.ping);
      try { this.hl && this.hl.close(); this.hrws && this.hrws.close(); } catch {}
      this.S = null;
    }
    // Host API for apps that push their own trade events.
    setTrade(t = {}) {
      if (!this.S) return;
      this.S.src = 'host';
      const dir = t.dir || (t.isLong === false ? -1 : 1);
      this.enter(dir, { entry: scaleEntry(+t.entryPrice, this.S.mid || this.S.P), margin: +t.margin || 10, lev: +t.leverage || 1000 });
    }
    endTrade(pnl) {
      if (!this.S || this.S.phase !== 'trade') return;
      if (Number.isFinite(+pnl)) this.S.pnl = +pnl;
      this.close(Number.isFinite(+pnl) ? 'host' : 'chain');
    }

    hrLive() { return Date.now() - this.S.hrAt < HR_STALE; }
    priceLive() { return Date.now() - this.S.midAt < PRICE_STALE; }
    bpm() { return this.hrLive() ? this.S.hr : this.S.mbpm; }
    walk() {
      const g = Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());
      let m = g * .004;
      if (Math.random() < .02) m += (Math.random() < .5 ? -1 : 1) * (.015 + Math.random() * .02);
      this.S.P *= 1 + m / 100;
    }
    ease(kd, ka, kc) { const S = this.S; S.d = BASE + (S.d - BASE) * kd; S.a = BASE + (S.a - BASE) * ka; S.c = BASE + (S.c - BASE) * kc; }

    connectPrice() {
      const go = () => {
        if (this.dead) return;
        const ws = this.hl = new WebSocket(HL_WS);
        ws.onopen = () => ws.send(JSON.stringify({ method: 'subscribe', subscription: { type: 'l2Book', coin: 'BTC' } }));
        ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch { return; } const mid = parseBook(m); if (mid && this.S) { this.S.mid = mid; this.S.midAt = Date.now(); } };
        ws.onclose = () => { if (!this.dead) setTimeout(go, 3000); };
      };
      go();
      this.ping = setInterval(() => { try { if (this.hl && this.hl.readyState === 1) this.hl.send('{"method":"ping"}'); } catch {} }, 50000);
    }
    connectHeart() {
      const url = this.relay.replace(/^http/, 'ws') + '/ws/' + this.room;
      const go = () => {
        if (this.dead) return;
        const ws = this.hrws = new WebSocket(url);
        ws.onmessage = e => {
          let m; try { m = JSON.parse(e.data); } catch { return; }
          const b = +m.bpm, S = this.S;
          if (!S || !(b >= 25 && b <= 250)) return;
          S.hr = b; S.hrAt = Math.min(Date.now(), +m.rx || Date.now()); // the relay replays its last sample on connect, so age it by when it arrived
          if (!S.rest) S.rest = b;
        };
        ws.onclose = () => { if (!this.dead) setTimeout(go, 3000); };
      };
      go();
    }
    pollAccount() {
      const tick = async () => {
        if (this.dead || !this.S) return;
        try {
          const r = await fetch(this.relay + '/acct/' + this.account, { cache: 'no-store' });
          if (!r.ok) throw Error(String(r.status));
          const snap = await r.json();
          if (!this.S) return;
          this.S.acct = 'ok';
          this.onPosition(parsePosition(snap));
        } catch { if (this.S) this.S.acct = 'error'; }
      };
      tick();
      this.acctTimer = setInterval(tick, 1500);
    }
    onPosition(pos) {
      const S = this.S;
      if (pos && pos.id !== S.posId && S.phase !== 'trade') {
        this.enter(pos.dir, { entry: scaleEntry(pos.entryRaw, S.mid || S.P), margin: pos.margin, lev: pos.leverage, id: pos.id,
          t: pos.openedAt ? Math.max(0, (Date.now() - pos.openedAt) / 1000) : 0 });
      } else if (!pos && S.phase === 'trade' && S.src === 'account') {
        this.close('chain');
      }
    }

    enter(dir, o = {}) {
      const S = this.S;
      if (!S || S.phase === 'trade') return;
      Object.assign(S, { phase: 'trade', dir, E: o.entry || S.P, margin: o.margin || 10, lev: o.lev || 1000, t: o.t || 0, r: 0, pnl: 0, best: 0, res: 0,
        approx: false, peak: this.bpm(), hist: [S.P], hover: 0, posId: o.id || S.posId });
      S.d = cl(S.d + .2);
      if (!this.hrLive()) S.a = cl(S.a + .12);
      this.ui();
    }
    close(kind) {
      const S = this.S;
      S.res = kind === 'liq' ? -S.margin : S.pnl; S.pnl = S.res;
      S.approx = kind === 'chain'; // the panel's own P/L estimate, before Yellow Hands' fee and rake
      if (S.res > 0) S.d = cl(S.d + .15); else { S.c = cl(S.c + .08); S.a = cl(S.a + .1); }
      S.phase = 'closed'; S.t = 0;
      this.ui();
    }

    // Illustrative model. Adrenaline follows the watch when it is live, otherwise how hard P/L swings;
    // dopamine follows anticipation and new highs; cortisol builds slowly while unresolved and faster while losing.
    step() {
      const S = this.S, live = this.priceLive(), hrLive = this.hrLive();
      if (S.phase !== 'closed') {
        if (live) { if (!S.realSeen) { S.realSeen = true; S.hist = []; } S.P = S.mid; } else this.walk();
        S.hist.push(S.P); if (S.hist.length > N) S.hist.shift();
      }
      if (S.phase === 'idle') {
        S.d += .012 * S.hover; this.ease(.985, .985, .985);
        if (hrLive && !this.getAttribute('rest')) S.rest += (S.hr - S.rest) * .01;
      } else if (S.phase === 'trade') {
        S.t += TICK;
        const pnl = S.margin * S.lev * (S.P / S.E - 1) * S.dir, r = pnl / S.margin, dr = r - S.r, adr = Math.abs(dr);
        S.r = r; S.pnl = pnl;
        S.a += .0025 + .09 * adr + .3 * Math.max(adr - .1, 0) + .003 * Math.min(Math.abs(r), 1) + (S.src === 'manual' && S.t > ROUND - 5 ? .004 : 0);
        S.d += .0012 + .15 * Math.max(dr, 0) + (r > S.best + .05 ? .03 : 0); S.best = Math.max(S.best, r);
        S.c += .0012 + .006 * Math.max(-r, 0);
        this.ease(.992, .988, .998);
        if (S.src === 'manual') { if (pnl <= -S.margin) this.close('liq'); else if (S.t >= ROUND) this.close('time'); }
      } else if (S.phase === 'closed') { S.t += TICK; if (S.t >= 1.4) { S.phase = 'exhale'; S.t = 0; this.ui(); } }
      else if (S.phase === 'exhale') { S.t += TICK; this.ease(.97, .955, .985); if (S.t >= 8) { S.phase = 'idle'; this.ui(); } }
      if (hrLive && S.rest) S.a += (cl(BASE + (S.hr - S.rest) / 50) - S.a) * .15;
      S.d = cl(S.d); S.a = cl(S.a); S.c = cl(S.c);
      S.mbpm += (72 + 60 * S.a + 14 * S.c + 6 * S.d - S.mbpm) * .07;
      if (S.phase === 'trade' || S.phase === 'closed') S.peak = Math.max(S.peak, this.bpm());
    }
    ui() {
      const S = this.S, p = S.phase, $ = this.$, manual = S.src === 'manual';
      $('bUp').hidden = $('bDown').hidden = !(manual && p === 'idle');
      $('bClose').hidden = !(manual && p === 'trade');
      $('sStamp').hidden = !(p === 'closed' || p === 'exhale');
      $('sEntry').setAttribute('visibility', p === 'idle' ? 'hidden' : 'visible');
    }
    caption() {
      const S = this.S, p = S.phase, manual = S.src === 'manual';
      if (p === 'idle') return manual ? (S.hover ? 'Anticipation. The brain fills first.' : 'Hover UP or DOWN. Then pick one.') : 'Open a position in Yellow Hands.';
      if (p === 'closed') return S.res <= -S.margin ? 'Margin gone. ' + money(-S.margin) : 'Round closed. ' + (S.approx ? '≈ ' : '') + money(S.res);
      if (p === 'exhale') return 'The round is over. Let it end.';
      if (!manual && S.t < 3) return 'Position open on Yellow Hands.';
      if (manual && S.t > ROUND - 5) return 'Five seconds left.';
      if (S.r < -.5) return 'On edge while it’s unresolved.';
      if (S.a > .6) return 'My heart is racing.';
      if (S.r > .3) return 'Something could happen. Keep watching.';
      return '$' + S.margin + ' controls $' + Math.round(S.margin * S.lev).toLocaleString('en-US') + ' of Bitcoin.';
    }
    wave(top, ph) {
      const amp = this.RM ? 0 : 2.6; let d = 'M140 400';
      for (let x = 140; x <= 340; x += 10) d += ' L' + x + ' ' + (top + amp * Math.sin(x / 14 + ph)).toFixed(1);
      return d + ' L340 400 Z';
    }
    draw(now) {
      const S = this.S, $ = this.$, t = now / 1000, p = S.phase, live = p !== 'idle', bpm = this.bpm(), hrLive = this.hrLive();
      [S.c + S.a + S.d, S.c + S.a, S.c].forEach((v, i) => $(['lyD', 'lyA', 'lyC'][i]).setAttribute('d', this.wave(BOT - v * U, t * 2.2 + i * 1.7)));
      $('oBrain').setAttribute('fill-opacity', (.12 + .78 * S.d).toFixed(2));
      $('oAdr').setAttribute('stroke-opacity', (.15 + .85 * S.c).toFixed(2));
      const k = this.RM ? 0 : Math.exp(-(this.beat % 1) * 7);
      $('oHeart').setAttribute('transform', 'translate(228 178) scale(' + (1 + .3 * k).toFixed(3) + ') translate(-228 -178)');
      $('mD').style.width = S.d * 100 + '%'; $('mA').style.width = S.a * 100 + '%'; $('mC').style.width = S.c * 100 + '%';
      $('hBpm').textContent = Math.round(bpm);
      $('hSrc').textContent = hrLive ? 'Apple Watch' : 'modeled';
      const chip = (id, text, cls) => { const el = $(id); el.textContent = text; el.className = cls || ''; };
      chip('cWatch', hrLive ? '● WATCH' : this.room ? '○ WATCH waiting' : '○ NO WATCH', hrLive ? 'on' : '');
      chip('cPrice', this.priceLive() ? '● BTC live' : '○ BTC simulated', this.priceLive() ? 'on' : '');
      chip('cAcct', S.src === 'account' ? (S.acct === 'ok' ? '● ACCOUNT' : S.acct === 'error' ? '○ ACCOUNT error' : '○ ACCOUNT') : S.src === 'host' ? '● APP' : 'PRACTICE',
        S.src === 'account' ? (S.acct === 'ok' ? 'on' : S.acct === 'error' ? 'bad' : '') : S.src === 'host' ? 'on' : '');
      // chart zooms to the moves actually seen (a $10 round often moves BTC ~0.01%), capped at 1.5× the margin-wipe move
      const ref = live ? S.E : S.hist[0], wipe = 100 / S.lev;
      const seen = S.hist.reduce((m, v) => Math.max(m, Math.abs((v / ref - 1) * 100)), 0);
      const range = Math.min(Math.max(.15, 1.5 * wipe), Math.max(.01, seen * 1.4)), y = v => Math.max(3, Math.min(117, 60 - ((v / ref - 1) * 100 / range) * 55));
      $('sLiq').setAttribute('visibility', p === 'trade' && wipe <= range ? 'visible' : 'hidden');
      $('sLine').setAttribute('points', S.hist.map((v, i) => (i * 300 / (N - 1)).toFixed(1) + ',' + y(v).toFixed(1)).join(' '));
      $('sLine').setAttribute('stroke', live ? (S.pnl >= 0 ? '#9be37b' : '#f0786c') : '#979a8d');
      const ly = (60 + S.dir * (100 / S.lev) / range * 55).toFixed(1);
      $('sLiq').setAttribute('y1', ly); $('sLiq').setAttribute('y2', ly);
      $('sHead').textContent = 'BTC · ' + Math.round(S.lev).toLocaleString('en-US') + '× · $' + (+S.margin.toFixed(2));
      $('sPrice').textContent = S.P.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
      const mv = (S.P / ref - 1) * 100;
      $('sMove').textContent = (mv >= 0 ? '+' : '−') + Math.abs(mv).toFixed(3) + '%' + (live ? ' from entry' : ' · 30 s');
      $('sPnl').textContent = live ? (S.approx ? '≈' : '') + money(S.pnl) : '$0.00';
      $('sPnl').className = live ? (S.pnl > 0 ? 'pos' : S.pnl < 0 ? 'neg' : '') : '';
      $('sRet').textContent = live ? Math.round(S.pnl / S.margin * 100) + '% of margin · ' + (S.dir > 0 ? 'UP' : 'DOWN') + (S.src === 'manual' ? '' : ' · before fees') : 'no position';
      $('sBpm').textContent = Math.round(bpm);
      $('sPeak').textContent = (hrLive ? 'BPM · watch' : 'BPM · modeled') + (live ? ' · peak ' + Math.round(S.peak) : '');
      $('sStamp').textContent = 'PEAK ' + Math.round(S.peak) + ' BPM';
      const el = Math.floor(S.t), clock = Math.floor(el / 60) + ':' + String(el % 60).padStart(2, '0');
      $('sTimer').textContent = p === 'trade' ? (S.src === 'manual' ? '0:' + String(Math.max(0, Math.ceil(ROUND - S.t))).padStart(2, '0') : clock) : p === 'idle' ? 'READY' : p === 'closed' ? 'CLOSED' : 'EXHALE';
      const c = this.caption();
      if (c !== S.cap && (p !== S.capPh || now - S.capAt > 1500)) { S.cap = c; S.capAt = now; S.capPh = p; $('sCap').textContent = c; }
    }
    frame(now) {
      if (!this.S) return;
      const dt = Math.min(.25, (now - this.last) / 1000); // clamp so a backgrounded tab doesn't replay minutes of ticks
      this.last = now; this.acc += dt;
      while (this.acc >= TICK) { this.step(); this.acc -= TICK; }
      this.beat += dt * this.bpm() / 60;
      this.draw(now);
      this.raf = requestAnimationFrame(t => this.frame(t));
    }
  }
  if (!customElements.get('yh-chemistry')) customElements.define('yh-chemistry', YHChemistry);
}
if (typeof module !== 'undefined' && module.exports) module.exports = { parsePosition, scaleEntry, parseBook };
})();
