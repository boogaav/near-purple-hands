import {confirmedResult} from './result.mjs';
// Optional presentation only. Never await it on the transaction path.
export function nearChemistry(panel){
 let position=null,active=false,filled=null;
 const call=(method,value)=>{try{panel?.[method]?.(value);}catch{}};
 const trade=p=>({isLong:p.long,entryPrice:p.entry/1e6,margin:p.margin/1e6,leverage:p.leverage});
 const cancel=()=>{if(active)call('reset');active=false;position=null;filled=null;};
 return {
  start(t){cancel();active=true;call('start',t);},
  cancel,
  sync(state){
   const p=state?.position;
   if(p){
    position={...p,owner:state.owner};
    if(p.entry&&filled!==p.id){call('reset');call('start',trade(p));active=true;filled=p.id;}
    return;
   }
   if(!position||!active)return;
   const result=confirmedResult(position,state?.service?.settlements);
   if(!result)return;
   // A trade can fill and close between reads. Use its verified entry before ending.
   if(filled!==position.id){call('reset');call('start',trade({...position,entry:result.entry}));}
   call('end',result.net/1e6);active=false;position=null;filled=null;
  },
  destroy(){call('destroy');active=false;position=null;}
 };
}
