// Cosmetic domain branding only; never enters accounts or signed orders.
import { themeForHostname, faviconForTheme, socialMetadataForTheme } from './domain-brand.mjs';
export const normalizeTheme = value => value === 'yellow' ? 'yellow' : 'purple';
export const themeName = value => normalizeTheme(value) === 'yellow' ? 'Yellowhands' : 'Purple Hands';
export const currentTheme = () => normalizeTheme(globalThis.document?.documentElement?.dataset.brandTheme);
export function initBrandTheme(root, {onChange=()=>{},hostname}={}) {
  if(!root)return;
  const doc=root.ownerDocument, originalTitle=doc.title;
  const apply=value=>{
    const theme=normalizeTheme(value), yellow=theme==='yellow', word=yellow?'yellow':'purple', name=themeName(theme);
    doc.documentElement.dataset.brandTheme=theme;root.dataset.brandTheme=theme;
    for(const [key,value] of Object.entries(socialMetadataForTheme(theme))) {
      const content=key==='og:url'?(doc.querySelector('link[rel="canonical"]')?.getAttribute('href')||value):value;
      doc.querySelector(`meta[property="${key}"],meta[name="${key}"]`)?.setAttribute('content',content);
    }
    doc.querySelectorAll('link[rel="icon"],link[rel="apple-touch-icon"]').forEach(link=>{
      const href=link.getAttribute('href');
      if(href)link.setAttribute('href',faviconForTheme(href,theme));
    });
    doc.title=/Purple Hands|Yellowhands/.test(originalTitle)?originalTitle.replace(/Purple Hands|Yellowhands/,name):name+' — Trading preview';
    root.setAttribute('aria-label',name+' trading experience');
    root.querySelector('.p-manifesto')?.setAttribute('aria-label',name+' headline');
    root.querySelectorAll('.p-brandtext,.ph-name').forEach(el=>el.innerHTML=word+'<span>hands</span>');
    root.querySelectorAll('[data-brand-title]').forEach(el=>el.textContent=name.toUpperCase());
    root.querySelectorAll('.p-manifesto em').forEach(el=>el.textContent=word.toUpperCase());
    root.querySelectorAll('.p-manifesto button').forEach(el=>el.setAttribute('aria-label',`MY HANDS ARE CLEAN. THEY’RE JUST ${word.toUpperCase()}. Toggle ${word} color.`));
    doc.dispatchEvent(new CustomEvent('purple-hands:theme',{detail:theme}));onChange(theme);
  };
  if(!doc.getElementById('ph-brand-theme')){const style=doc.createElement('style');style.id='ph-brand-theme';style.textContent=THEME_CSS;doc.head.append(style);}
  root.querySelectorAll('.ph-theme-toggle').forEach(button=>button.remove());
  apply(themeForHostname(hostname??doc.location?.hostname));
}

export function chartPalette(theme) {
  return normalizeTheme(theme)==='yellow'
    ? {entry:'#52d6ed',entryRgb:'82,214,237',line:'#f0b90b',muted:'#848e9c',labels:'#b7bdc6',rgb:'240,185,11',glow:'252,213,53',tip:'#fff1ae',flash:'#fff8db',ink:'#181a20',liquidationBg:'#202329'}
    : {line:'#bd9aff',muted:'#807392',labels:'#ae96cd',rgb:'189,154,255',glow:'221,191,255',tip:'#e2ceff',flash:'#fff4ff',ink:'#21123c',liquidationBg:'#2b1946'};
}
// Recolor our own vector receipt artwork; monetary/result colors stay untouched.
export function themeArtwork(svg, theme=currentTheme()) {
  if(normalizeTheme(theme)!=='yellow')return svg;
  const colors={'#8568ff':'#f0b90b','#27134d':'#181a20','#150b2d':'#101114','#e7d5ff':'#fff1ae','#7650cc':'#aa8000','#251345':'#181a20','#28134f':'#202329','#120c22':'#101114','#b693ff':'#f0b90b','#f7f0ff':'#eaecef','#b99aff':'#f0b90b','#bd9aff':'#f0b90b','#c7b5e5':'#b7bdc6','#faf7ff':'#eaecef','#bcaad5':'#b7bdc6','#c6a7ff':'#f0b90b','#cbb4ef':'#f0b90b','#9f8cb7':'#848e9c'};
  return svg.replace(/#[a-f0-9]{6}\b/gi,color=>colors[color.toLowerCase()]??color);
}

export const THEME_CSS = `
html[data-brand-theme=yellow] #purple-hands-play .p-brandmark:not(.ph-clap-logo){width:48px;height:48px;mix-blend-mode:normal;border-radius:23%}
html[data-brand-theme=yellow] #purple-hands-play .p-brandmark:not(.ph-clap-logo) img{inset:0;width:100%;height:100%;max-width:100%;filter:none!important}

.ph-theme-toggle{display:inline-flex!important;align-items:center;justify-content:center;gap:7px!important;flex-shrink:0;min-height:40px!important;padding:5px 9px!important;border:1px solid #bd9aff35!important;border-radius:10px!important;background:#bd9aff09!important;color:#cab5e6!important;cursor:pointer;font:600 9px/1 Arial,sans-serif!important;letter-spacing:.7px}
.ph-theme-track{width:29px;height:16px;border-radius:20px;background:#bd9aff30;position:relative;display:block}
.ph-theme-track>span{position:absolute;left:3px;top:3px;width:10px;height:10px;border-radius:50%;background:#bd9aff;transition:transform .18s,background .18s}
.ph-theme-toggle[aria-checked=true]{background:#f0b90b12!important;border-color:#f0b90b55!important;color:#f0b90b!important}
.ph-theme-toggle[aria-checked=true] .ph-theme-track{background:#f0b90b30}
.ph-theme-toggle[aria-checked=true] .ph-theme-track>span{transform:translateX(13px);background:#f0b90b}
html[data-brand-theme=yellow],html[data-brand-theme=yellow] body{background:#181a20;color:#eaecef}
html[data-brand-theme=yellow] #purple-hands-play{--p-bg:#181a20;--p-surface:#202329;--p-raised:#2b3139;--p-ink:#eaecef;--p-dim:#b7bdc6;--p-line:#474d5766;--p-purple:#f0b90b;--p-lime:#0ecb81;--p-pink:#f6465d;--p-red:#f6465d;--p-grid:#ffffff08;background:#181a20}
html[data-brand-theme=yellow] #purple-hands{--ph-bg:#181a20;--ph-panel:#202329;--ph-raised:#2b3139;--ph-inset:#181a20;--ph-tint:#f0b90b15;--ph-warn:#30291f;--ph-text:#eaecef;--ph-muted:#b7bdc6;--ph-line:#474d5766;--ph-violet:#f0b90b;--ph-green:#0ecb81;--ph-red:#f6465d;--ph-amber:#f0b90b}
html[data-brand-theme=yellow] #purple-hands-play :is(.p-header,.p-footer,.p-arena){background:#181a20}
html[data-brand-theme=yellow] #purple-hands-play .p-terminal{background:linear-gradient(145deg,#252930,#1e2026 70%);border-color:#f0b90b30;box-shadow:0 20px 70px #0003}
html[data-brand-theme=yellow] #purple-hands-play .p-manifesto{background:radial-gradient(ellipse at 50% 100%,#f0b90b0d,transparent 68%),#181a20}
html[data-brand-theme=yellow] #purple-hands-play .p-manifesto :is(button,span){color:#eaecef}
html[data-brand-theme=yellow] #purple-hands-play .p-manifesto strong{color:#f0b90b}
html[data-brand-theme=yellow] #purple-hands-play .p-manifesto button:is(:hover,:focus-visible,.is-purple) :is(strong,em){color:#fcd535;text-shadow:0 0 22px #f0b90b55,0 0 50px #f0b90b22}
html[data-brand-theme=yellow] #purple-hands-play .p-brandtext{color:#eaecef}
html[data-brand-theme=yellow] #purple-hands-play .p-brandtext span{color:#f0b90b}
html[data-brand-theme=yellow] #purple-hands .ph-name span{color:#f0b90b}
html[data-brand-theme=yellow] #purple-hands-play :is(.p-brandmark img,.p-hand-art img){filter:grayscale(1) sepia(1) saturate(5) hue-rotate(12deg) brightness(1.14)}
html[data-brand-theme=yellow] #purple-hands-play :is(.p-leverage,.p-execution){background:#f0b90b0a;border-color:#f0b90b30;color:#f0b90b}
html[data-brand-theme=yellow] #purple-hands-play .p-hand-button{background:#202329;border-color:#474d5766}
html[data-brand-theme=yellow] #purple-hands-play .p-hand-button:hover:not(:disabled){background:#2b3139;border-color:var(--p-wing-accent)}
html[data-brand-theme=yellow] #purple-hands-play .p-pool-chart{background:#181a20}
html[data-brand-theme=yellow] #purple-hands-play :is(.p-pool-chart-top,.p-pool-caption,.p-chart-foot,.p-entry-note,.p-error,.p-setting-group legend){color:#b7bdc6}
html[data-brand-theme=yellow] #purple-hands-play .p-pool-chart-top span:first-child{color:#f0b90b}
html[data-brand-theme=yellow] #purple-hands-play .p-pool-chart-top i{background:#f0b90b}
html[data-brand-theme=yellow] #purple-hands-play .p-pool-tooltip{background:#202329;color:#eaecef;border-color:#474d57}
html[data-brand-theme=yellow] .p-chart-gesture-hint{color:#b7bdc6}
html[data-brand-theme=yellow] .p-chart-navigation button{background:#202329!important;color:#f0b90b!important;border-color:#f0b90b30!important}
html[data-brand-theme=yellow] #purple-hands-play .p-setting-group .p-amounts{background:#181a20;border-color:#474d5766}
html[data-brand-theme=yellow] #purple-hands-play .p-setting-group .p-amounts button{color:#b7bdc6}
html[data-brand-theme=yellow] #purple-hands-play .p-setting-group .p-amounts button[aria-pressed=true]{color:#181a20;background:#f0b90b;border-color:#fcd53555;box-shadow:0 2px 12px #f0b90b18}
html[data-brand-theme=yellow] #purple-hands-play .p-setting-group .p-amounts button:hover:not(:disabled):not([aria-pressed=true]){color:#eaecef;background:#2b3139}
html[data-brand-theme=yellow] #purple-hands-play .p-entry-note strong{color:#eaecef}
html[data-brand-theme=yellow] #purple-hands-play :is(.p-wallet,.p-dialog,.p-toast){background:#202329;border-color:#474d5766}
html[data-brand-theme=yellow] #purple-hands-play :is(.p-primary,.p-inline-connect,.p-back){background:#f0b90b;color:#181a20}
html[data-brand-theme=yellow] #purple-hands-play .p-field input{background:#181a20;border-color:#474d57}
html[data-brand-theme=yellow] #purple-hands-play :is(.p-protocol-link,.p-text-button){color:#f0b90b}
html[data-brand-theme=yellow] #purple-hands-play .p-overlay{background:#101114c9}
html[data-brand-theme=yellow] :is(.p-share,.ph-share-dialog .ph-share-primary){background:#f0b90b!important;color:#181a20!important;border-color:#fcd53555!important}
html[data-brand-theme=yellow] .ph-share-dialog{background:#202329;color:#eaecef;border-color:#474d57}
html[data-brand-theme=yellow] .ph-share-dialog :is(button,.ph-share-note,.ph-share-status){color:#b7bdc6;border-color:#474d5766}
html[data-brand-theme=yellow] #purple-hands-play :is(.p-share,#p-result-symbol) [fill="#8568ff"]{fill:#f0b90b}
html[data-brand-theme=yellow] #purple-hands-play :is(.p-share,#p-result-symbol) [fill="#27134d"]{fill:#181a20}
html[data-brand-theme=yellow] #purple-hands-play :is(.p-share,#p-result-symbol) [stroke="#e7d5ff"]{stroke:#fff1ae}
html[data-brand-theme=yellow] #purple-hands .ph-primary{background:#f0b90b;color:#181a20}
html[data-brand-theme=yellow] #purple-hands .ph-primary:hover:not(:disabled){background:#fcd535}
html[data-brand-theme=yellow] #purple-hands .ph-setting-row{background:#181a20;border-color:#474d57}
html[data-brand-theme=yellow] #purple-hands .ph-setting-row button[aria-pressed=true]{background:#f0b90b;color:#181a20}
html[data-brand-theme=yellow] :is(button,input,[data-chart-interactive]):focus-visible{outline-color:#f0b90b!important}
@media(max-width:650px){html #purple-hands-play .p-demo{display:none}html #purple-hands-play .p-header{gap:6px}html #purple-hands-play .p-header-actions{gap:6px}html #purple-hands-play .ph-theme-toggle-label{display:none}html #purple-hands-play .ph-theme-toggle{min-width:44px;min-height:44px!important;padding:7px!important}html #purple-hands-play .p-brandmark{--p-logo-width:40px}html #purple-hands-play .p-brandtext{font-size:17px}html #purple-hands-play .p-brand{gap:7px}html #purple-hands-play .p-wallet{padding-inline:9px}html #purple-hands-play[data-connected=true] .p-brandtext{display:block;font-size:15px}html #purple-hands-play[data-connected=true] .p-brandmark{display:none}}
@media(max-width:360px){html #purple-hands-play .p-brandmark{display:none}html #purple-hands-play[data-connected=true] .p-brandtext{display:none}}
@media(prefers-reduced-motion:reduce){.ph-theme-track>span{transition:none}}
`;
