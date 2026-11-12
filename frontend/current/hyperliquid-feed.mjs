import { HYPER_COINS } from './price-sources.mjs';
const noop = () => {};
export const HYPER_HTTP = 'https://api.hyperliquid.xyz/info';
export const HYPER_WS = 'wss://api.hyperliquid.xyz/ws';
export function parseBook(data, coin, now = Date.now()) {
  const bid = Number(data?.levels?.[0]?.[0]?.px), ask = Number(data?.levels?.[1]?.[0]?.px), time = data?.time;
  if (data?.coin !== coin || !Number.isFinite(bid) || !Number.isFinite(ask) || bid <= 0 || ask < bid ||
      !Number.isSafeInteger(time) || time <= 0 || time > now + 5000 || now - time > 5000) throw new Error('Invalid or delayed order book');
  return { price: (bid + ask) / 2, bid, ask, time, receivedAt: now, maxAge: 5000 };
}
export function parseCandles(rows, coin, now = Date.now()) {
  if (!Array.isArray(rows)) throw new Error('Invalid candles');
  const points = rows.filter(c => c?.s === coin && c.i === '1m' && c.T < now).map(c => {
    const price = Number(c.c), time = c.T;
    if (!Number.isFinite(price) || price <= 0 || !Number.isSafeInteger(time) || time <= 0) throw new Error('Invalid candle');
    return { price, time, kind: '1m trade close' };
  });
  return points.sort((a, b) => a.time - b.time);
}
export class HyperliquidFeed {
  constructor({ market, onUpdate = noop, onReset = noop, now = Date.now, WebSocketClass = globalThis.WebSocket, fetcher = (...args) => globalThis.fetch(...args) } = {}) {
    Object.assign(this, { market, onUpdate, onReset, now, WebSocketClass, fetcher });
    this.coin = HYPER_COINS[market]; this.points = []; this.quote = null; this.status = 'connecting'; this.revision = 0;
    this.historyStatus = 'loading'; this.generation = 0; this.running = false;
  }
  snapshot() { return { quote: this.quote, points: this.points, status: this.status, transport: 'stream', historyStatus: this.historyStatus, revision: this.revision }; }
  emit() { this.onUpdate(this.snapshot()); }
  accept(data) {
    const quote = parseBook(data, this.coin, this.now());
    if (this.quote && quote.time < this.quote.time) return;
    this.quote = quote; this.status = 'live'; this.revision++;
    this.points.push({ ...quote, kind: 'order-book mid' });
    // Bound DOM work and memory even when the page stays open all day.
    this.points = this.points.filter(p => p.time >= quote.time - 3600000).slice(-8000);
    this.emit();
  }
  async loadHistory(generation) {
    const controller = new AbortController(); this.historyController = controller;
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const now = this.now();
      const r = await this.fetcher(HYPER_HTTP, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'omit',
        body: JSON.stringify({ type: 'candleSnapshot', req: { coin: this.coin, interval: '1m', startTime: now - 3600000, endTime: now } }), signal: controller.signal });
      if (!r.ok) throw new Error('History unavailable');
      const past = parseCandles(await r.json(), this.coin, now);
      if (!this.running || generation !== this.generation) return;
      const firstLive = this.points[0]?.time ?? Infinity;
      this.points = [...past.filter(p => p.time < firstLive), ...this.points];
      this.historyStatus = past.length ? 'ready' : 'unavailable';
    } catch { if (!this.running || generation !== this.generation) return; this.historyStatus = 'unavailable'; }
    finally { clearTimeout(timeout); }
    this.emit();
  }
  connect() {
    if (!this.running) return;
    this.connectStarted = this.now(); this.lastActivity = this.now(); this.lastCheck = this.now();
    const generation = this.generation;
    const socket = new this.WebSocketClass(HYPER_WS); this.socket = socket;
    socket.onopen = () => {
      if (!this.running || generation !== this.generation || this.socket !== socket) return socket.close();
      socket.send(JSON.stringify({ method: 'subscribe', subscription: { type: this.channel ?? 'l2Book', coin: this.coin } }));
      this.onSocketOpen?.();
    };
    socket.onmessage = event => {
      if (!this.running || generation !== this.generation || this.socket !== socket) return;
      try {
        const msg = JSON.parse(event.data);
        if (msg.channel !== (this.channel ?? 'l2Book') && msg.channel !== 'pong') return;
        if (this.now() - this.lastActivity > 10000 && this.status === 'live') this.onReset();
        this.lastActivity = this.now();
        if (msg.channel === (this.channel ?? 'l2Book')) this.accept(msg.data);
      } catch { /* Watchdog rejects a feed without valid quotes. */ }
    };
    socket.onerror = () => socket.close();
    socket.onclose = () => {
      if (!this.running || generation !== this.generation || this.socket !== socket) return;
      this.disconnect(); this.reconnect = setTimeout(() => this.connect(), 2000);
    };
  }
  disconnect() {
    if (this.status === 'live') this.onReset();
    this.status = 'offline'; this.emit();
  }
  start() {
    if (this.running) return;
    this.running = true; this.generation++; this.status = 'connecting'; this.emit(); this.connect();
    this.loadHistory(this.generation);
    this.watchdog = setInterval(() => {
      const now = this.now(), paused = now - this.lastCheck > 10000; this.lastCheck = now;
      // A retained quote belongs to the old connection. Give the new socket
      // its full startup window instead of closing it on that stale timestamp.
      if (paused || now - this.lastActivity > 10000 || now - Math.max(this.quote?.time ?? 0, this.connectStarted) > 10000) { this.disconnect(); this.socket?.close(); return; }
      if (this.socket?.readyState === 1) {
        this.socket.send(JSON.stringify({ method: 'ping' }));
        if (!this.quote || now - this.quote.time > 2000) this.sync();
      }
    }, 2000);
  }
  async sync() {
    if (!this.running || this.socket?.readyState !== 1 || this.syncing) return this.syncing;
    const generation = this.generation, controller = new AbortController(); this.snapshotController = controller;
    const timeout = setTimeout(() => controller.abort(), 5000);
    const job = (async () => {
      try {
        const r = await this.fetcher(HYPER_HTTP, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'omit',
          body: JSON.stringify({ type: 'l2Book', coin: this.coin }), signal: controller.signal });
        if (!r.ok) throw new Error('Snapshot unavailable');
        const data = await r.json();
        // An HTTP response cannot revive a disconnected stream or hide a missed interval.
        if (!this.running || generation !== this.generation || this.socket?.readyState !== 1 || this.now() - this.lastActivity > 10000) return;
        this.accept(data);
      } catch { /* The quote expires on its original timestamp; no stale settlement. */ }
      finally { clearTimeout(timeout); }
    })();
    this.syncing = job;
    try { await job; } finally { if (this.syncing === job) this.syncing = null; }
  }
  stop() {
    this.running = false; this.generation++; clearInterval(this.watchdog); clearTimeout(this.reconnect);
    this.historyController?.abort(); this.snapshotController?.abort(); this.syncing = null; this.socket?.close(); this.status = 'offline';
  }
}
