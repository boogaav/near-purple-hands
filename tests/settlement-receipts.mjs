import {test} from 'node:test';import assert from 'node:assert/strict';import {settlementRows} from '../mainnet/service/settlements.mjs';
test('only successful exchange receipts from FINAL transactions produce results',()=>{
 const tx={final_execution_status:'FINAL',transaction:{hash:'hash'},receipts_outcome:[{id:'receipt',outcome:{executor_id:'exchange.near',status:{SuccessValue:''},logs:['EVENT_JSON:'+JSON.stringify({standard:'purple_hands',event:'settled',data:[{id:1,owner:'a.near',net:120000}]})]}}]};
 assert.equal(settlementRows(tx,'exchange.near')[0].net,120000);
 assert.deepEqual(settlementRows({...tx,final_execution_status:'EXECUTED'},'exchange.near'),[]);
 assert.deepEqual(settlementRows(tx,'other.near'),[]);
 tx.receipts_outcome[0].outcome.status={Failure:{}};assert.deepEqual(settlementRows(tx,'exchange.near'),[]);
});
