// Original yellow bird marker. Its centre stays on the actual chart point:
// only the wing and halo animate, never the quoted price or the bird's height.
export function drawPriceBird(ctx, x, y, {now=0, live=false, reducedMotion=false}={}) {
  const moving=live&&!reducedMotion, beat=moving?(Math.sin(now/1200*Math.PI*2)+1)/2:.35;
  ctx.save();ctx.translate(x,y);
  if(live){
    const glow=ctx.createRadialGradient(0,0,5,0,0,34+beat*5);
    glow.addColorStop(0,'rgba(255,212,34,.24)');glow.addColorStop(1,'rgba(255,212,34,0)');
    ctx.fillStyle=glow;ctx.beginPath();ctx.arc(0,0,40,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='rgba(255,217,70,'+(.18+beat*.2)+')';ctx.lineWidth=1;
    ctx.beginPath();ctx.arc(0,0,23+beat*4,0,Math.PI*2);ctx.stroke();
  }
  ctx.lineWidth=2.2;ctx.strokeStyle='#171b21';ctx.lineJoin='round';
  ctx.fillStyle=live?'#ffcd16':'#8a8c90';
  ctx.beginPath();ctx.moveTo(-13,-3);ctx.lineTo(-21,-8);ctx.lineTo(-19,4);ctx.lineTo(-12,6);ctx.fill();ctx.stroke();
  ctx.beginPath();ctx.ellipse(0,0,16,13,0,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.fillStyle=live?'#fff2b3':'#c0c1c4';ctx.beginPath();ctx.ellipse(1,5,10,6,0,0,Math.PI*2);ctx.fill();
  ctx.save();ctx.translate(-7,1);ctx.rotate(moving?Math.sin(now/240*Math.PI*2)*.25:0);
  ctx.fillStyle=live?'#f5a900':'#73767b';ctx.beginPath();ctx.ellipse(0,0,9,5,-.25,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore();
  ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(8,-5,6,7,0,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.fillStyle='#171b21';ctx.beginPath();ctx.arc(10,-4,2,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=live?'#ff8d36':'#999';ctx.beginPath();ctx.moveTo(13,1);ctx.lineTo(23,4);ctx.lineTo(13,7);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.restore();
}
