// Read-only provider probe. Never logs the API key, request headers or raw errors.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createPublicKey,verify} from 'node:crypto';
const key=(await readFile(new URL('../.local/pyth-api-key',import.meta.url),'utf8')).trim();
const response=await fetch('https://pyth-lazer.dourolabs.app/v1/latest_price',{
 method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},
 body:JSON.stringify({priceFeedIds:[1],properties:['price','publisherCount','exponent','confidence','marketSession','feedUpdateTimestamp'],formats:['solana'],channel:'fixed_rate@200ms'}),signal:AbortSignal.timeout(15000)
}).catch(()=>{throw Error('Pyth connection failed (details withheld to protect credentials)')});
if(!response.ok)throw Error(`Pyth HTTP ${response.status}`);
const data=await response.json();
if(!data.solana||!['base64','hex'].includes(data.solana.encoding))throw Error('Missing signed solana payload');
const bytes=Buffer.from(data.solana.data.replace(/^0x/,''),data.solana.encoding);
if(bytes.length<102||bytes.readUInt32LE(0)!==2182742457||bytes.readUInt16LE(100)!==bytes.length-102)throw Error('Invalid signature envelope');
const publicKey=bytes.subarray(68,100);
const spki=createPublicKey({key:Buffer.concat([Buffer.from('302a300506032b6570032100','hex'),publicKey]),format:'der',type:'spki'});
if(!verify(null,bytes.subarray(102),spki,bytes.subarray(4,68)))throw Error('Invalid sample signature');
await mkdir(new URL('../.local/pyth-samples/',import.meta.url),{recursive:true,mode:0o700});
await writeFile(new URL('../.local/pyth-samples/latest.json',import.meta.url),JSON.stringify(data),{mode:0o600});
console.log(JSON.stringify({signatureValid:true,signerHex:publicKey.toString('hex'),signerTrusted:false,note:'Envelope signature verified; independently verify the signer registry before trusting this key.',parsed:data.parsed},null,2));
