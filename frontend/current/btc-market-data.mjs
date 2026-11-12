export const TICK_MS = 125;
export const RETAIN_MS = 300000;

// Papertrade displays a size-weighted top-of-book price on its tick chart.
// Its BTC quote/position reference is the midpoint, truncated to the 0.1 tick.
export function parseBbo(data, now = Date.now()) {
  const levels = data?.bbo ?? [data?.levels?.[0]?.[0], data?.levels?.[1]?.[0]];
  const [bidLevel, askLevel] = levels;
  const bid = Number(bidLevel?.px), ask = Number(askLevel?.px);
  const bidSize = Number(bidLevel?.sz), askSize = Number(askLevel?.sz), time = data?.time;
  if (data?.coin !== 'BTC' || ![bid, ask, bidSize, askSize].every(Number.isFinite) || bid <= 0 || ask < bid ||
      bidSize < 0 || askSize < 0 || !Number.isSafeInteger(Math.round(bid * 10) + Math.round(ask * 10)) ||
      Math.abs(bid * 10 - Math.round(bid * 10)) > 1e-6 || Math.abs(ask * 10 - Math.round(ask * 10)) > 1e-6 ||
      !Number.isSafeInteger(time) || time <= 0 || time > now + 5000 || now - time > 5000) throw new Error('Invalid or delayed BTC quote');
  const price = Math.floor((Math.round(bid * 10) + Math.round(ask * 10)) / 2) / 10;
  const total = bidSize + askSize;
  const chartPrice = total > 0 ? (bid * askSize + ask * bidSize) / total : price;
  if (!Number.isFinite(chartPrice) || chartPrice < bid - 1e-6 || chartPrice > ask + 1e-6) throw new Error('Invalid BTC chart price');
  return { price, chartPrice, bid, ask, time, receivedAt: now, maxAge: 5000 };
}

export function parsePriceHistory(data, fromMs, toMs, intervalMs = TICK_MS) {
  const offsets = data?.timeOffsetsMs, prices = data?.columns?.price, gaps = data?.gapIndices;
  const integer = x => Number.isSafeInteger(x) && x >= 0;
  if (![125,1000,60000].includes(intervalMs) || data?.series !== 'market:0' || data.aggregation !== 'last' || data.intervalMs !== intervalMs ||
      data.fromMs !== fromMs || data.toMs !== toMs || !integer(data.baseTimeMs) || data.baseTimeMs % intervalMs ||
      !integer(data.source?.asOfMs) || !Array.isArray(offsets) || offsets.length > Math.min(900,(toMs-fromMs)/intervalMs) ||
      !Array.isArray(prices) || prices.length !== offsets.length || !Array.isArray(gaps) || gaps.length > offsets.length + 1 ||
      gaps.some((g, i) => !integer(g) || g > offsets.length || i > 0 && g <= gaps[i - 1])) throw new Error('Invalid BTC history');
  const breaks = new Set(gaps);
  return offsets.map((offset, i) => {
    const time = data.baseTimeMs + offset, price = prices[i];
    if (!integer(offset) || offset % intervalMs || i > 0 && offset <= offsets[i - 1] ||
        !Number.isSafeInteger(time) || time < fromMs || time >= toMs || time > data.source.asOfMs ||
        !Number.isFinite(price) || price <= 0) throw new Error('Invalid BTC history point');
    return { time, price, intervalMs, gapBefore: breaks.has(i), kind: `${intervalMs < 1000 ? '125ms' : intervalMs === 1000 ? '1s' : '1m'} market observation` };
  });
}

export function mergePricePoints(history, live, retainMs = RETAIN_MS) {
  const byTime = new Map(history.map(p => [p.time, p]));
  for (const point of live) byTime.set(point.time, point);
  const sorted = [...byTime.values()].sort((a, b) => a.time - b.time);
  const cutoff = (sorted.at(-1)?.time ?? 0) - retainMs;
  return sorted.map((p, i) => ({ ...p,
    gapBefore: !!p.gapBefore || i > 0 && p.time - sorted[i - 1].time > Math.max(5000,(p.intervalMs??TICK_MS)*1.5,(sorted[i-1].intervalMs??TICK_MS)*1.5),
  })).filter(p => p.time >= cutoff);
}
