import {grossResult} from './state.mjs';
export function livePriceE6(market,now=Date.now()){
 const q=market?.quote;
 if(!q||!Number.isFinite(q.chartPrice)||q.chartPrice<=0||!Number.isFinite(q.time)||!Number.isFinite(q.receivedAt)||now-q.time>5000||q.time-now>5000||now-q.receivedAt>5000)return null;
 const price=Math.round(q.chartPrice*1e6);return Number.isSafeInteger(price)&&price>0?price:null;
}
export function livePnl(position,market,now=Date.now()){
 const price=livePriceE6(market,now);
 return position?.entry&&price!==null?grossResult(position,price):null;
}
export function exitReference(state,market,now=Date.now()){
 const price=livePriceE6(market,now)??state?.engine?.price;
 if(!Number.isSafeInteger(price)||price<=0)throw Error('Waiting for a BTC price to set exit limits.');
 return BigInt(price);
}
export function orderProgress(attempt,position,height,now=Date.now()){
 const elapsed=attempt?Math.max(0,Math.floor((now-attempt.started)/1000)):null;
 if(position?.close)return {step:2,title:height>position.close.until?'Exit request expired · retry EXIT':'Exit requested · verifying settlement price',active:height<=position.close.until,elapsed};
 if(position&&!position.entry)return {step:2,title:height>position.open.until?'Entry expired · cancel to release funds':'Order accepted · waiting for verified fill',active:height<=position.open.until,elapsed};
 if(attempt?.phase==='failed'||attempt?.phase==='unknown')return {step:1,title:attempt.phase==='failed'?'Order not submitted':'Confirmation unknown · check History before retrying',active:false,elapsed};
 if(attempt?.phase==='checking')return {step:0,title:'Checking your order…',active:true,elapsed};
 if(attempt?.phase==='sending')return {step:1,title:attempt.wallet?'Confirm your order in Meteor':'Submitting to NEAR…',active:true,elapsed};
 if(attempt?.phase==='accepted'&&attempt.method==='request_open'&&!position)return {step:2,title:'Request confirmed · checking fill status',active:true,elapsed};
 if(attempt?.phase==='accepted'&&attempt.method==='request_close'&&position)return {step:2,title:'Exit confirmed · checking settlement',active:true,elapsed};
 return null;
}
