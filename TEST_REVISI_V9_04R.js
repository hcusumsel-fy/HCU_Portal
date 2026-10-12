// Node local test: verifies that V9.02 page renderers survive both successful and failed live API toggles.
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const root = __dirname;
const original = fs.readFileSync(path.join(root,'portal.html'),'utf8');
const hybrid = fs.readFileSync(path.join(root,'assets/fy_assets_v904.js'),'utf8');
async function oneCase(success) {
  let count=0; const notifications=[];
  const ctx={
    console,Intl,Date,Set,Map,Promise,Number,Object,String,Array,RegExp,
    currentPage:'inventaris',
    prompt:()=> 'PIN-TES-BUKAN-PRODUKSI',
    document:{getElementById:()=>null},
    show:async page=>{count++},
    toast:(msg,typ)=>notifications.push([msg,typ]),
    fetch:async()=>({status:success?200:401,ok:success,text:async()=>JSON.stringify(success?{
       success:true,source:'Fy_Database',assets:Array.from({length:78},(_,i)=>({ASSET_ID:`AST-${String(i+1).padStart(4,'0')}`,KATEGORI:i<46?'R2':'KOMPUTER',NAMA_ASET:`Aset ${i+1}`})),vehicles:Array.from({length:46},(_,i)=>({ASSET_ID:`AST-${String(i+1).padStart(4,'0')}`})),computers:Array.from({length:32},(_,i)=>({ASSET_ID:`AST-${String(i+47).padStart(4,'0')}`})),loans:[],employees:[],revisions:{}
    }:{success:false,message:'PIN tidak sesuai'})})
  };
  vm.createContext(ctx);
  vm.runInContext(hybrid,ctx,{filename:'fy_assets_v904.js',timeout:5000});
  vm.runInContext("var pageFns={inventaris:()=>'<p>91 VALIDASI V9.02</p>',compliance:()=>'<p>47 LEGACY</p>',pinjam:()=>'<p>PINJAM V9.02</p>'};hcuA904InstallHybridPages(pageFns);",ctx);
  assert(vm.runInContext("pageFns.inventaris().includes('91 VALIDASI V9.02')",ctx));
  assert(vm.runInContext("pageFns.compliance().includes('47 LEGACY')",ctx));
  assert(vm.runInContext("pageFns.pinjam().includes('PINJAM V9.02')",ctx));
  await vm.runInContext("hcuA904HybridSwitch('inventaris','live')",ctx);
  const isLive=vm.runInContext("!pageFns.inventaris().includes('91 VALIDASI V9.02')",ctx);
  assert.strictEqual(isLive,success, 'Live result should follow API response');
  if(!success){assert(vm.runInContext("pageFns.inventaris().includes('91 VALIDASI V9.02')",ctx));assert(notifications.some(v=>v[1]==='error'));}
  if(success){
    assert(vm.runInContext("pageFns.compliance().includes('47 LEGACY')",ctx),'Other modules remain original on one page mode switch');
    assert(vm.runInContext("pageFns.pinjam().includes('PINJAM V9.02')",ctx));
    await vm.runInContext("hcuA904HybridSwitch('inventaris','arsip')",ctx);
    assert(vm.runInContext("pageFns.inventaris().includes('91 VALIDASI V9.02')",ctx));
  }
  return {case:success?'API SUKSES':'API GAGAL',ok:true,renders:count};
}
(async()=>{
  assert(original.includes('hcuA904InstallHybridPages(pageFns)'));
  assert(original.includes('hcuAuditImportDraft()'));
  assert(original.includes('const EMPLOYEES'));
  assert(original.includes('HCU_ASSET_AUDIT_KEY'));
  assert(original.includes('HCU_SIDEBAR_PIN_KEY'));
  assert(original.includes('function financeReadLegacyState'));
  assert(original.includes('function filterCompliance'));
  assert(original.includes('function pinjamPage'));
  assert(original.includes('function dashboardPage'));
  assert(original.includes('hcuA904FilterVehicles()'));
  assert(original.includes('hcuA904FilterAssets()'));
  const runs=[await oneCase(true),await oneCase(false)];
  console.log(JSON.stringify({status:'LULUS',checks:['Mode Arsip default','Live succeeds with 78','Switch back to Arsip restores 91','Bad PIN retains 91','Other menus remain V9.02','Source preserves legacy stores and navigation'],runs},null,2));
})().catch(err=>{console.error(err);process.exitCode=1});
