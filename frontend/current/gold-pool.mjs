// Verified against issuer deployments and Monad mainnet on 2026-10-20.
export const GOLD_POOL = Object.freeze({
  chainId: 143,
  address: '0xa5c3a55af4029724f519ac8d340be9916ac83e45',
  token0: '0x01bff41798a0bcf287b996046ca68b395dbc1071', // XAUt0, 6 decimals
  token1: '0xe7cd86e13ac4309349f30b3435a9d337750fc82d', // USDT0, 6 decimals
  factory: '0x0bfbcf9fa4f9c56b0f40a671ad40e0805a091865',
  fee: 500,
  url: 'https://www.geckoterminal.com/monad/pools/0xa5c3a55af4029724f519ac8d340be9916ac83e45',
  explorer: 'https://monadscan.com/address/0xa5c3a55af4029724f519ac8d340be9916ac83e45',
});
// Pancake v3 includes two protocol-fee words; its signature differs from Uniswap.
export const SWAP_TOPIC = '0x19b47279256b2a23a1665c810c8d55a1758940ee09377d4f8d26497a3577dc83';
export const GOLD_STALE_MS = 15000;
export const hex = number => '0x' + number.toString(16);
const hashPattern = /^0x[0-9a-f]{64}$/i;
export function quantity(value) {
  if (typeof value !== 'string' || !/^0x[0-9a-f]+$/i.test(value)) throw new Error('Invalid chain quantity');
  const number = Number(BigInt(value));
  if (!Number.isSafeInteger(number) || number < 0) throw new Error('Invalid chain quantity');
  return number;
}
export function words(data, count) {
  if (typeof data !== 'string' || !new RegExp('^0x[0-9a-f]{' + count * 64 + '}$', 'i').test(data)) throw new Error('Invalid ABI data');
  return Array.from({ length: count }, (_, i) => BigInt('0x' + data.slice(2 + i * 64, 66 + i * 64)));
}
export function sqrtPriceToQuote(value, decimals0 = 6, decimals1 = 6) {
  const sqrt = BigInt(value);
  if (sqrt <= 0n || sqrt >= (1n << 160n)) throw new Error('Invalid pool price');
  // Square before conversion to retain precision; the UI ultimately uses IEEE doubles.
  const price = Number(sqrt * sqrt) / 2 ** 192 * 10 ** (decimals0 - decimals1);
  if (!Number.isFinite(price) || price <= 0) throw new Error('Invalid pool price');
  return price;
}
export function slotPrice(data) { return sqrtPriceToQuote(words(data, 7)[0]); }
export function parseBlock(raw, now = Date.now()) {
  const number = quantity(raw?.number), time = quantity(raw?.timestamp) * 1000;
  if (!hashPattern.test(raw?.hash) || time <= 0 || time > now + 5000) throw new Error('Invalid block');
  return { number, hash: raw.hash.toLowerCase(), time };
}
export function parseSwap(log) {
  if (log?.removed || log?.address?.toLowerCase() !== GOLD_POOL.address ||
      log.topics?.length !== 3 || log.topics[0]?.toLowerCase() !== SWAP_TOPIC ||
      !hashPattern.test(log.blockHash) || !hashPattern.test(log.transactionHash)) throw new Error('Invalid pool event');
  const data = words(log.data, 7);
  if (data[3] <= 0n || data[3] >= 1n << 128n) throw new Error('Pool has no active liquidity');
  return {
    id: log.blockHash.toLowerCase() + ':' + log.logIndex,
    block: quantity(log.blockNumber), index: quantity(log.logIndex),
    hash: log.blockHash.toLowerCase(), tx: log.transactionHash.toLowerCase(),
    price: sqrtPriceToQuote(data[2]),
    time: log.blockTimestamp ? quantity(log.blockTimestamp) * 1000 : null,
  };
}
export function orderedSwaps(logs, from, to) {
  if (!Array.isArray(logs)) throw new Error('Invalid event response');
  const unique = new Map();
  for (const log of logs) {
    const point = parseSwap(log);
    if (point.block < from || point.block > to) throw new Error('Event outside requested blocks');
    const key = point.block + ':' + point.index, previous = unique.get(key);
    if (previous && (previous.hash !== point.hash || previous.price !== point.price || previous.tx !== point.tx)) throw new Error('Conflicting chain events');
    unique.set(key, point);
  }
  return [...unique.values()].sort((a, b) => a.block - b.block || a.index - b.index);
}
export function poolQuote(price, block, now = Date.now(), lastSwapAt = null) {
  if (!Number.isFinite(price) || price <= 0) throw new Error('Invalid pool quote');
  return { price, time: block.time, receivedAt: now, block: block.number, blockHash: block.hash,
    source: 'monad-pool', maxAge: GOLD_STALE_MS, lastSwapAt };
}
