import { readFile } from 'node:fs/promises';

export async function fetchSignedBtc() {
  const key = (await readFile(new URL('../.local/pyth-api-key', import.meta.url), 'utf8')).trim();
  const response = await fetch('https://pyth-lazer.dourolabs.app/v1/latest_price', {
    method: 'POST',
    headers: {Authorization: 'Bearer '+key, 'Content-Type': 'application/json'},
    body: JSON.stringify({
      priceFeedIds: [1], channel: 'fixed_rate@200ms', formats: ['solana'],
      properties: ['price','publisherCount','exponent','confidence','marketSession','feedUpdateTimestamp'],
    }),
    signal: AbortSignal.timeout(6000),
  });
  if (!response.ok) throw Error('BTC oracle HTTP '+response.status);
  const {solana, parsed} = await response.json();
  const quote = parsed?.priceFeeds?.[0];
  if (!quote || quote.priceFeedId !== 1 || BigInt(quote.price) <= 0n) throw Error('BTC report unavailable');
  // Avoid paying test gas for ineligible reports. The contract independently checks signed bytes.
  if (BigInt(quote.confidence)*10000n > BigInt(quote.price)*15n) throw Error('BTC uncertainty exceeds 15 bps');
  if (!solana || !['base64','hex'].includes(solana.encoding)) throw Error('Missing signed BTC report');
  return Buffer.from(solana.data.replace(/^0x/,''),solana.encoding).toString('base64');
}
