// HCU-Portal V8.16: server-side proxy for authenticated audit summaries only.
const DEFAULT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbygUVZjmB6kwpSG43OYMStr_KxJbuzyXPRxsdytHaLxR0rSXgkxkfeyOTfaVXlgVP8Q/exec';
module.exports = async function handler(req,res){
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({success:false,message:'Method not allowed'});}
  const script=process.env.HCU_DATABASE_APPS_SCRIPT_URL||process.env.HCU_LHU_APPS_SCRIPT_URL||DEFAULT_APPS_SCRIPT_URL;
  const token=process.env.HCU_DATABASE_API_TOKEN||process.env.HCU_LHU_API_TOKEN||'';
  if(!token)return res.status(500).json({success:false,message:'Token API database belum dikonfigurasi.'});
  const limit=Math.min(100,Math.max(1,Number(req.query.limit)||60));
  const url=new URL(script);url.searchParams.set('action','listNotifications');url.searchParams.set('limit',String(limit));url.searchParams.set('token',token);
  try{
    const controller=new AbortController();const t=setTimeout(()=>controller.abort(),15000);
    let upstream;
    try{upstream=await fetch(url.toString(),{method:'GET',redirect:'follow',cache:'no-store',signal:controller.signal});}
    finally{clearTimeout(t);}
    const response=await upstream.text();let parsed;
    try{parsed=JSON.parse(response);}catch(e){return res.status(502).json({success:false,message:'Audit log belum tersedia dari Apps Script. Periksa deployment terbaru.'});}
    return res.status(upstream.ok && parsed.success!==false?200:502).json(parsed);
  }catch(e){return res.status(502).json({success:false,message:'Tidak dapat membaca aktivitas database: '+(e.name==='AbortError'?'timeout':e.message)});}
};
