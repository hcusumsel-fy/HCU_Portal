const DEFAULT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbygUVZjmB6kwpSG43OYMStr_KxJbuzyXPRxsdytHaLxR0rSXgkxkfeyOTfaVXlgVP8Q/exec';

module.exports = async function handler(req, res) {
  const appsScriptUrl = process.env.HCU_LHU_APPS_SCRIPT_URL || DEFAULT_APPS_SCRIPT_URL;
  const token = process.env.HCU_LHU_API_TOKEN || '';

  try {
    if (req.method === 'GET') {
      const action = String(req.query.action || 'health');
      if (action !== 'health' && !token) {
        return res.status(500).json({
          success: false,
          message: 'HCU_LHU_API_TOKEN belum diatur pada Environment Variables Vercel.'
        });
      }

      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(req.query || {})) {
        if (value !== undefined && value !== null && key !== 'token') {
          params.set(key, Array.isArray(value) ? value[0] : String(value));
        }
      }
      if (action !== 'health') params.set('token', token);

      const upstream = await fetch(`${appsScriptUrl}?${params.toString()}`, {
        method: 'GET',
        redirect: 'follow',
        cache: 'no-store'
      });
      const text = await upstream.text();
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.status(upstream.ok ? 200 : 502).send(text);
    }

    if (req.method === 'POST') {
      if (!token) {
        return res.status(500).json({
          success: false,
          message: 'HCU_LHU_API_TOKEN belum diatur pada Environment Variables Vercel.'
        });
      }

      const input = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const payload = { ...input, token };
      const upstream = await fetch(appsScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        redirect: 'follow'
      });
      const text = await upstream.text();
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.status(upstream.ok ? 200 : 502).send(text);
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ success: false, message: 'Method not allowed.' });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error && error.message ? error.message : 'Proxy database gagal memproses permintaan.'
    });
  }
};
