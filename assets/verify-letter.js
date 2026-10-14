'use strict';
(async function(){
 const $=id=>document.getElementById(id);const busy=$('loading');
 const fail=message=>{busy.hidden=true;$('error').hidden=false;$('error').textContent=message;};
 const token=new URLSearchParams(location.search).get('token')||'';
 if(!/^SURAT-[A-F0-9]{16}\.(p1|p2)\.[A-Za-z0-9_-]{43}$/.test(token)){fail('QR tidak valid. Silakan pindai ulang QR resmi pada dokumen.');return;}
 try{
  const res=await fetch('/api/verify-letter?token='+encodeURIComponent(token),{method:'GET',cache:'no-store',credentials:'omit',redirect:'follow'});
  const data=await res.json();if(!res.ok||data.success!==true||data.verified!==true)throw Error(data.message||'Kode QR tidak dapat diverifikasi.');
  $('brand').textContent=(data.organization||'PT Jasa Raharja')+'\n'+(data.office||'Kantor Wilayah Sumatera Selatan');
  $('brand').style.whiteSpace='pre-line';
  for(const key of ['number','role','name','job','npp','documentType'])$(key).textContent=String(data[key]||'—');
  const match=String(data.date||'').match(/^(\d{4})-(\d{2})-(\d{2})/);
  $('date').textContent=match?match[3]+'/'+match[2]+'/'+match[1]:String(data.date||'—');
  $('notice').textContent=String(data.notice||'QR ini hanya untuk registrasi internal, bukan pengganti tanda tangan basah.');
  busy.hidden=true;$('result').hidden=false;
 }catch(err){fail(err.message||'Verifikasi tidak dapat diselesaikan saat ini.');}
})();
