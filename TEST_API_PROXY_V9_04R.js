const assert=require('assert');
const handler=require('./api/assets.js');
function makeResponse(){return {code:200,headers:{},setHeader(k,v){this.headers[k]=v},status(c){this.code=c;return this},json(x){this.body=x;return this}};}
(async()=>{
 process.env.HCU_DATABASE_APPS_SCRIPT_URL='https://script.google.com/macros/s/FAKE_TEST/exec';
 process.env.HCU_DATABASE_API_TOKEN='TOKEN_ONLY_TEST';
 process.env.HCU_ASSET_V904_ACCESS_PIN='PIN_DEMO_12345';
 process.env.HCU_ASSET_V904_WRITES_ENABLED='false';
 let nfetch=0;
 global.fetch=async(url,opts)=>{nfetch++;const u=new URL(url);assert.strictEqual(u.searchParams.get('token'),'TOKEN_ONLY_TEST');return {ok:true,status:200,text:async()=>JSON.stringify({success:true,source:'Fy_Database',assets:[]})}};
 let r=makeResponse();await handler({method:'GET',headers:{'x-hcu-asset-access':'wrongpin'},query:{action:'listassetsv904'}},r);
 assert.equal(r.code,401);assert.equal(nfetch,0);
 r=makeResponse();await handler({method:'POST',headers:{'x-hcu-asset-access':'PIN_DEMO_12345'},body:{action:'saveassetv904',asset:{}}},r);
 assert.equal(r.code,403);assert.equal(nfetch,0);
 r=makeResponse();await handler({method:'GET',headers:{'x-hcu-asset-access':'PIN_DEMO_12345'},query:{action:'listassetsv904'}},r);
 assert.equal(r.code,200);assert.equal(nfetch,1);assert.equal(r.body.source,'Fy_Database');
 assert(!JSON.stringify(r.body).includes('TOKEN_ONLY_TEST'));
 r=makeResponse();await handler({method:'GET',headers:{'x-hcu-asset-access':'PIN_DEMO_12345'},query:{action:'nonsense'}},r);
 assert.equal(r.code,400);assert.equal(nfetch,1);
 console.log(JSON.stringify({status:'LULUS',tests:['PIN invalid denied 401','Writes disabled denied 403','GET authorized 200','API token stays server side','Unknown actions denied 400'],calls:nfetch},null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
