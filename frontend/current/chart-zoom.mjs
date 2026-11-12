// Chart magnification only. These values never enter an order or position.
export const CHART_ZOOMS = Object.freeze({
  1: Object.freeze({factor:1,spanMs:90000,label:'90s',intervalMs:125,tileMs:60000,maxTiles:3}),
  10: Object.freeze({factor:10,spanMs:900000,label:'15m',intervalMs:1000,tileMs:900000,maxTiles:2}),
  100: Object.freeze({factor:100,spanMs:9000000,label:'2h 30m',intervalMs:60000,tileMs:21600000,maxTiles:2}),
  1000: Object.freeze({factor:1000,spanMs:90000000,label:'25h',intervalMs:60000,tileMs:21600000,maxTiles:6}),
});
export function chartZoom(factor) {
  if (![1,10,100,1000].includes(factor)) throw new Error('Unsupported chart zoom');
  return CHART_ZOOMS[factor];
}
