import {defineConfig} from 'vite';
export default defineConfig({root:'testnet/public',build:{outDir:'../../dist-testnet',emptyOutDir:true},server:{host:'127.0.0.1',port:8891,strictPort:true,proxy:{'/api':'http://127.0.0.1:8892'}},preview:{host:'127.0.0.1',port:8891,strictPort:true,proxy:{'/api':'http://127.0.0.1:8892'}}});
