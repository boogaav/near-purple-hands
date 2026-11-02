export function priceFromTicker(p, now) {
 const timestamp=Math.floor(Date.parse(p.time)/1000), price=Number(p.price), bid=Number(p.bid), ask=Number(p.ask);
 if(!Number.isFinite(timestamp) || now-timestamp>10 || timestamp>now+2) throw Error('Stale BTC quote');
 if(!Number.isFinite(price)||price<=0||price>1e6||!Number.isFinite(bid)||!Number.isFinite(ask)||bid<=0||ask<bid||(ask-bid)/price>.002||Math.abs(price-(bid+ask)/2)/price>.002) throw Error('Unreliable BTC quote');
 return {price:String(Math.round(price*1e6)),timestamp};
}
export function keeperAction(p, s, height, now) {
  const fresh = now - s.price_at <= 15;
  const inWindow = r => r && height >= r.from && height <= r.until && s.price >= r.min && s.price <= r.max;
  if (!p.entry) return height > p.open.until ? 'cancel_open' : fresh && inWindow(p.open) ? 'fill_open' : null;
  const magnitude = Math.abs(s.price-p.entry) * p.leverage / p.entry;
  if (fresh && (magnitude >= .8 || now >= p.opened_at + 86400 || inWindow(p.close))) return 'settle';
  return null;
}
