import { HyperliquidFeed } from './hyperliquid-feed.mjs';
import { parseBbo, mergePricePoints, TICK_MS, RETAIN_MS } from './btc-market-data.mjs';
import { chartZoom } from './chart-zoom.mjs';

export function bucketChartPoints(points, intervalMs) {
  const result=[];
  for(const p of points){
    const time=Math.floor(p.time/intervalMs)*intervalMs, previous=result.at(-1);
    const gapBefore=!!p.gapBefore || previous?.time===time && previous.gapBefore;
    if(previous?.time===time)result.pop();
    result.push({...p,time,intervalMs,gapBefore});
  }
  return result;
}

export class BtcLiveFeed extends HyperliquidFeed {
  constructor(options = {}) { super({ ...options, market: 'bitcoin' }); this.channel = 'bbo'; this.zoom=1;this.widePoints=[]; }
  snapshot() {
    return {...super.snapshot(),points:this.zoom===1?this.points:this.widePoints,zoom:this.zoom,intervalMs:chartZoom(this.zoom).intervalMs};
  }
  setZoom(zoom) {
    const preset=chartZoom(zoom);if(zoom===this.zoom)return;
    this.zoom=zoom;this.historyController?.abort();
    this.widePoints=zoom===1?[]:bucketChartPoints(this.points,preset.intervalMs);
    this.historyStatus='loading';this.emit();
    if(this.running)void this.loadHistory(this.generation);
  }
  start() {
    if(this.running)return;super.start();
    this.zoomRefresh=setInterval(()=>{if(this.running&&this.zoom>1&&!globalThis.document?.hidden)void this.loadHistory(this.generation);},60000);
  }
  stop(){clearInterval(this.zoomRefresh);super.stop();}
  resume() {
    if(!this.running){this.start();return;}
    const now=this.now();
    if(this.socket?.readyState===0 && now-this.connectStarted<=10000)return;
    if(this.socket?.readyState===1 && now-this.lastActivity<=10000){
      // Refresh immediately when returning from a backgrounded tab.
      void this.sync();return;
    }
    // A suspended/closed socket cannot be refreshed via HTTP. Replace it now,
    // instead of waiting for throttled watchdog and reconnect timers.
    clearTimeout(this.reconnect);
    const previous=this.socket;this.socket=null;previous?.close();
    this.status='connecting';this.emit();this.connect();
  }
  accept(data) {
    const quote = parseBbo(data, this.now());
    if (this.quote && quote.time < this.quote.time) return;
    const gap = this.status !== 'live' || this.quote && quote.time - this.quote.time > 5000;
    const time = Math.floor(quote.time / TICK_MS) * TICK_MS;
    const previous = this.points.at(-1);
    if (previous?.time === time) this.points.pop();
    this.points.push({ time, price: quote.chartPrice, gapBefore: !!gap || previous?.time === time && previous.gapBefore,
      kind: 'live size-weighted BBO' });
    this.points = this.points.filter(p => p.time >= time - RETAIN_MS).slice(-2401);
    if(this.zoom>1){
      const preset=chartZoom(this.zoom), bucket=Math.floor(quote.time/preset.intervalMs)*preset.intervalMs, prior=this.widePoints.at(-1);
      if(prior?.time===bucket)this.widePoints.pop();
      this.widePoints.push({time:bucket,price:quote.chartPrice,intervalMs:preset.intervalMs,
        gapBefore:!!gap||prior?.time===bucket&&prior.gapBefore,kind:'live size-weighted BBO'});
      this.widePoints=this.widePoints.filter(p=>p.time>=bucket-preset.spanMs-preset.tileMs).slice(-2401);
    }
    this.quote = quote; this.status = 'live'; this.revision++; this.emit();
  }
  onSocketOpen() {
    if (this.hasConnected) void this.loadHistory(this.generation);
    this.hasConnected = true;
  }
  async loadHistory(generation) {
    const zoom=this.zoom,preset=chartZoom(zoom);
    this.historyController?.abort();
    const controller = new AbortController(); this.historyController = controller;
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await this.fetcher('/api/protocol/market-history'+(zoom===1?'':'?zoom='+zoom), { signal: controller.signal, credentials: 'omit', cache: 'no-store' });
      if (!response.ok) throw new Error('History unavailable');
      const data = await response.json();
      if (data.market !== 'BTC' || data.zoom!==zoom || data.intervalMs !== preset.intervalMs || !Array.isArray(data.points) || data.points.length > 2401 ||
          data.points.some((p, i) => !Number.isFinite(p.price) || p.price <= 0 || !Number.isSafeInteger(p.time) || p.time > this.now() + 5000 ||
            p.time < this.now()-preset.spanMs-preset.tileMs-60000 || p.intervalMs!==preset.intervalMs || p.time%preset.intervalMs ||
            i > 0 && p.time <= data.points[i - 1].time)) throw new Error('Invalid history');
      if (!this.running || generation !== this.generation || this.historyController !== controller || zoom!==this.zoom) return;
      if(zoom===1)this.points=mergePricePoints(data.points,this.points);
      else this.widePoints=mergePricePoints(data.points,bucketChartPoints(this.points,preset.intervalMs),preset.spanMs+preset.tileMs);
      this.historyStatus = data.points.length ? 'ready' : 'unavailable';
    } catch {
      if (!this.running || generation !== this.generation || this.historyController !== controller) return;
      this.historyStatus = 'unavailable';
    } finally { clearTimeout(timeout); }
    this.emit();
  }
}
