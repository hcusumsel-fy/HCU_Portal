// HCU Portal server login: necessary before removing the additional Asset PIN dialog.
const auth=require('../lib/hcu-portal-auth');
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 const method=String(req.method||'').toUpperCase();
 if(method==='GET'){
  if(String(req.query?.action||'status').toLowerCase()!=='status')return res.status(400).json({success:false,message:'Action tidak dikenal.'});
  try{const session=auth.verify(req);return res.status(200).json({success:!!session,authenticated:!!session});}
  catch(_){return res.status(503).json({success:false,authenticated:false,message:'Login server belum dikonfigurasi.'});}
 }
 if(method!=='POST')return res.status(405).json({success:false,message:'Metode tidak diizinkan.'});
 if(!auth.isSameOrigin(req))return res.status(403).json({success:false,message:'Permintaan lintas domain ditolak.'});
 const action=String(req.body?.action||'').toLowerCase();
 if(action==='logout'){res.setHeader('Set-Cookie',auth.logout());return res.status(200).json({success:true});}
 if(action!=='login')return res.status(400).json({success:false,message:'Action tidak dikenal.'});
 try{
  const user=String(req.body?.user||'').trim(),pass=String(req.body?.password||'');
  if(user.length>200||pass.length>512)return res.status(400).json({success:false,message:'Input tidak valid.'});
  const cookie=auth.login(user,pass);
  if(!cookie)return res.status(401).json({success:false,message:'Email/NPP atau password tidak cocok.'});
  res.setHeader('Set-Cookie',cookie);return res.status(200).json({success:true,message:'Login berhasil.'});
 }catch(_){return res.status(503).json({success:false,message:'Konfigurasi login server belum siap. Hubungi administrator.'});}
};
