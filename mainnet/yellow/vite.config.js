import {defineConfig} from 'vite';
export default defineConfig({root:'mainnet/yellow',base:'/near/',define:{global:'globalThis','process.env':'{}'},resolve:{alias:{buffer:'buffer/'}},build:{outDir:'../../.local/yellow-site',emptyOutDir:true}});
