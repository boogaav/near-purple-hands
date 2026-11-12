// A fill is independent of the market feed: never snap it to a nearby quote.
export function entryGuide(entry, view, range, {left, right, top, bottom}) {
  if (!entry || !Number.isFinite(entry.price) || entry.price <= 0 ||
      !Number.isFinite(entry.time) || entry.time <= 0 || !(view?.end > view?.start) ||
      !(range?.max > range?.min)) return null;
  const horizontal = entry.time < view.start ? 'before' : entry.time > view.end ? 'after' : null;
  const vertical = entry.price < range.min ? 'below' : entry.price > range.max ? 'above' : null;
  const x = left + (entry.time - view.start) / (view.end - view.start) * (right - left);
  const y = bottom - (entry.price - range.min) / (range.max - range.min) * (bottom - top);
  return {...entry, horizontal, vertical, x:Math.max(left,Math.min(right,x)), y:Math.max(top,Math.min(bottom,y))};
}

export function drawEntryMarker(ctx, guide, {left, right, top, bottom}, colors) {
  if (!guide) return;
  const {x,y,horizontal,vertical}=guide, outside=horizontal||vertical;
  colors={...colors,line:colors.entry||colors.line,rgb:colors.entryRgb||colors.rgb,tip:colors.entry||colors.tip};
  const price='$'+guide.price.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  const time=new Date(guide.time).toLocaleTimeString([], {hour12:false,hour:'2-digit',minute:'2-digit',second:'2-digit'});
  ctx.save();ctx.textBaseline='middle';ctx.textAlign='left';ctx.lineWidth=1;
  // Keep reference lines accurate; edge annotations are not pretend fills.
  ctx.strokeStyle=`rgba(${colors.rgb},.35)`;ctx.setLineDash([3,5]);
  if(!vertical){ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(right,y);ctx.stroke();}
  if(!horizontal){ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,bottom);ctx.stroke();}
  ctx.setLineDash([]);
  if(!outside){
    ctx.beginPath();ctx.arc(x,y,11,0,Math.PI*2);ctx.fillStyle=colors.liquidationBg;ctx.fill();
    ctx.strokeStyle=colors.line;ctx.lineWidth=1.5;ctx.stroke();
    ctx.beginPath();ctx.moveTo(x,y-5);ctx.lineTo(x+5,y);ctx.lineTo(x,y+5);ctx.lineTo(x-5,y);ctx.closePath();ctx.fillStyle='#fff';ctx.fill();
  }
  const arrow=(horizontal==='before'?'← ':horizontal==='after'?'→ ':'')+(vertical==='above'?'↑ ':vertical==='below'?'↓ ':'');
  const heading=arrow+'ENTRY '+price;
  ctx.font='bold 11px ui-monospace, SFMono-Regular, monospace';
  const width=Math.min(right-left,Math.max(ctx.measureText(heading).width,ctx.measureText(time).width)+20);
  const bx=Math.max(left,Math.min(right-width,x+17)), by=Math.max(top+2,Math.min(bottom-44,y-53));
  ctx.fillStyle=colors.liquidationBg;ctx.beginPath();ctx.roundRect(bx,by,width,42,7);ctx.fill();
  ctx.strokeStyle=`rgba(${colors.rgb},.4)`;ctx.lineWidth=1;ctx.stroke();
  ctx.fillStyle=colors.tip;ctx.fillText(heading,bx+10,by+14);
  ctx.font='10px ui-monospace, SFMono-Regular, monospace';ctx.fillStyle=colors.labels;ctx.fillText(time,bx+10,by+29);
  ctx.restore();
}
