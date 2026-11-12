// Viewport-only navigation: never changes a quote, order, margin or leverage.
export const DEFAULT_SPAN = 90000, MIN_SPAN = 15000, MAX_SPAN = 90000000;
const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
export const viewEnd = (view, clock) => view.end ?? clock + view.span * .15;
export function constrainView(view, clock) {
  const span = clamp(Number.isFinite(view.span) ? view.span : DEFAULT_SPAN, MIN_SPAN, MAX_SPAN);
  if (view.end == null) return {span, end:null};
  const liveEnd = clock + span * .15;
  const end = clamp(view.end, clock - MAX_SPAN + span, liveEnd);
  return {span, end: end >= liveEnd - 1 ? null : end};
}
export function zoomView(view, clock, factor, fraction = .5) {
  if (!Number.isFinite(factor) || factor <= 0) return view;
  const span = clamp(view.span * factor, MIN_SPAN, MAX_SPAN), f = clamp(fraction,0,1);
  const anchor = viewEnd(view,clock) - view.span * (1-f);
  return constrainView({span, end:anchor + span * (1-f)},clock);
}
export function panView(view, clock, deltaFraction) {
  return constrainView({span:view.span,end:viewEnd(view,clock)-deltaFraction*view.span},clock);
}
export function historyTier(view, clock) {
  const coverage = Math.max(view.span, clock - (viewEnd(view,clock)-view.span));
  return coverage <= 90000 ? 1 : coverage <= 900000 ? 10 : coverage <= 9000000 ? 100 : 1000;
}
export function spanLabel(span) {
  if (span < 60000) return Math.round(span/1000)+'s';
  if (span < 3600000) return (span/60000).toFixed(span<600000?1:0).replace(/\.0$/,'')+'m';
  return (span/3600000).toFixed(1).replace(/\.0$/,'')+'h';
}
export const navigationControls = (demo=false) => `<div class="p-chart-navigation"><span class="p-chart-gesture-hint">Scroll / pinch to zoom · drag to explore</span><button type="button" data-chart-reset aria-label="${demo?'Reset demo chart':'Return chart to live prices'}" title="${demo?'Reset chart':'Return to live'} · double-click or press Home">${demo?'RESET':'↗ LIVE'}</button></div>`;
export const NAVIGATION_CSS = `.p-chart-navigation{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0 7px 4px;min-height:30px}.p-chart-gesture-hint{color:#b9a0d3;font:9px/1.3 Arial,sans-serif}.p-chart-navigation button{min-height:30px!important;padding:5px 10px!important;border:1px solid #bd9aff40!important;border-radius:8px!important;color:#c9b0ee!important;background:#160c3066!important;font:650 9px/1 Arial,sans-serif!important;cursor:pointer}.p-chart-navigation button[data-following=true]{color:#e3d4ff!important;border-color:#bd9aff20!important}.p-chart-navigation button:hover{background:#bd9aff26!important}.p-chart-navigation button:focus-visible,[data-chart-interactive]:focus-visible{outline:2px solid #d5ff70!important;outline-offset:2px}[data-chart-interactive]{touch-action:none!important;user-select:none;cursor:grab;overflow:hidden}[data-chart-interactive][data-dragging=true]{cursor:grabbing}@media(max-width:650px){.p-chart-gesture-hint{font-size:8px}.p-chart-navigation button{min-height:36px!important}}`;

export class ChartNavigation {
  constructor(element,{clock=Date.now,plot=()=>({left:8,width:Math.max(1,element.getBoundingClientRect().width-84)}),onChange=()=>{},resetButton}={}) {
    this.element=element;this.clock=clock;this.plot=plot;this.onChange=onChange;this.resetButton=resetButton;
    this.view={span:DEFAULT_SPAN,end:null};this.pointers=new Map();this.controller=new AbortController();
    element.setAttribute('data-chart-interactive','');element.setAttribute('tabindex','0');
    element.setAttribute('aria-keyshortcuts','+ - ArrowLeft ArrowRight Home');
    element.setAttribute('aria-description','Scroll or pinch to zoom. Drag to explore. Arrow keys pan; +/− zoom; Home resets.');
    const listen=(target,type,fn,options={})=>target?.addEventListener(type,fn,{...options,signal:this.controller.signal});
    listen(element,'wheel',e=>{
      e.preventDefault();const unit=e.deltaMode===1?16:e.deltaMode===2?element.getBoundingClientRect().height:1;
      const {width}=this.plot();
      if(e.shiftKey||Math.abs(e.deltaX)>Math.abs(e.deltaY))this.set(panView(this.view,this.clock(),-(e.deltaX||e.deltaY)*unit/width));
      else this.set(zoomView(this.view,this.clock(),Math.exp(clamp(e.deltaY*unit,-400,400)*.003),this.fraction(e.clientX)));
    },{passive:false});
    listen(element,'pointerdown',e=>{
      if(e.pointerType==='mouse'&&e.button!==0)return;
      element.setPointerCapture(e.pointerId);element.focus({preventScroll:true});
      this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});this.rebase();
      element.setAttribute('data-dragging','true');
    });
    listen(element,'pointermove',e=>{
      if(!this.pointers.has(e.pointerId))return;
      this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const points=[...this.pointers.values()],clock=this.clock();
      if(points.length>=2){
        const mid=(points[0].x+points[1].x)/2, distance=Math.max(1,Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y));
        const zoomed=zoomView(this.gesture.view,this.gesture.clock,this.gesture.distance/distance,this.fraction(this.gesture.mid));
        this.set(panView(zoomed,clock,(mid-this.gesture.mid)/this.plot().width));
      }else this.set(panView(this.gesture.view,this.gesture.clock,(points[0].x-this.gesture.mid)/this.plot().width));
    });
    const end=e=>{
      this.pointers.delete(e.pointerId);
      if(element.hasPointerCapture?.(e.pointerId))element.releasePointerCapture(e.pointerId);
      this.rebase();element.setAttribute('data-dragging',String(this.pointers.size>0));
    };
    listen(element,'pointerup',end);listen(element,'pointercancel',end);listen(element,'lostpointercapture',end);
    listen(element,'dblclick',()=>this.reset());
    listen(element,'keydown',e=>{
      if(e.altKey||e.ctrlKey||e.metaKey)return;
      const clock=this.clock();let view;
      if(e.key==='Home'){e.preventDefault();this.reset();return;}
      if(e.key==='+'||e.key==='=')view=zoomView(this.view,clock,.8);
      if(e.key==='-'||e.key==='_')view=zoomView(this.view,clock,1.25);
      if(e.key==='ArrowLeft')view=panView(this.view,clock,.2);
      if(e.key==='ArrowRight')view=panView(this.view,clock,-.2);
      if(view){e.preventDefault();this.set(view);}
    });
    listen(resetButton,'click',()=>this.reset());this.sync();
  }
  fraction(clientX){const rect=this.element.getBoundingClientRect(),plot=this.plot();return clamp((clientX-rect.left-plot.left)/plot.width,0,1);}
  rebase(){const points=[...this.pointers.values()];if(!points.length)return;this.gesture={view:{...this.view},clock:this.clock(),mid:points.length>1?(points[0].x+points[1].x)/2:points[0].x,distance:points.length>1?Math.max(1,Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y)):1};}
  set(view){this.view=view;this.sync();this.onChange(view);}
  sync(){this.resetButton?.setAttribute('data-following',String(this.view.end==null));}
  reset(){this.set({span:DEFAULT_SPAN,end:null});this.rebase();}
  destroy(){this.controller.abort();this.pointers.clear();}
}
