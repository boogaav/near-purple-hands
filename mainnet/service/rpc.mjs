const endpoints=['https://free.rpc.fastnear.com','https://near.drpc.org'];
let preferred=0;
export async function queryNear(params){
  for(let offset=0;offset<endpoints.length;offset++){
    const index=(preferred+offset)%endpoints.length;
    const url=endpoints[index];
    try {
      const response=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'query',params}),signal:AbortSignal.timeout(2500)});
      const data=await response.json();
      if(!response.ok||!data.result?.block_hash)continue;
      preferred=index;
      return {result:data.result,url};
    }catch{}
  }
  throw Error('Both NEAR RPC providers unavailable');
}
