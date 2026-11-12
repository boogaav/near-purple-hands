const svg=path=>`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg>`;
const icons={entry:svg('M12 3v12 M8 11l4 4 4-4 M5 17v4h14v-4'),exit:svg('M12 15V3 M8 7l4-4 4 4 M5 17v4h14v-4'),liquidation:svg('M6 6l12 12 M18 6L6 18')};
const price=v=>'$'+v.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
export function pnlLabel(raw){
  if(!/^-?\d+$/.test(String(raw)))return null;
  const n=BigInt(raw),abs=n<0n?-n:n,sign=n>0n?'+':n<0n?'−':'';
  if(abs>0n&&abs<10000n)return sign+'<$0.01';
  const cents=(abs+5000n)/10000n;
  return sign+'$'+(cents/100n).toLocaleString('en-US')+'.'+String(cents%100n).padStart(2,'0');
}
export function groupPnl(items){
  const exits=items.filter(m=>m.kind==='exit'||m.kind==='liquidation');
  if(!exits.length||exits.some(m=>!/^\-?\d+$/.test(String(m.netRaw))))return null;
  const net=exits.reduce((sum,m)=>sum+BigInt(m.netRaw),0n);
  return {text:(exits.length>1?'Σ ':'')+pnlLabel(net),tone:net>0n?'profit':net<0n?'loss':'flat',count:exits.length};
}
const label=m=>`${m.kind==='entry'?'Entry':m.kind==='liquidation'?'Liquidated':'Exit'} · ${m.side} · ${price(m.price)} · ${new Date(m.time).toLocaleString([], {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false})}${m.kind!=='entry'&&pnlLabel(m.netRaw)!==null?' · Net P&L '+pnlLabel(m.netRaw):''}`;
export function timelineGroups(markers,view,left,right){
  if(!view||view.end<=view.start)return [];
  const groups=[];
  for(const m of markers.filter(m=>m.time>=view.start&&m.time<=view.end).sort((a,b)=>a.time-b.time)){
    const x=left+(m.time-view.start)/(view.end-view.start)*(right-left),last=groups.at(-1);
    const badge=last&&groupPnl(last.items),space=badge?48+badge.text.length*7:32;
    if(last&&x-last.x<space)last.items.push({...m,x});
    else groups.push({x,items:[{...m,x}]});
  }
  return groups;
}
export const TRADE_TIMELINE_CSS=`
#purple-hands-play .yh-chart-trades{position:absolute;inset:0;pointer-events:none;z-index:2}
#purple-hands-play .yh-chart-fill{position:absolute;transform:translate(-50%,-50%);width:36px;height:36px;padding:6px;border:0;background:none;color:var(--p-accent,#f0b90b);pointer-events:auto;cursor:pointer;border-radius:50%}
#purple-hands-play .yh-chart-fill span{display:flex;align-items:center;justify-content:center;width:24px;height:24px;border:1px solid currentColor;border-radius:50%;background:#181a20}
#purple-hands-play .yh-chart-fill[data-kind=exit]{color:#30d5a0}
#purple-hands-play .yh-chart-fill[data-kind=liquidation]{color:#ff6685}
#purple-hands-play .yh-chart-fill svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
#purple-hands-play .yh-chart-fill:is(:hover,:focus-visible,[aria-expanded=true]){outline:1px solid currentColor;background:#ffffff12}
#purple-hands-play .yh-chart-fill small{position:absolute;right:-1px;top:-2px;background:#343941;color:white;border-radius:8px;padding:1px 4px;font:9px system-ui}
#purple-hands-play .yh-chart-fill .yh-exit-pnl{position:absolute;left:35px;top:9px;white-space:nowrap;font:700 11px/18px ui-monospace,monospace;padding:0 5px;border-radius:5px;background:#181a20e8;color:#b7bdc6}
#purple-hands-play .yh-chart-fill .yh-exit-pnl[data-tone=profit]{color:#30d5a0}
#purple-hands-play .yh-chart-fill .yh-exit-pnl[data-tone=loss]{color:#ff6685}
#purple-hands-play .yh-chart-fill[data-edge=true] .yh-exit-pnl{left:auto;right:6px;top:-16px}
#purple-hands-play .yh-trade-detail{position:absolute;left:8px;bottom:84px;width:min(350px,calc(100% - 16px));max-height:150px;overflow:auto;pointer-events:auto;box-sizing:border-box;padding:12px;background:#202329f5;border:1px solid #616773;border-radius:12px;box-shadow:0 8px 30px #0005;color:#eaecef;font:12px/1.6 system-ui}
#purple-hands-play .yh-trade-detail[hidden]{display:none}
#purple-hands-play .yh-trade-detail header{display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;font-weight:700}
#purple-hands-play .yh-trade-detail button{background:none;border:0;color:inherit;font-size:20px;width:28px;height:28px;cursor:pointer}
#purple-hands-play .yh-trade-detail p{margin:4px 0;font-size:11px;color:#eaecef}
#purple-hands-play .yh-chart-trade-key{color:var(--p-dim,#b7bdc6);font:9px system-ui;letter-spacing:0;pointer-events:none}
`;
export class ChartTradeTimeline {
  constructor(chart){
    this.chart=chart;this.markers=[];this.nodes=new Map();
    this.layer=document.createElement('div');this.layer.className='yh-chart-trades';
    this.layer.setAttribute('role','group');this.layer.setAttribute('aria-label','Your confirmed trade entries and exits');
    this.key=document.createElement('span');this.key.className='yh-chart-trade-key';
    this.detail=document.createElement('section');this.detail.className='yh-trade-detail';this.detail.hidden=true;this.detail.setAttribute('aria-label','Trade execution details');
    const header=document.createElement('header');header.textContent='Confirmed onchain';
    const close=document.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label','Close trade details');close.onclick=e=>{e.stopPropagation();const b=this.nodes.get(this.selected)?.button;b?.focus();this.hide();};
    header.append(close);this.rows=document.createElement('div');const note=document.createElement('p');note.textContent='Net P&L includes protocol fees. Network gas excluded.';this.detail.append(header,this.rows,note);
    this.layer.append(this.detail);chart.canvas.parentElement.append(this.layer);
    chart.duration.before(this.key);
    this.layer.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();this.hide();}});
    chart.canvas.addEventListener('pointerdown',()=>this.hide());
  }
  set(markers,status){
    this.markers=markers;this.status=status;
    this.key.textContent=status==='loading'?'Loading trades…':status==='unavailable'||status==='partial'?'Trades syncing…':markers.length?'↓ Entry · ↑ Exit':'';
    const valid=new Set(markers.map(m=>m.id));
    for(const [id,node] of this.nodes)if(node.items.some(m=>!valid.has(m.id))){node.button.remove();this.nodes.delete(id);if(this.selected===id)this.hide();}
    this.layer.hidden=!status&&!markers.length;this.key.hidden=this.layer.hidden;
  }
  hide(){this.selected=null;this.pinned=false;this.detail.hidden=true;this.chart.wake();for(const n of this.nodes.values())n.button.setAttribute('aria-expanded','false');}
  show(node,pinned=false){
    this.hide();this.selected=node.id;this.pinned=pinned;node.button.setAttribute('aria-expanded','true');
    this.rows.replaceChildren(...node.items.map(m=>{const p=document.createElement('p');p.textContent=label(m);return p;}));this.detail.hidden=false;
    this.chart.pointer=null;this.chart.tooltip.hidden=true;
  }
  draw(ctx,view,range,bounds,colors){
    const {left,right,top,bottom}=bounds,canvas=this.chart.canvas;
    const groups=timelineGroups(this.markers,view,left,right),keep=new Set();
    const lane=this.chart.height-42,offsetLeft=canvas.offsetLeft,offsetTop=canvas.offsetTop;
    ctx.save();ctx.strokeStyle=`rgba(${colors.rgb},.16)`;ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(left,lane);ctx.lineTo(right,lane);ctx.stroke();
    for(const group of groups){
      const id=group.items.map(m=>m.id).join('|');keep.add(id);let node=this.nodes.get(id);
      if(!node){
        const button=document.createElement('button');button.type='button';button.className='yh-chart-fill';
        const kind=group.items.find(m=>m.kind==='exit'||m.kind==='liquidation')?.kind??'entry';button.dataset.kind=kind;
        button.innerHTML='<span>'+icons[kind]+'</span>'+(group.items.length>1?'<small>'+group.items.length+'</small>':'');
        const pnl=groupPnl(group.items);
        if(pnl){const badge=document.createElement('b');badge.className='yh-exit-pnl';badge.textContent=pnl.text;badge.dataset.tone=pnl.tone;badge.title=(pnl.count>1?'Combined net P&L for '+pnl.count+' exits':'Realized net P&L')+' · protocol fees included, gas excluded';button.append(badge);}
        node={id,button,items:group.items};this.nodes.set(id,node);this.layer.append(button);
        button.setAttribute('aria-label',group.items.length>1?`${group.items.length} trade events. ${group.items.map(label).join('; ')}`:label(group.items[0]));
        button.setAttribute('aria-expanded','false');
        button.onclick=e=>{e.stopPropagation();this.selected===id&&this.pinned?this.hide():this.show(node,true);};
        button.onpointerenter=e=>{if(e.pointerType==='mouse'&&!this.pinned)this.show(node);};
        button.onpointerleave=()=>{if(!this.pinned)this.hide();};
        button.onfocus=()=>{if(!this.pinned)this.show(node);};
        button.onblur=()=>{if(!this.pinned)this.hide();};
      }
      node.items=group.items;
      const pnl=groupPnl(group.items);node.button.dataset.edge=String(!!pnl&&group.x+48+pnl.text.length*7>this.chart.width-8);
      node.button.style.left=(offsetLeft+group.x)+'px';node.button.style.top=(offsetTop+lane)+'px';
      for(const m of group.items){
        const py=bottom-(m.price-range.min)/(range.max-range.min)*(bottom-top);
        if(py<top||py>bottom)continue;
        const color=m.kind==='entry'?(colors.entry||colors.line):m.kind==='exit'?'#30d5a0':'#ff6685';
        ctx.strokeStyle=color;ctx.globalAlpha=this.selected===id ? .7 : .22;ctx.setLineDash([2,4]);ctx.beginPath();ctx.moveTo(m.x,py);ctx.lineTo(m.x,lane-14);ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1;
        ctx.fillStyle=colors.ink;ctx.beginPath();ctx.arc(m.x,py,4,0,Math.PI*2);ctx.fill();ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.stroke();
      }
    }
    ctx.restore();
    for(const [id,node] of this.nodes)if(!keep.has(id)){node.button.remove();this.nodes.delete(id);if(this.selected===id)this.hide();}
  }
}
