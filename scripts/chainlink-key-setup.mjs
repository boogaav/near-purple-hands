// One-shot loopback credential form. Never echo, log, or serve the API key.
import http from 'node:http';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
const token=randomBytes(32).toString('hex');
const origin='http://127.0.0.1:8894';
const file=new URL('../.local/chainlink-credentials.json',import.meta.url);
const server=http.createServer(async(req,res)=>{
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('Content-Security-Policy',"default-src 'none'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'; style-src 'unsafe-inline'");
 if(req.headers.host!=='127.0.0.1:8894'){res.writeHead(403);return res.end();}
 if(req.method==='GET'&&req.url==='/'){
  res.setHeader('Content-Type','text/html; charset=utf-8');
  return res.end(`<!doctype html><title>Purple Hands · Chainlink setup</title><style>body{background:#17141f;color:#eee;font:18px system-ui;max-width:520px;margin:12vh auto;padding:24px}input,button{box-sizing:border-box;width:100%;padding:16px;margin:16px 0;border-radius:12px}button{background:#b793ff;border:0;font-weight:bold}</style><h1>Connect Chainlink</h1><p>Paste your Chainlink API key here. Enter the Data Streams API key and secret. They stay in an ignored private file on this laptop.</p><form method="post" action="/save"><input type="hidden" name="csrf" value="${token}"><label for="key">Chainlink API key</label><input id="key" name="key" type="password" autocomplete="off" required maxlength="8192"><label for="secret">API secret</label><input id="secret" name="secret" type="password" autocomplete="off" required maxlength="8192"><label>Environment</label><select name="environment"><option value="mainnet">Mainnet</option><option value="testnet">Testnet</option></select><button>Save locally</button></form><p>No wallet signature or payment is requested.</p>`);
 }
 if(req.method!=='POST'||req.url!=='/save'||req.headers.origin!==origin){res.writeHead(403);return res.end('Invalid request');}
 let body='';
 try {
  for await (const chunk of req){body+=chunk;if(body.length>20000)throw Error('Too large');}
  const form=new URLSearchParams(body),csrf=form.get('csrf')||'',key=(form.get('key')||'').trim();
  const secret=(form.get('secret')||'').trim(),environment=form.get('environment');
  if(!secret||secret.length>8192||/[\r\n]/.test(secret)||!['mainnet','testnet'].includes(environment))throw Error('Invalid input');
  if(csrf.length!==token.length||!timingSafeEqual(Buffer.from(csrf),Buffer.from(token))||!key||key.length>8192||/[\r\n]/.test(key))throw Error('Invalid input');
  await mkdir(new URL('../.local/',import.meta.url),{recursive:true,mode:0o700});
  await writeFile(file,JSON.stringify({key,secret,environment}),{mode:0o600,flag:'wx'});
  res.setHeader('Content-Type','text/plain; charset=utf-8');res.end('Saved privately. You can close this tab.');
  server.close();
 } catch {res.writeHead(400);res.end('Could not save. Check the field; an existing key is never overwritten.');}
});
server.listen(8894,'127.0.0.1',()=>console.log('Chainlink key setup: '+origin));
setTimeout(()=>server.close(),30*60*1000).unref();
