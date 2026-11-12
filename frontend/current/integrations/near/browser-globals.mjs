import {Buffer} from 'buffer';
export {Buffer};
export const global=globalThis;
export const process={browser:true,env:{},versions:{},nextTick:(fn,...args)=>queueMicrotask(()=>fn(...args))};
