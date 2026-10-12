// V9.05.1: signed, HttpOnly, same-origin session. Do not expose secrets to browser.
const crypto=require('crypto');
const COOKIE='fy_hcu_portal_session_v9051';
const TTL_SECONDS=8*60*60;
function settings(){
 const user=String(process.env.HCU_PORTAL_LOGIN_USER||'').trim();
 const pass=String(process.env.HCU_PORTAL_LOGIN_PASSWORD||'');
 const secret=String(process.env.HCU_PORTAL_SESSION_SECRET||'');
 if(!user||pass.length<12||secret.length<32)throw Error('Konfigurasi login server belum lengkap: HCU_PORTAL_LOGIN_USER, HCU_PORTAL_LOGIN_PASSWORD (min 12), HCU_PORTAL_SESSION_SECRET (min 32).');
 return {user,pass,secret};
}
function eq(x,y){const a=Buffer.from(String(x||'')),b=Buffer.from(String(y||''));return a.length===b.length&&crypto.timingSafeEqual(a,b);}
function key(cfg){return crypto.createHmac('sha256',cfg.secret).update(cfg.pass).digest();}
function seal(value,cfg){const data=Buffer.from(JSON.stringify(value)).toString('base64url');const sig=crypto.createHmac('sha256',key(cfg)).update(data).digest('base64url');return `${data}.${sig}`;}
function cookieValue(req){const pair=String(req.headers.cookie||'').split(';').map(s=>s.trim()).find(x=>x.startsWith(COOKIE+'='));return pair?pair.slice(COOKIE.length+1):'';}
function verify(req){
 const cfg=settings();const raw=cookieValue(req);const parts=raw.split('.');if(parts.length!==2)return null;
 const [body,tag]=parts;const expected=crypto.createHmac('sha256',key(cfg)).update(body).digest('base64url');
 if(!eq(tag,expected))return null;
 try{const obj=JSON.parse(Buffer.from(body,'base64url').toString('utf8'));
  if(obj.ver!==1||obj.sub!==cfg.user||!Number.isSafeInteger(obj.exp)||obj.exp<=Math.floor(Date.now()/1000))return null;
  return {user:obj.sub,exp:obj.exp};
 }catch(_){return null;}
}
function isSameOrigin(req){
 const origin=req.headers.origin;
 if(!origin)return true; // Browser same-origin fetch may omit Origin on GET.
 try{const parsed=new URL(origin);const host=String(req.headers['x-forwarded-host']||req.headers.host||'').split(',')[0].trim();
  return parsed.host.toLowerCase()===host.toLowerCase() && (parsed.protocol==='https:'||parsed.hostname==='localhost');
 }catch(_){return false;}
}
function cookieHeader(value,maxAge){return `${COOKIE}=${value}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`;}
function login(user,pass){const cfg=settings();if(!eq(user,cfg.user)||!eq(pass,cfg.pass))return null;
 const exp=Math.floor(Date.now()/1000)+TTL_SECONDS;return cookieHeader(seal({ver:1,sub:cfg.user,exp},cfg),TTL_SECONDS);
}
const logout=()=>cookieHeader('',0);
module.exports={settings,verify,isSameOrigin,login,logout};
