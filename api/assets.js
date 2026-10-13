// HCU-Portal V9.04 — Asset / Vehicle Compliance / Loan proxy.
// API_TOKEN remains server-side in Vercel; browser never receives this secret.
const auth = require('../lib/hcu-portal-auth');
const TIMEOUT_GET = 22000;
const TIMEOUT_POST = 45000;
module.exports = async (req, res) => {
  res.setHeader('Cache-Control','no-store');
  const method = String(req.method || '').toUpperCase();
  if (!['GET','POST'].includes(method)) return res.status(405).json({success:false,message:'Metode tidak diizinkan.'});
  // Deliberately do not use any hardcoded API URL. Only the actual production environment may be used.
  const endpoint = process.env.HCU_DATABASE_APPS_SCRIPT_URL || process.env.HCU_LHU_APPS_SCRIPT_URL || '';
  const token = process.env.HCU_DATABASE_API_TOKEN || process.env.HCU_LHU_API_TOKEN || '';
  if (!endpoint || !token) return res.status(503).json({success:false,message:'URL atau token Fy_Database belum tersedia di Environment Variables Vercel.'});
  // No additional PIN prompt; authenticated HttpOnly portal session required.
  let session;
  try { session=auth.verify(req); }
  catch (_) { return res.status(503).json({success:false,message:'Login server belum dikonfigurasi di Vercel.'}); }
  if (!session) return res.status(401).json({success:false,message:'Sesi login berakhir. Keluar lalu login kembali melalui halaman utama.'});
  if (method === 'POST' && !auth.isSameOrigin(req)) return res.status(403).json({success:false,message:'Permintaan lintas domain ditolak.'});
  if (method === 'POST' && process.env.HCU_ASSET_V904_WRITES_ENABLED !== 'true') {
    return res.status(403).json({success:false,message:'Mode tulis V9.04 belum diaktifkan. Setelah backup dan uji baca, set HCU_ASSET_V904_WRITES_ENABLED=true di Vercel.'});
  }
  let input = {};
  try {
    if (method === 'POST') {
      input = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      if (typeof input !== 'object' || !input || Array.isArray(input)) throw Error('Payload harus object.');
      if (JSON.stringify(input).length > 25000) return res.status(413).json({success:false,message:'Ukuran payload melebihi batas.'});
    }
  } catch (_) { return res.status(400).json({success:false,message:'Format JSON tidak valid.'}); }
  const action = String((method === 'GET' ? req.query?.action : input.action) || '').toLowerCase().trim();
  const allow = method === 'GET'
    ? ['listassetsv904','assethealthv904']
    : ['saveassetv904','createloanv904','returnloanv904','issueassetloanletterv9058'];
  if (!allow.includes(action)) return res.status(400).json({success:false,message:'Action Aset V9.04 tidak dikenal.'});
  const c = new AbortController();
  const timer = setTimeout(() => c.abort(), method === 'GET' ? TIMEOUT_GET : TIMEOUT_POST);
  try {
    let upstream;
    if (method === 'GET') {
      const url = new URL(endpoint);
      url.searchParams.set('action',action);
      url.searchParams.set('token',token);
      upstream = await fetch(url.toString(),{method:'GET',redirect:'follow',cache:'no-store',signal:c.signal});
    } else {
      upstream = await fetch(endpoint,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({...input,action,updatedBy:session.user,token}),redirect:'follow',signal:c.signal});
    }
    const raw = await upstream.text();
    let data;
    try { data = JSON.parse(raw.replace(/^\uFEFF/,'').trim()); }
    catch (_) { return res.status(502).json({success:false,message:'Respons Apps Script bukan JSON. Pastikan Web App sudah deploy versi dengan API Aset V9.04.'}); }
    if (!upstream.ok) return res.status(502).json({success:false,message:data?.message||`Upstream HTTP ${upstream.status}`});
    return res.status(data?.success === false ? 422 : 200).json(data);
  } catch (e) {
    const timeout = e?.name === 'AbortError';
    return res.status(timeout ? 504 : 502).json({success:false,message:timeout?'Database timeout. Jika menyimpan, refresh data terlebih dahulu sebelum mengulang agar tidak terjadi transaksi ganda.':'Koneksi database gagal. Periksa URL, deployment, dan akses Apps Script.'});
  } finally {clearTimeout(timer);}
};
