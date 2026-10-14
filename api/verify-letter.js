// HCU-Portal V9.07.2 — endpoint baca-saja verifikasi QR surat.
// Tidak meminta sesi portal: kode QR mengandung token HMAC berentropi tinggi.
// API_TOKEN hanya hidup di server Vercel; tidak pernah dikirim ke browser.
const TIMEOUT_MS=18000;
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','private, no-store, max-age=0');
 res.setHeader('X-Robots-Tag','noindex, nofollow, noarchive');
 res.setHeader('Referrer-Policy','no-referrer');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(String(req.method||'').toUpperCase()!=='GET')return res.status(405).json({success:false,message:'Metode tidak diizinkan.'});
 const query=String(req.query?.token||'').trim();
 if(!/^SURAT-[A-F0-9]{16}\.(p1|p2)\.[A-Za-z0-9_-]{43}$/.test(query))return res.status(400).json({success:false,message:'Kode verifikasi tidak valid.'});
 const endpoint=process.env.HCU_DATABASE_APPS_SCRIPT_URL||process.env.HCU_LHU_APPS_SCRIPT_URL||'';
 const authToken=process.env.HCU_DATABASE_API_TOKEN||process.env.HCU_LHU_API_TOKEN||'';
 if(!endpoint||!authToken)return res.status(503).json({success:false,message:'Layanan verifikasi belum dikonfigurasi.'});
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),TIMEOUT_MS);
 try{
  const url=new URL(endpoint);
  url.searchParams.set('action','verifyassetletterv9072');
  url.searchParams.set('token',authToken);
  url.searchParams.set('verificationToken',query);
  const upstream=await fetch(url.toString(),{method:'GET',redirect:'follow',cache:'no-store',signal:controller.signal});
  const raw=await upstream.text();
  let payload;try{payload=JSON.parse(raw.replace(/^\uFEFF/,'').trim());}catch(_){return res.status(502).json({success:false,message:'Layanan verifikasi belum siap.'});}
  if(!upstream.ok||payload?.success!==true||payload?.verified!==true)return res.status(404).json({success:false,message:'Dokumen tidak ditemukan atau token QR tidak berlaku.'});
  // Allowlist: jangan mengekspos snapshot aset atau endpoint database dari respons GAS.
  const pick=k=>String(payload[k]||'').slice(0,500);
  return res.status(200).json({success:true,verified:true,organization:pick('organization'),office:pick('office'),number:pick('number'),date:pick('date'),documentType:pick('documentType'),role:pick('role'),name:pick('name'),job:pick('job'),npp:pick('npp'),notice:pick('notice')});
 }catch(_){return res.status(503).json({success:false,message:'Layanan verifikasi sementara tidak dapat dihubungi.'});}
 finally{clearTimeout(timer);}
};
