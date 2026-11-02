// Public free testnet endpoint from https://docs.near.org/api/rpc/providers.
export const TESTNET_RPC = "https://test.rpc.fastnear.com";
export function paceRpc(provider) {
  const send = provider.sendJsonRpc.bind(provider);
  let queue = Promise.resolve(),
    last = 0;
  provider.sendJsonRpc = (method, params) => {
    const task = queue
      .catch(() => {})
      .then(async () => {
        await new Promise((r) =>
          setTimeout(r, Math.max(0, 350 - (Date.now() - last))),
        );
        for (let attempt = 0; ; attempt++) {
          last = Date.now();
          try {
            return await send(method, params);
          } catch (e) {
            // A provider's explicit HTTP 429 rejects the request; bounded backoff respects its limit.
            if (
              attempt >= 4 ||
              !(
                e.cause === 429 ||
                /rate limits|rate.limit|\b429\b/i.test(e.message)
              )
            )
              throw e;
            await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
          }
        }
      });
    queue = task;
    return task;
  };
  return provider;
}
