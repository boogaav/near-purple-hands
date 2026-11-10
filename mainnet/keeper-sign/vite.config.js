import {defineConfig} from 'vite';
export default defineConfig({root:'mainnet/keeper-sign',define:{global:'globalThis','process.env':'{}'},resolve:{alias:{buffer:'buffer/'}},build:{outDir:'../../.local/keeper-sign',emptyOutDir:true},preview:{host:'127.0.0.1',port:8897,strictPort:true,proxy:{'/rpc':{target:'https://rpc.mainnet.near.org',changeOrigin:true,rewrite:()=> '/'}}}});
