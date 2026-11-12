// The bee stays anchored to the observed price; only its wings animate.
export function drawPriceBee(ctx,x,y,{now=0,live=false,reducedMotion=false}={}){
 const flap=live&&!reducedMotion?Math.sin(now/100*Math.PI*2)*.35:0;
 ctx.save();ctx.translate(x,y);ctx.lineWidth=2;ctx.strokeStyle='#171b21';
 if(live){const glow=ctx.createRadialGradient(0,0,5,0,0,36);glow.addColorStop(0,'rgba(255,212,34,.3)');glow.addColorStop(1,'rgba(255,212,34,0)');ctx.fillStyle=glow;ctx.beginPath();ctx.arc(0,0,36,0,Math.PI*2);ctx.fill();}
 for(const side of [-1,1]){ctx.save();ctx.translate(-3,-8);ctx.rotate(side*(.5+flap));ctx.fillStyle=live?'#e2f7ff':'#b5bcc0';ctx.beginPath();ctx.ellipse(side*4,-6,6,10,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore();}
 ctx.fillStyle='#171b21';ctx.beginPath();ctx.moveTo(-15,-3);ctx.lineTo(-23,0);ctx.lineTo(-15,4);ctx.closePath();ctx.fill();
 ctx.fillStyle=live?'#ffcd16':'#8a8c90';ctx.beginPath();ctx.ellipse(0,0,17,12,0,0,Math.PI*2);ctx.fill();ctx.stroke();
 ctx.save();ctx.beginPath();ctx.ellipse(0,0,17,12,0,0,Math.PI*2);ctx.clip();ctx.fillStyle='#25272c';ctx.fillRect(-11,-14,5,28);ctx.fillRect(-1,-14,5,28);ctx.restore();
 ctx.fillStyle=live?'#ffcd16':'#8a8c90';ctx.beginPath();ctx.arc(13,-2,9,0,Math.PI*2);ctx.fill();ctx.stroke();
 ctx.beginPath();ctx.moveTo(10,-10);ctx.lineTo(8,-17);ctx.moveTo(16,-10);ctx.lineTo(19,-16);ctx.stroke();
 ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(17,-4,4,5,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#171b21';ctx.beginPath();ctx.arc(18,-3,2,0,Math.PI*2);ctx.fill();ctx.restore();
}
