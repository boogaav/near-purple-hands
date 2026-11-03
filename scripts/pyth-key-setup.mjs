// One-shot loopback credential form. Never echo, log, or serve the API key.
import http from 'node:http';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
const token=randomBytes(32).toString('hex');
const origin='http://127.0.0.1:8893';
const file=new URL('../.local/pyth-api-key',import.meta.url);
const server=http.createServer(async(req,res)=>{
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('Content-Security-Policy',"default-src 'none'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'; style-src 'unsafe-inline'");
 if(req.headers.host!=='127.0.0.1:8893'){res.writeHead(403);return res.end();}
 if(req.method==='GET'&&req.url==='/'){
  res.setHeader('Content-Type','text/html; charset=utf-8');
  return res.end(`<!doctype html><title>Purple Hands · Pyth setup</title><style>body{background:#17141f;color:#eee;font:18px system-ui;max-width:520px;margin:12vh auto;padding:24px}input,button{box-sizing:border-box;width:100%;padding:16px;margin:16px 0;border-radius:12px}button{background:#b793ff;border:0;font-weight:bold}</style><h1>Connect Pyth</h1><p>Paste your Pyth API key here. It stays in a private file on this laptop and is used only for Pyth requests.</p><form method="post" action="/save"><input type="hidden" name="csrf" value="${token}"><label for="key">Pyth API key</label><input id="key" name="key" type="password" autocomplete="off" required maxlength="8192"><button>Save locally</button></form><p>No wallet signature or payment is requested.</p>`);
 }
 if(req.method!=='POST'||req.url!=='/save'||req.headers.origin!==origin){res.writeHead(403);return res.end('Invalid request');}
 let body='';
 try {
  for await (const chunk of req){body+=chunk;if(body.length>20000)throw Error('Too large');}
  const form=new URLSearchParams(body),csrf=form.get('csrf')||'',key=(form.get('key')||'').trim();
  if(csrf.length!==token.length||!timingSafeEqual(Buffer.from(csrf),Buffer.from(token))||!key||key.length>8192||/[\r\n]/.test(key))throw Error('Invalid input');
  await mkdir(new URL('../.local/',import.meta.url),{recursive:true,mode:0o700});
  await writeFile(file,key,{mode:0o600,flag:'wx'});
  res.setHeader('Content-Type','text/plain; charset=utf-8');res.end('Saved privately. You can close this tab.');
  server.close();
 } catch {res.writeHead(400);res.end('Could not save. Check the field; an existing key is never overwritten.');}
});
server.listen(8893,'127.0.0.1',()=>console.log('Pyth key setup: '+origin));
setTimeout(()=>server.close(),30*60*1000).unref();
