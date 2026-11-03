// Separate public read-only endpoint: keep chart traffic away from transaction RPC.
const CHART_RPC = 'https://testnet-rpc.intea.rs';
export function createBlockFeed(exchange) {
 const clients=new Set(), points=[];
 let running=false, failure=null, lastSuccess=0;
 const rpc=async(method,params)=>{
  const r=await fetch(CHART_RPC,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:'chart',method,params}),signal:AbortSignal.timeout(8000)});
  if(!r.ok)throw Error(`Block feed HTTP ${r.status}`);
  const d=await r.json();if(d.error)throw Error(d.error.message||'Block feed RPC error');return d.result;
 };
 const emit=(name,data)=>{for(const res of clients){if(!res.write(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`)){clients.delete(res);res.end();}}};
 async function cycle(){
  if(!clients.size){running=false;return;}
  try {
   const head=await rpc('block',{finality:'final'});
   const previous=points.at(-1)?.block;
   const start=previous ? Math.max(previous+1,head.header.height-29) : head.header.height-11;
   const heights=Array.from({length:Math.max(0,head.header.height-start+1)},(_,i)=>start+i);
   // Bounded parallel reads keep up with subsecond blocks on higher-latency public RPCs.
   for(let offset=0;offset<heights.length;offset+=8){
    const batch=await Promise.all(heights.slice(offset,offset+8).map(async height=>{
     let b;
     try {b=height===head.header.height?head:await rpc('block',{block_id:height});}
     catch(e){if(/unknown block|UNKNOWN_BLOCK/i.test(e.message))return null;throw e;}
     const h=b.header;
     const q=await rpc('query',{request_type:'call_function',account_id:exchange,method_name:'get_state',args_base64:'e30=',block_id:h.hash});
     const s=JSON.parse(Buffer.from(q.result).toString());
     return {block:h.height,hash:h.hash,t:Number(h.timestamp_nanosec)/1e9,p:s.price,priceAt:s.price_at};
    }));
    for(const point of batch){
     if(!point||!Number.isSafeInteger(point.p)||point.p<=0)continue;
     points.push(point);if(points.length>240)points.shift();emit('block',point);
    }
   }
   failure=null;lastSuccess=Date.now();emit('health',{ok:true,at:lastSuccess});
  }catch(e){failure=e.message;emit('health',{ok:false,error:failure});}
  setTimeout(cycle,failure?3000:400);
 }
 return {subscribe(req,res){
  res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});
  res.write(`event: history\ndata: ${JSON.stringify(points)}\n\n`);
  clients.add(res);
  const ping=setInterval(()=>res.write(': heartbeat\n\n'),15000);
  req.on('close',()=>{clients.delete(res);clearInterval(ping);});
  if(!running){running=true;void cycle();}
 }, status:()=>({points:points.length,lastBlock:points.at(-1)?.block,lastSuccess,error:failure})};
}
