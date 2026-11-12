export const TRAFFIC_PATHS=['/','/near','/hype','/chemistry','/how-it-works','/privacy','/solana','/v1','/v2','/papertrades'];
export const trafficPath=path=>{const normalized=String(path||'/').replace(/\/+$/,'')||'/';return TRAFFIC_PATHS.includes(normalized)?normalized:null;};
