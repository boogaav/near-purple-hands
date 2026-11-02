// Operator-only fixture faucet. Never served by the public HTTP API.
import {client,ids,manifest} from './testnet-client.mjs';
const owner=process.argv[2];
if(!owner || !/^[a-z0-9][a-z0-9._-]*\.testnet$/.test(owner)) throw Error('Usage: node scripts/fund-testnet-user.mjs account.testnet');
const {near,view,call}=await client(['root']);
await (await near.account(owner)).state();
if(!await view(ids.token,'storage_balance_of',{account_id:owner})) await call('root',ids.token,'storage_deposit',{account_id:owner,registration_only:true},10n**23n);
const balance=BigInt(await view(ids.token,'ft_balance_of',{account_id:owner}));
if(balance>=1000_000000n) {console.log('Wallet already has at least 1,000 mock USDC.');process.exit(0);}
const r=await call('root',ids.token,'ft_transfer',{receiver_id:owner,amount:String(1000_000000n-balance),memo:'Testnet mock tokens only'},1n);
console.log('Funded mock USDC:',owner,r.transaction.hash);
