import {drawPriceBee} from './chart-bee.mjs';
import { currentTheme, chartPalette } from './brand-theme.mjs';
import { drawPriceBird } from './chart-bird.mjs';
import { ChartTradeTimeline, TRADE_TIMELINE_CSS } from './chart-trades.mjs';
import { entryGuide, drawEntryMarker } from './chart-entry.mjs';
import { ChartNavigation, historyTier, spanLabel, navigationControls, NAVIGATION_CSS } from './chart-navigation.mjs';
const WINDOW_MS = 90000;
const timeLabel = (time,span=WINDOW_MS) => new Date(time).toLocaleString([], { hour12: false, hour: '2-digit', minute: '2-digit', ...(span<3600000?{second:'2-digit'}:{}),...(span>=86400000?{month:'short',day:'numeric'}:{}) });
const priceLabel = price => price.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function chartWindow(points, clock, span = WINDOW_MS, pinnedEnd = null) {
  const end = pinnedEnd ?? clock + span * .15, start = end - span;
  const first = points.findIndex(p => p.time >= start);
  const visible = first < 0 ? points.slice(-1) : points.slice(Math.max(0, first - 1));
  return { start, end, points: visible.filter(p => p.time <= Math.min(clock,end)) };
}
export function chartRange(points, price, focused = false) {
  let low = price, high = price;
  for (const p of points) { low = Math.min(low, p.price); high = Math.max(high, p.price); }
  const padding = Math.max(focused ? .15 : .75, (high - low) * (focused ? .12 : .22));
  return { min: low - padding, max: high + padding };
}

// Off-screen prices are edge annotations, never horizontal lines at a false price.
export function liquidationGuide(price, range, top, bottom) {
  if (!Number.isFinite(price) || price <= 0 || !range ||
      !Number.isFinite(range.min) || !Number.isFinite(range.max) || range.max <= range.min) return null;
  const edge = price < range.min ? 'below' : price > range.max ? 'above' : null;
  const y = bottom - (price - range.min) / (range.max - range.min) * (bottom - top);
  return { price, edge, y: Math.max(top, Math.min(bottom, y)) };
}

// Rendering is frame-paced; quotes and recorded observations remain untouched.
export class LivePriceChart {
  constructor(host, {onZoom=()=>{},focusWindowMs=WINDOW_MS,focusedRange=false,mascot='bird'} = {}) {
    this.host = host;this.colors=chartPalette(currentTheme());
    this.themeChange=()=>{this.colors=chartPalette(currentTheme());this.wake();};
    document.addEventListener('purple-hands:theme',this.themeChange);
    host.innerHTML = `<style>${NAVIGATION_CSS}${TRADE_TIMELINE_CSS}</style><div class="p-pool-chart p-live-chart"><div class="p-pool-chart-top"><span><i></i> BITCOIN · LIVE</span><span data-chart-duration>90s · USDC</span></div>${navigationControls()}<canvas role="img" aria-label="Connecting to Bitcoin live prices"></canvas><div class="p-pool-caption"><span class="p-pool-start"></span><span class="p-pool-history">Loading recent ticks…</span><span class="p-pool-end"></span></div><div class="p-pool-tooltip" hidden></div></div>`;
    this.span=WINDOW_MS;this.onZoom=onZoom;this.focusWindowMs=focusWindowMs;this.focusedRange=focusedRange;this.drawMascot=mascot==='dot'?null:mascot==='bee'?drawPriceBee:drawPriceBird;
    this.duration=host.querySelector('[data-chart-duration]');
    this.canvas = host.querySelector('canvas'); this.ctx = this.canvas.getContext('2d');
    this.badge = host.querySelector('.p-pool-chart-top span');
    this.caption = host.querySelector('.p-pool-history');
    this.startLabel = host.querySelector('.p-pool-start'); this.endLabel = host.querySelector('.p-pool-end');
    this.tooltip = host.querySelector('.p-pool-tooltip'); this.motion = matchMedia('(prefers-reduced-motion: reduce)');
    this.visible = true;
    this.navigation = new ChartNavigation(this.canvas, {resetButton:host.querySelector('[data-chart-reset]'),
      clock:()=>this.clock??this.state?.quote?.time??Date.now(),
      plot:()=>({left:8,width:Math.max(1,this.width-84)}),onChange:view=>{
        this.span=view.span;this.range=null;this.pointer=null;this.tooltip.hidden=true;this.labelSecond=null;
        this.duration.textContent=spanLabel(this.span)+' · USDC';
        this.canvas.setAttribute('aria-label','Bitcoin price chart. '+spanLabel(this.span)+' view. '+(view.end==null?'Following live prices.':'Exploring history.'));
        clearTimeout(this.historyTimer);
        this.historyTimer=setTimeout(()=>this.onZoom(historyTier(this.navigation.view,this.clock??Date.now())),180);
        this.wake();
      }});
    this.resize = new ResizeObserver(() => { this.measure(); this.wake(); }); this.resize.observe(this.canvas);
    this.intersection = new IntersectionObserver(entries => { this.visible = entries[0].isIntersecting; this.wake(); }); this.intersection.observe(host);
    this.visibility = () => { this.lastFrame = null; this.wake(); };
    document.addEventListener('visibilitychange', this.visibility);
    this.motion.addEventListener('change', this.visibility);
    this.canvas.addEventListener('pointermove', e => {
      const rect = this.canvas.getBoundingClientRect(); this.pointer = this.navigation.pointers.size ? null : e.clientX - rect.left; this.wake();
    });
    this.canvas.addEventListener('pointerleave', () => { this.pointer = null; this.tooltip.hidden = true; this.wake(); });
    this.measure();
  }
  measure() {
    const rect = this.canvas.getBoundingClientRect(), ratio = Math.min(devicePixelRatio || 1, 2);
    this.width = Math.max(200, rect.width); this.height = Math.max(80, rect.height);
    this.canvas.width = Math.round(this.width * ratio); this.canvas.height = Math.round(this.height * ratio);
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
  setTradeMarkers(markers,status) {
    this.tradeTimeline??=new ChartTradeTimeline(this);
    this.tradeTimeline.set(markers,status);this.wake();
  }
  setTradeFocus(enabled) {
    enabled=!!enabled;
    if(this.tradeFocus===enabled)return;
    this.tradeFocus=enabled;this.pulses=[];
    // Start a confirmed trade at the live edge; don't reset subsequent zooms.
    if(enabled){if(this.focusWindowMs&&this.focusWindowMs!==WINDOW_MS){this.navigation.set({span:this.focusWindowMs,end:null});this.navigation.rebase();}else this.navigation.reset();}
    else if(this.focusWindowMs&&this.focusWindowMs!==WINDOW_MS)this.navigation.reset();
    this.range=null;
    this.wake();
  }
  setLiquidation(position) {
    const next = Number.isFinite(position?.price) && position.price > 0 ? position : null;
    if (this.liquidation?.price === next?.price && this.liquidation?.stale === next?.stale && this.liquidation?.isLong === next?.isLong && this.liquidation?.markLabel === next?.markLabel) return;
    this.liquidation = next;
    if (!this.liquidationDescription) {
      this.liquidationDescription = document.createElement('span');
      this.liquidationDescription.className = 'p-sr';
      this.liquidationDescription.id = 'p-chart-liquidation-description';
      this.host.append(this.liquidationDescription);
      this.describeChart();
    }
    this.liquidationDescription.textContent = next
      ? `${next.stale ? 'Last known' : 'Protocol'} ${next.isLong ? 'long' : 'short'} liquidation price: ${priceLabel(next.price)} USDC. An arrow indicates a price outside the visible range.` : '';
    this.wake();
  }
  describeChart() {
    this.canvas.setAttribute('aria-describedby',[this.liquidationDescription?.id,this.entryDescription?.id].filter(Boolean).join(' '));
  }
  setEntry(entry) {
    const next=entry&&Number.isFinite(entry.price)&&entry.price>0&&Number.isFinite(entry.time)&&entry.time>0?{price:entry.price,time:entry.time}:null;
    if(this.entry?.price===next?.price&&this.entry?.time===next?.time)return;
    this.entry=next;
    if(!this.entryDescription){
      this.entryDescription=document.createElement('span');this.entryDescription.className='p-sr';this.entryDescription.id='p-chart-entry-description';
      this.host.append(this.entryDescription);this.describeChart();
    }
    this.entryDescription.textContent=next?`Confirmed entry: ${next.price.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})} USDC at ${new Date(next.time).toLocaleString()}. The entry icon on the timeline marks the confirmed fill.`:'';
    this.wake();
  }
  update(state) {
    const old = this.state; this.state = state;
    this.intervalMs=state.intervalMs??125;
    this.duration.textContent=spanLabel(this.span)+' · USDC';
    const q = state.quote;
    const now = performance.now();
    const changed = old?.quote && q && old.quote.chartPrice !== q.chartPrice;
    if (changed && !this.tradeFocus && state.status === 'live' && !this.motion.matches &&
        Date.now() - q.time <= q.maxAge && Date.now() - q.receivedAt <= q.maxAge) {
      // Each real price change emits a short wave, even while an earlier one fades.
      this.pulses = [...(this.pulses ?? []).filter(start => now - start < 460), now].slice(-4);
    }
    if (q && (!this.anchor || old?.status !== 'live' && state.status === 'live')) {
      this.anchor = { time: q.time, mono: performance.now() }; this.tip = q.chartPrice;
    }
    if (q) this.canvas.setAttribute('aria-label', `Bitcoin live chart. ${spanLabel(this.span)} view. ${this.navigation.view.end==null?'Following live prices':'Exploring history'}. ${priceLabel(q.chartPrice)} USDC size-weighted bid/offer. ${this.liquidation?(this.liquidation.markLabel||'P&L')+' midpoint '+priceLabel(q.price)+' USDC. ':''}${state.status === 'live' ? 'Streaming' : 'Price delayed'}.`);
    const resolution=this.intervalMs===125?'125ms':this.intervalMs===1000?'1s':'1m';
    this.caption.textContent = state.historyStatus === 'loading' ? 'Loading history…' : state.historyStatus === 'unavailable' ? 'Live session · history unavailable' : resolution+' history · live ticks';
    this.wake();
  }
  wake() {
    if (this.destroyed) return;
    if (document.hidden || !this.visible) { cancelAnimationFrame(this.frame); this.frame = null; return; }
    if (this.frame == null) this.frame = requestAnimationFrame(now => this.draw(now));
  }
  draw(now) {
    this.frame = null;
    const q = this.state?.quote; if (!q || !this.anchor) return;
    const fresh = this.state.status === 'live' && Date.now() - q.time <= q.maxAge && Date.now() - q.receivedAt <= q.maxAge;
    const dt = this.lastFrame == null ? 16 : Math.min(100, now - this.lastFrame); this.lastFrame = now;
    const runningClock = Math.max(q.time, this.anchor.time + now - this.anchor.mono);
    // Stop extending the last observation when freshness expires.
    const clock = Math.min(runningClock, q.time + q.maxAge);
    this.clock=clock;
    const span=this.span??WINDOW_MS, pinned=this.navigation?.view.end??null;
    const following=pinned==null;
    const view = chartWindow(this.state.points, clock, span, pinned);
    const points = view.points.at(-1)?.time < view.start ? [] : view.points;
    view.points=points;
    this.view = view;
    const last = points.at(-1), animate = !this.motion.matches && fresh && !last?.gapBefore;
    this.tip = animate ? this.tip + (q.chartPrice - this.tip) * (1 - Math.exp(-dt / 120)) : q.chartPrice;
    // Include the confirmed fill while its time is visible, without modifying history.
    const entryVisible=this.entry&&this.entry.time>=view.start&&this.entry.time<=view.end;
    const fills=this.tradeTimeline?.markers.filter(m=>m.time>=view.start&&m.time<=view.end)??[];
    const closeUp=this.tradeFocus&&this.focusedRange&&following;
    // Fill markers remain correctly positioned/edge-labelled, but old fills
    // must not flatten the live price movement during a focused trade.
    const target = chartRange(closeUp?points:[...points,...fills,...(entryVisible?[this.entry]:[])], following ? q.chartPrice : (points.at(-1)?.price??q.chartPrice),closeUp);
    if (!this.range || !animate) this.range = target;
    else {
      const ease = 1 - Math.exp(-dt / 300);
      this.range.min = target.min < this.range.min ? target.min : this.range.min + (target.min - this.range.min) * ease;
      this.range.max = target.max > this.range.max ? target.max : this.range.max + (target.max - this.range.max) * ease;
    }
    const colors=this.colors??chartPalette('purple');
    const ctx = this.ctx, width = this.width, height = this.height, right = width - 76, bottom = height - (this.tradeTimeline?84:this.tradeFocus?36:23), top = this.tradeFocus?28:12;
    const x = t => 8 + (t - view.start) / span * (right - 8);
    const y = p => bottom - (p - this.range.min) / (this.range.max - this.range.min) * (bottom - top);
    ctx.clearRect(0, 0, width, height);
    ctx.font = '10px ui-monospace, SFMono-Regular, monospace'; ctx.textBaseline = 'middle';
    const rawStep = (this.range.max - this.range.min) / 4, magnitude = 10 ** Math.floor(Math.log10(rawStep));
    const step = [1, 2, 5, 10].find(n => n * magnitude >= rawStep) * magnitude;
    ctx.lineWidth = 1; ctx.strokeStyle = `rgba(${colors.rgb},${this.tradeFocus ? .05 : .12})`; ctx.fillStyle = colors.labels;
    for (let p = Math.ceil(this.range.min / step) * step; p <= this.range.max; p += step) {
      const py = y(p); ctx.beginPath(); ctx.moveTo(8, py); ctx.lineTo(right, py); ctx.stroke(); ctx.fillText(priceLabel(p), right + 9, py);
    }
    const tick = [15000,30000,60000,120000,300000,600000,1800000,3600000,10800000,21600000,43200000].find(t=>t>=span/(width<450?3:6))??43200000;
    for (let t = Math.ceil(view.start / tick) * tick; t < view.end; t += tick) {
      const px = x(t); ctx.beginPath(); ctx.moveTo(px, top); ctx.lineTo(px, bottom); ctx.stroke();
      ctx.textAlign = 'center'; if (px > 29 && px < right - 25) ctx.fillText(timeLabel(t,span), px, height - 8); ctx.textAlign = 'left';
    }
    ctx.save(); ctx.beginPath(); ctx.rect(8, top - 4, right - 8, bottom - top + 8); ctx.clip();
    const segments = []; let segment = [];
    for (const [i, point] of points.entries()) {
      if (point.gapBefore && segment.length) { segments.push(segment); segment = []; }
      segment.push({ x: x(point.time), y: y(following && i === points.length - 1 ? this.tip : point.price) });
    }
    if (segment.length) {
      // A horizontal tail holds the last observation; it does not create new prices.
      if(following)segment.push({ x: x(fresh ? clock : Math.max(last.time, q.time)), y: y(this.tip) }); segments.push(segment);
    }
    const gradient = ctx.createLinearGradient(0, top, 0, bottom); gradient.addColorStop(0, `rgba(${colors.rgb},${this.tradeFocus ? .08 : .22})`); gradient.addColorStop(1, `rgba(${colors.rgb},0)`);
    for (const items of segments) {
      ctx.beginPath(); ctx.moveTo(items[0].x, items[0].y); for (const p of items.slice(1)) ctx.lineTo(p.x, p.y);
      ctx.lineTo(items.at(-1).x, bottom); ctx.lineTo(items[0].x, bottom); ctx.closePath(); ctx.fillStyle = gradient; ctx.fill();
      ctx.beginPath(); ctx.moveTo(items[0].x, items[0].y); for (const p of items.slice(1)) ctx.lineTo(p.x, p.y);
      ctx.strokeStyle = fresh ? colors.line : colors.muted; ctx.lineWidth = 1.8; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
    }
    const px = x(fresh ? clock : q.time), py = y(this.tip);
    if(following){
      ctx.setLineDash([3, 4]); ctx.lineWidth = 1; ctx.strokeStyle = `rgba(${colors.rgb},.5)`; ctx.beginPath(); ctx.moveTo(8, py); ctx.lineTo(right, py); ctx.stroke(); ctx.setLineDash([]);
    this.pulses = fresh && !this.motion.matches ? (this.pulses ?? []).filter(start => now - start < 460) : [];
    let flash = 0;
    for (const start of this.pulses) {
      const progress = Math.max(0, (now - start) / 460), intensity = (1 - progress) ** 2;
      const radius = 6 + 21 * (1 - (1 - progress) ** 2);
      const glow = ctx.createRadialGradient(px, py, 1, px, py, radius);
      glow.addColorStop(0, `rgba(${colors.glow},${intensity * .36})`);
      glow.addColorStop(.35, `rgba(${colors.rgb},${intensity * .22})`);
      glow.addColorStop(1, `rgba(${colors.rgb},0)`);
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(px, py, radius, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = `rgba(${colors.glow},${intensity * .65})`; ctx.lineWidth = 1.2 * (1 - progress) + .3;
      ctx.beginPath(); ctx.arc(px, py, radius, 0, Math.PI * 2); ctx.stroke();
      flash = Math.max(flash, intensity);
    }
    if(!this.tradeFocus||!this.drawMascot){
      ctx.beginPath(); ctx.arc(px, py, 8, 0, Math.PI * 2); ctx.fillStyle = `rgba(${colors.rgb},.15)`; ctx.fill();
      ctx.shadowColor = colors.tip; ctx.shadowBlur = 14 * flash;
      ctx.beginPath(); ctx.arc(px, py, 3.5 + flash, 0, Math.PI * 2); ctx.fillStyle = fresh ? (flash > .2 ? colors.flash : colors.tip) : colors.muted; ctx.fill();
    }
    }
    ctx.restore();
    // Render outside the line's clipping rectangle so the bird isn't cropped.
    if(this.tradeFocus&&following&&this.drawMascot)this.drawMascot(ctx,px,py,{now,live:fresh,reducedMotion:this.motion.matches});
    if(following){
    ctx.fillStyle = fresh ? colors.line : colors.muted; ctx.beginPath(); ctx.roundRect(right + 3, py - 11, 72, 22, 5); ctx.fill();
    ctx.fillStyle = colors.ink; ctx.font = 'bold 10px ui-monospace, SFMono-Regular, monospace'; ctx.fillText(priceLabel(q.chartPrice), right + 8, py);
    }
    if(!points.length&&!following){ctx.fillStyle=colors.labels;ctx.textAlign='center';ctx.fillText(this.state.historyStatus==='loading'?'Loading history…':'No observations in this view',right/2,(top+bottom)/2);ctx.textAlign='left';}
    if(following)this.drawPnlMark(right, top, bottom, fresh);
    this.drawLiquidation(right, top, bottom);
    const bounds={left:8,right,top,bottom};
    if(this.tradeTimeline){
      this.tradeTimeline.draw(ctx,view,this.range,bounds,colors);
      if(!entryVisible)drawEntryMarker(ctx,entryGuide(this.entry,view,this.range,bounds),bounds,colors);
    }
    else drawEntryMarker(ctx,entryGuide(this.entry,view,this.range,bounds),bounds,colors);
    this.inspect(x, y, right, top, bottom);
    const second = Math.floor(clock / 1000);
    if (second !== this.labelSecond || fresh !== this.wasFresh) {
      this.startLabel.textContent = timeLabel(view.start,span); this.endLabel.textContent = following ? (fresh ? 'LIVE' : 'DELAYED') : timeLabel(view.end,span);
      this.badge.lastChild.textContent = !following ? ' BITCOIN · HISTORY' : fresh ? ' BITCOIN · LIVE' : ' BITCOIN · DELAYED';
      this.labelSecond = second; this.wasFresh = fresh;
    }
    if (fresh && following && !this.motion.matches) this.wake();
  }
  drawPnlMark(right, top, bottom, fresh) {
    if (!this.liquidation) return;
    const guide = liquidationGuide(this.state?.quote?.price, this.range, top, bottom);
    if (!guide) return;
    const ctx = this.ctx, colors = this.colors??chartPalette('purple');
    ctx.save();
    ctx.strokeStyle = fresh ? colors.tip : colors.muted;
    ctx.lineWidth = 1; ctx.setLineDash([2, 6]);
    if (!guide.edge) { ctx.beginPath(); ctx.moveTo(8, guide.y); ctx.lineTo(right, guide.y); ctx.stroke(); }
    ctx.setLineDash([]);
    const arrow = guide.edge==='above'?'↑ ':guide.edge==='below'?'↓ ':'';
    const label = `${arrow}${this.liquidation.markLabel||'P&L MARK'} ${priceLabel(guide.price)}${fresh?'':' · delayed'}`;
    const labelY = Math.max(top + 11, Math.min(bottom - 11, guide.y - 13));
    ctx.font = '10px ui-monospace, SFMono-Regular, monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = colors.liquidationBg; ctx.beginPath(); ctx.roundRect(11, labelY - 10, ctx.measureText(label).width + 16, 20, 5); ctx.fill();
    ctx.fillStyle = fresh ? colors.tip : colors.muted; ctx.fillText(label, 19, labelY);
    ctx.restore();
  }
  drawLiquidation(right, top, bottom) {
    const guide = liquidationGuide(this.liquidation?.price, this.range, top, bottom);
    if (!guide) return;
    const ctx = this.ctx;
    ctx.save();
    const focused = this.tradeFocus && this.focusedRange;
    if (!guide.edge) {
      ctx.strokeStyle = 'rgba(255,143,180,.5)'; ctx.lineWidth = focused ? 2 : 1; ctx.setLineDash(focused ? [8, 5] : [4, 5]);
      ctx.beginPath(); ctx.moveTo(8, guide.y); ctx.lineTo(right, guide.y); ctx.stroke(); ctx.setLineDash([]);
    } else if (focused) {
      // Place directional ticks outside the price axis so the zoomed plot stays accurate.
      const below = guide.edge === 'below';
      const y = below ? bottom + 2 : top - 2;
      const tipY = y + (below ? 3 : -3);
      ctx.strokeStyle = 'rgba(255,143,180,.5)'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = 12; x < right - 4; x += 22) {
        ctx.moveTo(x - 3, y); ctx.lineTo(x, tipY); ctx.lineTo(x + 3, y);
      }
      ctx.stroke();
    }
    const arrow = guide.edge === 'below' ? '↓ ' : guide.edge === 'above' ? '↑ ' : '';
    const edgeLabel = focused && guide.edge ? ' · ' + guide.edge + ' chart' : '';
    const label = `${arrow}LIQ ${priceLabel(guide.price)}${edgeLabel}${this.liquidation.stale ? ' · last known' : ''}`;
    const labelY = Math.max(top + 11, Math.min(bottom - 11, guide.y - (guide.edge === 'below' ? 9 : 0)));
    ctx.font = '10px ui-monospace, SFMono-Regular, monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = (this.colors??chartPalette('purple')).liquidationBg; ctx.beginPath(); ctx.roundRect(11, labelY - 10, ctx.measureText(label).width + 16, 20, 5); ctx.fill();
    ctx.fillStyle = '#e6a6bf'; ctx.fillText(label, 19, labelY);
    ctx.restore();
  }
  inspect(x, y, right, top, bottom) {
    if (this.tradeTimeline?.selected || this.pointer == null || this.pointer < 8 || this.pointer > right || !this.view.points.length) return;
    const time = this.view.start + (this.pointer - 8) / (right - 8) * (this.span??WINDOW_MS);
    const point = this.view.points.findLast(p => p.time <= time);
    if (!point || time - point.time > Math.max(5000,(point.intervalMs??125)*1.5)) { this.tooltip.hidden = true; return; }
    const colors=this.colors??chartPalette('purple');
    const ctx = this.ctx; ctx.strokeStyle = colors.line; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(x(point.time), top); ctx.lineTo(x(point.time), bottom); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(x(point.time), y(point.price), 3, 0, Math.PI * 2); ctx.fillStyle = colors.tip; ctx.fill();
    this.tooltip.textContent = point.price.toFixed(4) + ' USDC · ' + timeLabel(point.time,this.span) + ((this.intervalMs??125)<1000?'.'+String(point.time%1000).padStart(3,'0'):'');
    this.tooltip.hidden = false;
  }
  destroy() {
    this.destroyed = true; clearTimeout(this.historyTimer); this.navigation.destroy(); cancelAnimationFrame(this.frame); this.resize.disconnect(); this.intersection.disconnect();
    document.removeEventListener('purple-hands:theme',this.themeChange);
    document.removeEventListener('visibilitychange', this.visibility); this.motion.removeEventListener('change', this.visibility);
  }
}
