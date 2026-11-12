import {nearTelemetry} from './telemetry.mjs';
// The selected SDK is the authority. This preference never restores balances or positions.
export const nearPreference='yellowhands:near:mainnet:meteor';
export async function confirmedMeteor(connect){
  const sdk=await import(METEOR_MODULE_URL);
  return sdk.meteorAccount(connect);
}
export async function chooseMeteor(){
  const telemetry=nearTelemetry(),attempt=telemetry.begin('login');
  let owner;try{({owner}=await confirmedMeteor(true));telemetry.stage({...attempt,wallet:owner},'authenticated');}catch(error){telemetry.failed(attempt,error);throw error;}
  sessionStorage.setItem(nearPreference,owner);
  location.assign('/near');
}
export function leaveNear(){
  sessionStorage.removeItem(nearPreference);
  location.replace('/');
}
