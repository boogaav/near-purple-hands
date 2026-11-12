import { GOLD_POOL } from './gold-pool.mjs';

export const SOURCES = Object.freeze({
  monad: { name: 'Monad pool', markets: ['gold'] },
  hyperliquid: { name: 'Hyperliquid', markets: ['gold', 'bitcoin'] },
  chainlink: { name: 'Chainlink', markets: ['gold', 'bitcoin'] },
});
export const HYPER_COINS = Object.freeze({ gold: 'xyz:GOLD', bitcoin: 'BTC' });
export const CHAINLINK_FEEDS = Object.freeze({
  gold: { address: '0x214eD9Da11D2fbe465a6fc601a91E62EbEc1a0D6', decimals: 8, heartbeat: 86400, threshold: .3, slug: 'xau-usd' },
  bitcoin: { address: '0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c', decimals: 8, heartbeat: 3600, threshold: .5, slug: 'btc-usd' },
});
export function sourceForMarket(source, market) {
  return SOURCES[source]?.markets.includes(market) ? source : 'hyperliquid';
}
export function feedMeta(source, market) {
  const asset = market === 'gold' ? 'Gold' : 'Bitcoin';
  if (source === 'monad') return {
    name: 'Monad pool', pair: 'XAUt0 / USDT0', unit: 'USDT0', badge: 'MONAD · ONCHAIN GOLD',
    units: 'USDT0 per XAUt0', link: GOLD_POOL.url, linkLabel: 'PancakeSwap v3 · Monad ↗',
    caption: 'Finalized swaps · last hour', loading: 'Loading chain history…',
    note: 'Pool swaps · recovery every 3s', windowMs: 3600000, step: true,
  };
  if (source === 'hyperliquid') return {
    name: 'Hyperliquid', pair: (market === 'gold' ? 'GOLD' : 'BTC') + ' / USDC · perp mid', unit: 'USDC',
    badge: 'HYPERLIQUID · ' + asset.toUpperCase(), units: 'USDC · order-book mid',
    link: 'https://app.hyperliquid.xyz/trade/' + HYPER_COINS[market], linkLabel: 'Hyperliquid · ' + HYPER_COINS[market] + ' ↗',
    caption: '1m trade closes + live mid', loading: 'Loading market history…',
    note: 'Live order book · WebSocket', windowMs: 3600000, step: false,
  };
  return {
    name: 'Chainlink', pair: (market === 'gold' ? 'XAU' : 'BTC') + ' / USD · oracle', unit: 'USD',
    badge: 'CHAINLINK · ' + asset.toUpperCase(), units: 'USD · Ethereum oracle',
    link: 'https://data.chain.link/feeds/ethereum/mainnet/' + CHAINLINK_FEEDS[market].slug,
    linkLabel: 'Chainlink · Ethereum ↗', caption: 'Oracle rounds · last 48h', loading: 'Loading oracle history…',
    note: 'Reference oracle · not a tick stream', windowMs: 172800000, step: true,
  };
}
