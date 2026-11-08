import {readFile,writeFile,rename} from 'node:fs/promises';
const file='/data/history.json';
let history;
export async function advance(state,exchange){
  if(!history){
    try{history=JSON.parse(await readFile(file,'utf8'));}
    catch(e){if(e.code!=='ENOENT')throw e;history={height:0,hash:null,rows:[]};}
  }
  if(state.height<=history.height)return;
  let rows=history.rows;
  // next_id starts at one and only increases when an entry request is accepted.
  if(state.value.next_id!==1||history.rows.length){
    if(!history.height)throw Error('Missing deployment backfill checkpoint');
    const batch=[];
    let height=state.height,expected=state.hash;
    while(height>history.height){
      const r=await fetch('https://mainnet.neardata.xyz/v0/block/'+height,{signal:AbortSignal.timeout(12000)});
      if(!r.ok)throw Error('Archive unavailable');
      const block=await r.json(),header=block.block.header;
      if(header.hash!==expected||header.height!==height||!(header.prev_height<height))throw Error('Archive chain mismatch');
      for(const shard of block.shards) for(const record of shard.receipt_execution_outcomes){
        const {id,outcome}=record.execution_outcome;
        if(outcome.executor_id!==exchange||!('SuccessValue' in outcome.status||'SuccessReceiptId' in outcome.status))continue;
        for(const [i,log] of outcome.logs.entries()){
          if(!log.startsWith('EVENT_JSON:'))continue;
          const event=JSON.parse(log.slice(11));
          if(event.standard==='purple_hands'&&event.event==='settled'){
            if(!record.tx_hash)throw Error('Missing transaction provenance');
            for(const row of event.data)batch.push({...row,hash:record.tx_hash,blockHeight:height,receiptId:id,logIndex:i,finalized:true});
          }
        }
      }
      height=header.prev_height;expected=header.prev_hash;
    }
    if(expected!==history.hash)throw Error('Archive checkpoint mismatch');
    rows=batch.concat(rows);
  }
  const next={height:state.height,hash:state.hash,rows};
  await writeFile(file+'.tmp',JSON.stringify(next));await rename(file+'.tmp',file);history=next;
}
export function forOwner(owner){return {historyCoverage:{backfillComplete:Boolean(history?.height),indexedThroughBlock:history?.height||null},settlements:(history?.rows??[]).filter(row=>row.owner===owner)};}
