// Parse only successful exchange receipts from an RPC-confirmed FINAL transaction.
export function settlementRows(tx,exchange){
 if(tx.final_execution_status!=='FINAL'||!tx.transaction?.hash)return [];
 return (tx.receipts_outcome||[]).flatMap(receipt=>{
  const o=receipt.outcome;
  if(o?.executor_id!==exchange||!('SuccessValue' in o.status||'SuccessReceiptId' in o.status))return [];
  return o.logs.flatMap((log,logIndex)=>{
   if(!log.startsWith('EVENT_JSON:'))return [];
   const e=JSON.parse(log.slice(11));
   return e.standard==='purple_hands'&&e.event==='settled'?e.data.map(row=>({...row,hash:tx.transaction.hash,receiptId:receipt.id,logIndex,finalized:true})):[];
  });
 });
}
