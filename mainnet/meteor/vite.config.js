import {defineConfig} from 'vite';
export default defineConfig({root:'mainnet/meteor',define:{global:'globalThis','process.env':'{}'},resolve:{alias:{buffer:'buffer/'}},build:{outDir:'../../.local/meteor-signing',emptyOutDir:true},preview:{host:'127.0.0.1',port:8895,strictPort:true,proxy:{'/rpc':{target:'https://rpc.mainnet.near.org',changeOrigin:true,rewrite:()=> '/'}}}});
