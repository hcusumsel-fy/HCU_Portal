// HCU Sumsel Employee API Proxy V8.09
// Normalizes upstream results so the portal never receives a non-JSON response from this route.
const DEFAULT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbygUVZjmB6kwpSG43OYMStr_KxJbuzyXPRxsdytHaLxR0rSXgkxkfeyOTfaVXlgVP8Q/exec';
const GET_TIMEOUT_MS = 18000;
const POST_TIMEOUT_MS = 35000;

function fail(res, status, message) {
  return res.status(status).json({ success: false, message });
}

async function forwardJson(upstream, res) {
  const contentType = upstream.headers?.get?.('content-type') || '';
  const raw = await upstream.text();
  let parsed;
  try {
    parsed = JSON.parse(raw.replace(/^\uFEFF/, '').trim());
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not an object');
  } catch (_) {
    const isHtml = /html/i.test(contentType) || /^\s*<(?:!doctype|html|head|body)/i.test(raw);
    if (upstream.status === 401 || upstream.status === 403) {
      return fail(res, 502, 'Akses Google Apps Script ditolak. Periksa izin deployment Web App dan akun yang menjalankannya.');
    }
    if (upstream.status === 429) {
      return fail(res, 503, 'Layanan Google sedang membatasi permintaan. Coba lagi sesaat.');
    }
    return fail(res, 502, isHtml
      ? 'Database mengembalikan halaman HTML, bukan JSON. Periksa URL Web App Apps Script, akses deployment, dan status layanan Google.'
      : `Database mengembalikan respons bukan JSON (HTTP ${upstream.status}). Coba lagi atau periksa log Apps Script/Vercel.`);
  }
  if (!upstream.ok) {
    return fail(res, [408, 429, 502, 503, 504].includes(upstream.status) ? 503 : 502,
      parsed.message || `Fy_Database tidak tersedia (HTTP ${upstream.status}).`);
  }
  return res.status(parsed.success === false ? 422 : 200).json(parsed);
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const appsScriptUrl = process.env.HCU_DATABASE_APPS_SCRIPT_URL || process.env.HCU_LHU_APPS_SCRIPT_URL || DEFAULT_APPS_SCRIPT_URL;
  const token = process.env.HCU_DATABASE_API_TOKEN || process.env.HCU_LHU_API_TOKEN || '';
  const method = String(req.method || '').toUpperCase();
  if (!['GET','POST'].includes(method)) {
    res.setHeader('Allow', 'GET, POST');
    return fail(res, 405, 'Method not allowed.');
  }
  if (!token && (method === 'POST' || String(req.query?.action || 'health').toLowerCase() !== 'health')) {
    return fail(res, 500, 'Token Fy_Database belum diatur pada Environment Variables Vercel.');
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), method === 'GET' ? GET_TIMEOUT_MS : POST_TIMEOUT_MS);
  try {
    if (method === 'GET') {
      const query = new URLSearchParams();
      for (const [key, val] of Object.entries(req.query || {})) {
        if (key !== 'token' && val != null) query.set(key, String(Array.isArray(val) ? val[0] : val));
      }
      if (String(req.query?.action || 'health').toLowerCase() !== 'health') query.set('token', token);
      const url = new URL(appsScriptUrl);
      for (const [key, val] of query) url.searchParams.set(key, val);
      const upstream = await fetch(url.toString(), { method: 'GET', redirect: 'follow', cache: 'no-store', signal: controller.signal });
      return await forwardJson(upstream, res);
    }
    let input;
    try { input = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {}); }
    catch (_) { return fail(res, 400, 'Format permintaan simpan Pegawai tidak valid.'); }
    if (!input || typeof input !== 'object' || Array.isArray(input)) return fail(res, 400, 'Payload Pegawai tidak valid.');
    // Do not retry POST automatically: upstream might have saved the transaction.
    const upstream = await fetch(appsScriptUrl, {
      method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ ...input, token }), redirect: 'follow', signal: controller.signal
    });
    return await forwardJson(upstream, res);
  } catch (error) {
    if (error?.name === 'AbortError') return fail(res, 504, 'Koneksi Fy_Database melewati batas waktu. Coba baca ulang; jika sedang menyimpan, periksa datanya sebelum mengulang.');
    return fail(res, 502, 'Koneksi ke Google Apps Script gagal. Periksa deployment Apps Script, konfigurasi Vercel, dan koneksi jaringan.');
  } finally {
    clearTimeout(timer);
  }
};
