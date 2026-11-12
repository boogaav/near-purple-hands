import { currentTheme, themeName } from './brand-theme.mjs';

export function initHeaderTagline(root) {
  if(!root)return;
  const doc=root.ownerDocument,header=root.querySelector('.p-header,.ph-header');
  if(!header)return;
  let tagline=root.querySelector('.p-manifesto');
  if(!tagline){
    tagline=doc.createElement('section');tagline.className='p-manifesto';
    const word=currentTheme().toUpperCase();
    tagline.setAttribute('aria-label',themeName(currentTheme())+' headline');
    tagline.innerHTML=`<h1><button type="button" data-action="ink" aria-pressed="false" aria-label="MY HANDS ARE CLEAN. THEY’RE JUST ${word}."><span>MY HANDS ARE CLEAN</span><strong>THEY’RE JUST <em>${word}</em></strong></button></h1>`;
  }
  header.insertBefore(tagline,header.querySelector('.p-header-actions,.ph-header-right'));
  root.dataset.headerTagline='true';
  if(!doc.getElementById('ph-header-tagline')){
    const style=doc.createElement('style');style.id='ph-header-tagline';style.textContent=HEADER_CSS;doc.head.append(style);
  }
}

export const HEADER_CSS=`
html :is(#purple-hands-play,#purple-hands)[data-header-tagline=true] :is(.p-header,.ph-header){display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;column-gap:24px;row-gap:8px}
html :is(#purple-hands-play,#purple-hands)[data-header-tagline=true] :is(.p-brand,.ph-brand){grid-column:1;grid-row:1}
html :is(#purple-hands-play,#purple-hands)[data-header-tagline=true] :is(.p-header-actions,.ph-header-right){grid-column:3;grid-row:1;justify-self:end;margin-left:0}
html :is(#purple-hands-play,#purple-hands)[data-header-tagline=true] :is(.p-header,.ph-header) .p-manifesto{grid-column:2;grid-row:1;display:flex;align-items:center;justify-content:center;min-width:0;margin:0;padding:0;background:none;text-align:center}
html :is(#purple-hands-play,#purple-hands)[data-header-tagline=true] .p-manifesto h1{margin:0;line-height:1}
html :is(#purple-hands-play,#purple-hands)[data-header-tagline=true] :is(.p-header,.ph-header) .p-manifesto button{display:block;min-height:44px;padding:3px 0;background:none;border:0;font-family:inherit;font-size:clamp(18px,1.65vw,25px);font-weight:850;line-height:1.06;letter-spacing:-.6px;white-space:nowrap;color:var(--p-ink,var(--ph-text,#faf7ff));cursor:pointer}
html :is(#purple-hands-play,#purple-hands)[data-header-tagline=true] .p-manifesto :is(span,strong){display:block;font:inherit}
html :is(#purple-hands-play,#purple-hands)[data-header-tagline=true] .p-manifesto span{margin-bottom:2px;color:inherit}
html :is(#purple-hands-play,#purple-hands)[data-header-tagline=true] .p-manifesto strong{color:var(--p-purple,var(--ph-violet,#bd9aff))}
html :is(#purple-hands-play,#purple-hands)[data-header-tagline=true] .p-manifesto em{font-style:italic;color:inherit;transition:color .2s,text-shadow .2s}
html :is(#purple-hands-play,#purple-hands)[data-header-tagline=true] .p-manifesto button:is(:hover,:focus-visible,.is-purple) em{color:#d991ff;text-shadow:0 0 18px currentColor}
html[data-brand-theme=yellow] :is(#purple-hands-play,#purple-hands)[data-header-tagline=true] .p-manifesto button:is(:hover,:focus-visible,.is-purple) em{color:#fcd535}
html #purple-hands[data-header-tagline=true] .ph-nav{grid-column:1/-1;grid-row:2;width:100%}
@media(min-width:900px){
 html #purple-hands-play[data-header-tagline=true]{grid-template-rows:auto minmax(0,1fr) 32px}
 html #purple-hands-play[data-header-tagline=true] .p-header{min-height:68px;padding-block:10px}
 html #purple-hands-play[data-header-tagline=true] .p-arena{padding-top:12px}
}
@media(min-width:900px) and (max-width:1150px){
 html #purple-hands-play[data-header-tagline=true] .p-header{column-gap:18px}
 html #purple-hands-play[data-header-tagline=true] :is(.p-brandmark,.p-demo,.p-history-button,.ph-theme-toggle-label){display:none}
 html #purple-hands-play[data-header-tagline=true] .p-brandtext{font-size:18px}
 html #purple-hands-play[data-header-tagline=true] .ph-theme-toggle{min-width:44px;padding:7px!important}
 html #purple-hands-play[data-header-tagline=true] .p-header-actions{gap:6px}
 html #purple-hands-play[data-header-tagline=true][data-connected=true] #p-balance{font-size:33px}
 html #purple-hands-play[data-header-tagline=true] .p-header .p-manifesto button{font-size:18px}
}
@media(max-width:899px){
 html :is(#purple-hands-play,#purple-hands)[data-header-tagline=true] :is(.p-header,.ph-header){grid-template-columns:minmax(0,1fr) auto;padding-block:10px;column-gap:8px;row-gap:7px}
 html :is(#purple-hands-play,#purple-hands)[data-header-tagline=true] :is(.p-header-actions,.ph-header-right){grid-column:2}
 html :is(#purple-hands-play,#purple-hands)[data-header-tagline=true] :is(.p-header,.ph-header) .p-manifesto{grid-column:1/-1;grid-row:2}
 html :is(#purple-hands-play,#purple-hands)[data-header-tagline=true] :is(.p-header,.ph-header) .p-manifesto button{font-size:20px;min-height:44px}
 html #purple-hands[data-header-tagline=true] .ph-nav{grid-row:3}
 html #purple-hands-play[data-header-tagline=true] .p-arena{padding-top:12px}
}
@media(max-width:400px){
 html :is(#purple-hands-play,#purple-hands)[data-header-tagline=true] :is(.p-header,.ph-header) .p-manifesto button{font-size:18px}
}
@media(prefers-reduced-motion:reduce){html [data-header-tagline=true] .p-manifesto em{transition:none}}
`;
