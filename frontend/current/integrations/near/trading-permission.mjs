export const tradingMethods=Object.freeze(['request_open','request_close','cancel_open']);
export function isTradingPermission(permission,exchange){
  const p=permission?.FunctionCall;
  if(!p||p.receiver_id!==exchange||!Array.isArray(p.method_names)||p.method_names.length!==tradingMethods.length||!tradingMethods.every(m=>p.method_names.includes(m)))return false;
  try{return p.allowance!==null&&BigInt(p.allowance)>0n;}catch{return false;}
}
export function isTradingCall(exchange,receiver,method,deposit){
  return receiver===exchange&&tradingMethods.includes(method)&&String(deposit)==='0';
}
