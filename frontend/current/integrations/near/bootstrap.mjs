import {nearPreference} from './account.mjs';
if(location.pathname.replace(/\/$/,'')==='/near' && sessionStorage.getItem(nearPreference))import(NEAR_MODULE_URL);
else import(EVM_MODULE_URL);
