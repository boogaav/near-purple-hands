// Exact host matching keeps each public brand stable, regardless of old local
// preferences. The .localhost name supports isolated local visual QA.
export function themeForHostname(hostname='') {
  const host=String(hostname).toLowerCase().replace(/\.$/,'');
  return ['yellowhands.wtf','www.yellowhands.wtf','yellowhands.localhost'].includes(host)?'yellow':'purple';
}
export const brandUrl=theme=>theme==='yellow'?'https://yellowhands.wtf':'https://purplehands.wtf';
export const productPath=product=>product==='papertrades'?'/papertrades':'/';
export const productUrl=(theme,product)=>product==='papertrades'?'https://purplehands.wtf':brandUrl(theme);

// These overrides must also ship in server HTML: link-preview crawlers don't run JS.
export function socialMetadataForTheme(theme) {
  if(theme!=='yellow')return {};
  const image=brandUrl(theme)+'/assets/yellowhands-link-preview-v3.png';
  const alt='Yellowhands: gold outlined symbol. My Hands Are Clean. They Just Yellow.';
  return {'og:site_name':'Yellowhands','og:title':'Yellowhands','twitter:title':'Yellowhands',
    'og:url':brandUrl(theme)+'/','og:image':image,'twitter:image':image,
    'og:image:alt':alt,'twitter:image:alt':alt};
}

// Separate asset names prevent a cached purple icon from leaking into Yellowhands.
export function faviconForTheme(href,theme) {
  if(theme!=='yellow')return href;
  return href.replace(/\/favicon\.ico(?:\?v=hands-20261022)?$/, '/assets/favicon-yellowhands-v4.ico')
    .replace(/\/assets\/favicon-hands-(\d+)\.png$/, '/assets/favicon-yellowhands-v4-$1.png')
    .replace(/favicon-yellowhands-v1/g, 'favicon-yellowhands-v4');
}
