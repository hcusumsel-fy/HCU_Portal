// FY HCU-Portal V9.07.4 — QR verifikasi URL + first-print activation from Kartu Kontrol; single-source Fy_Database live client using proven V9.04 API. All authoritative asset data comes from /api/assets.
// This script is loaded BEFORE the existing application's final inline initialization.
const HCU_A904_API = '/api/assets';
let hcuA904Actor='';
function hcuA904Operator(){return (sessionStorage.getItem('hcu_sumsel_user')||'Petugas HCU').trim();}
const hcuA904State={assets:[],vehicles:[],computers:[],loans:[],employees:[],revisions:{},ready:false,error:'',time:0,pending:null,saving:false,lastSave:null,issuedLetters:[]};
const hcuA904S=x=>String(x===null||x===undefined?'':x);
const hcuA904Esc=x=>hcuA904S(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hcuA904Num=x=>x===''?'—':new Intl.NumberFormat('id-ID').format(Number(x)||0);
const hcuA904ShortDate=x=>{const s=hcuA904S(x);if(!s)return '—';const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s);return m?m[3]+'/'+m[2]+'/'+m[1]:s;};
const hcuA904Today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
async function hcuA904Req(action,data=null,options={}){
 const q=new URLSearchParams({action,...(options?.params||{})});
 const url=data?HCU_A904_API:HCU_A904_API+'?'+q.toString();
 // Timeout hanya diaktifkan untuk panggilan yang memintanya (misalnya surat).
 // Abort tidak menjamin server belum memproses surat; periksa register sebelum mengulang.
 const timeoutMs=Number(options?.timeoutMs)||0;
 const controller=timeoutMs>0?new AbortController():null;
 const timer=controller?setTimeout(()=>controller.abort(),timeoutMs):null;
 try{
  const init=data?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...data,action}),credentials:'same-origin',cache:'no-store'}:{credentials:'same-origin',cache:'no-store'};
  if(controller)init.signal=controller.signal;
  const response=await fetch(url,init);
  const raw=await response.text();let result;
  try{result=JSON.parse(raw)}catch(_){throw Error('API Aset belum tersedia / respons tidak berupa JSON. Pastikan Apps Script sudah deploy versi V9.04.');}
  if(!response.ok||!result.success)throw Error(result.message||`Database gagal (HTTP ${response.status}).`);
  return result;
 }catch(err){
  if(controller&&err?.name==='AbortError')throw Error('Permintaan penerbitan terlalu lama. Nomor mungkin sudah tercatat. Tutup form, buka kembali modul Pinjam Pakai, dan periksa nomor surat sebelum mencoba lagi.');
  throw err;
 }finally{if(timer!==null)clearTimeout(timer);}
}
async function hcuA904Load(force=false){
 if(!force&&hcuA904State.ready&&Date.now()-hcuA904State.time<25000)return true;
 if(hcuA904State.pending)return hcuA904State.pending;
 hcuA904State.pending=(async()=>{
  try{
   const p=await hcuA904Req('listAssetsV904');
   if(!Array.isArray(p.assets)||!Array.isArray(p.vehicles)||!Array.isArray(p.computers)||!Array.isArray(p.loans)||!Array.isArray(p.employees))throw Error('Payload database tidak lengkap.');
   if(p.source!=='Fy_Database')throw Error('Sumber data bukan Fy_Database.');
   hcuA904State.assets=p.assets;hcuA904State.vehicles=p.vehicles;
   hcuA904State.computers=p.computers;hcuA904State.loans=p.loans;hcuA904State.employees=p.employees;hcuA904State.revisions=p.revisions||{};hcuA904State.issuedLetters=p.issuedLetters||[];
   hcuA904State.ready=true;hcuA904State.error='';hcuA904State.time=Date.now();return true;
  }catch(e){hcuA904State.error=e.message||'Database tidak terbaca';hcuA904State.ready=false;return false;}
  finally{hcuA904State.pending=null;}
 })();return hcuA904State.pending;
}
function hcuA904LiveBanner(){
 const save=hcuA904State.lastSave;
 const notice=save&&Date.now()-save.at<15000?`<div class="a905-save-notice" role="status" aria-live="polite">✓ ${hcuA904Esc(save.message)}</div>`:'';
 return `<div class="a904-banner"><b>● Fy_Database LIVE</b> <span>Sumber data utama untuk Master Aset, Pajak & Asuransi dan Pinjam Pakai. Data dibaca otomatis saat modul dibuka dan setelah penyimpanan.</span></div>${notice}`;
}
function hcuA904SetFeedback(kind,message,step=0){
 const el=document.getElementById('a904SaveMsg');if(!el)return;
 el.className='a904-feedback a905-feedback-'+kind;
 el.setAttribute('role','status');el.setAttribute('aria-live','polite');
 const pct=kind==='success'?100:(kind==='progress'?Math.max(10,Math.min(90,step===1?40:75)):0);
 el.innerHTML=`<div class="a905-feedback-row"><span class="a905-feedback-mark ${kind==='progress'?'a905-spin':''}">${kind==='success'?'✓':kind==='progress'?'⟳':'!'}</span><span>${hcuA904Esc(message)}</span></div>${kind==='progress'?`<div class="a905-progress-track"><span style="width:${pct}%"></span></div>`:''}`;
}
function hcuA904RememberSave(message){hcuA904State.lastSave={message,at:Date.now()};}
function hcuA904ErrorPage(page){
 const names={inventaris:'Master Aset',compliance:'Pajak & Asuransi',pinjam:'Pinjam Pakai'};
 return `<div class="hero"><div><h1>${hcuA904Esc(names[page]||'Aset')} <span class="a904-label">Fy_Database Live</span></h1><p>Halaman ini hanya menggunakan database produksi, bukan arsip browser.</p></div></div><div class="panel a905-error-box" role="alert"><h3>Data Fy_Database belum dapat ditampilkan</h3><p>${hcuA904Esc(hcuA904State.error||'Koneksi belum berhasil.')}</p><p>Periksa koneksi internet atau sesi login portal. Data lama tidak ditampilkan sebagai pengganti agar tidak keliru dianggap data terbaru.</p><button class="btn secondary" type="button" onclick="show('${page}')">Coba Lagi</button></div>`;
}

function hcuA904Modal(){return `<div class="modal" id="a904Modal" role="dialog" aria-modal="true" aria-label="Form Aset Fy_Database" onclick="if(event.target===this)hcuA904Close()"><div class="modal-card a904-dialog"><div class="modal-head"><div><h2 id="a904Title">Form Master Aset</h2><p>Perubahan langsung disimpan ke Fy_Database.</p></div><button type="button" class="close" onclick="hcuA904Close()">×</button></div><div class="modal-body" id="a904ModalBody"></div></div></div>`;}
function hcuA904PIC(a){
 if(a.PIC_TIPE==='PEGAWAI'){
  const emp=hcuA904State.employees.find(e=>e.EMP_ID===a.PIC_EMP_ID);
  return emp?.NAMA||a.PIC_NAMA||a.PIC_EMP_ID||'—';
 }
 return a.PIC_TIPE==='TIDAK_ADA'?'—':a.PIC_NAMA||a.PIC_LAMA||'—';
}
function hcuA904LoanActive(id){return hcuA904State.loans.some(x=>x.ASSET_ID===id&&x.STATUS_PINJAM==='AKTIF');}
// STATUS_ASET=AKTIF on vehicles means operationally active, NOT necessarily available.
// A vehicle may already be assigned to a legacy PIC even when no Pinjam_Pakai row exists.
function hcuA904IsActiveVehicle(a){return !!a&&['R2','R4'].includes(a.KATEGORI)&&String(a.STATUS_ASET||'').trim().toUpperCase()==='AKTIF';}
function hcuA904HasHolder(a){return !!a&&(!!String(a.PIC_EMP_ID||'').trim()||(['PEGAWAI','UNIT','EKSTERNAL'].includes(String(a.PIC_TIPE||'').trim().toUpperCase())&&!!String(a.PIC_NAMA||a.PIC_EMP_ID||a.PIC_LAMA||'').trim()));}
function hcuA904LegacyReturnable(a){if(!a||hcuA904LoanActive(a.ASSET_ID))return false;const status=String(a.STATUS_ASET||'').trim().toLowerCase();return status==='dipinjam'||(hcuA904IsActiveVehicle(a)&&hcuA904HasHolder(a));}
function hcuA904LoanEligible(a){
 if(!a||hcuA904LoanActive(a.ASSET_ID)||hcuA904HasHolder(a))return false;
 const status=String(a.STATUS_ASET||'').trim().toLowerCase();
 return ['dikembalikan','tersedia','di gudang'].includes(status)||hcuA904IsActiveVehicle(a);
}
function hcuA904AssetRow(a){return `<tr class="clickable" onclick="hcuA904Open('${hcuA904Esc(a.ASSET_ID)}')"><td><b>${hcuA904Esc(a.ASSET_ID)}</b><span class="a904-sub">${hcuA904Esc(a.NOMOR_ASET||'—')}</span></td><td><b>${hcuA904Esc(a.NAMA_ASET)}</b><span class="a904-sub">${hcuA904Esc(a.KATEGORI==='KOMPUTER'?a.NO_SERI:a.NOPOL)}</span></td><td>${hcuA904Esc(a.KATEGORI)}</td><td>${hcuA904Esc(hcuA904PIC(a))}</td><td>${hcuA904Esc(a.KANTOR||a.LOKASI_ASET||'—')}</td><td>${hcuA904Esc(a.STATUS_ASET||'—')}</td><td>${hcuA904Esc(a.KONDISI||'—')}</td><td><div style="display:flex;gap:5px;flex-wrap:wrap"><button type="button" class="a904-small" aria-label="Lihat kartu kontrol ${hcuA904Esc(a.NAMA_ASET)}" onclick="event.stopPropagation();hcuA9063OpenAssetControl(${hcuA904Esc(JSON.stringify(a.ASSET_ID))})">▤ Kartu Kontrol</button><button type="button" class="a904-small" onclick="event.stopPropagation();hcuA904Open('${hcuA904Esc(a.ASSET_ID)}')">✎ Edit</button>${hcuA904LegacyReturnable(a)?`<button type="button" class="a904-small" onclick="event.stopPropagation();hcuA904LegacyReturnOpen('${hcuA904Esc(a.ASSET_ID)}')">↩ Kembalikan</button>`:''}</div></td></tr>`;}
function hcuA904AssetPage(){
 const arr=hcuA904State.assets;
 const count=t=>arr.filter(a=>a.KATEGORI===t).length;
 return `${hcuA904LiveBanner()}<div class="hero"><div><h1>Master Aset <span class="a904-label">V9.06.5</span></h1><p>Inventaris terpadu — Komputer, R2, dan R4. PIC terhubung Master Pegawai.</p></div><div class="chip">${arr.length} aset</div></div>
 <div class="v9-metrics"><div class="v9-tile"><small>TOTAL ASET</small><strong>${arr.length}</strong><span>Data live</span></div><div class="v9-tile"><small>KOMPUTER</small><strong>${count('KOMPUTER')}</strong><span>Perangkat</span></div><div class="v9-tile"><small>R2</small><strong>${count('R2')}</strong><span>Kendaraan</span></div><div class="v9-tile"><small>R4</small><strong>${count('R4')}</strong><span>Kendaraan</span></div></div>
 <div class="panel" style="margin-top:16px"><div class="vehicle-grid-head"><div><h3>Grid Master Aset</h3><span>Klik baris untuk melihat dan memperbarui data pada Fy_Database.</span></div><div style="display:flex;gap:7px;flex-wrap:wrap"><button class="vehicle-backup-btn" type="button" onclick="hcuA904Export('assets')">⬇ Excel Aset</button><button class="btn success" type="button" onclick="hcuA904Open('')">+ Tambah Aset</button></div></div>
 <div class="toolbar"><input id="a904AssetSearch" placeholder="Cari ID, nomor aset, Nopol, PIC atau lokasi" oninput="hcuA904FilterAssets()"><select id="a904AssetCategory" onchange="hcuA904FilterAssets()"><option value="">Semua Jenis</option><option>KOMPUTER</option><option>R2</option><option>R4</option></select><select id="a904AssetStatus" onchange="hcuA904FilterAssets()"><option value="">Semua Status</option>${[...new Set(arr.map(a=>a.STATUS_ASET))].filter(Boolean).sort().map(x=>`<option>${hcuA904Esc(x)}</option>`).join('')}</select></div>
 <div class="countline" id="a904AssetCount"></div><div class="table-wrap"><table class="tbl"><thead><tr><th>ID / No. Aset</th><th>Nama / Identitas</th><th>Jenis</th><th>PIC</th><th>Kantor / Lokasi</th><th>Status</th><th>Kondisi</th><th>Aksi</th></tr></thead><tbody id="a904AssetBody"></tbody></table></div></div>${hcuA904Modal()}`;
}
function hcuA904FilterAssets(){const out=document.getElementById('a904AssetBody');if(!out)return;
 const q=(document.getElementById('a904AssetSearch')?.value||'').toLowerCase(),cat=document.getElementById('a904AssetCategory')?.value||'',stat=document.getElementById('a904AssetStatus')?.value||'';
 const list=hcuA904State.assets.filter(a=>{const t=[...Object.values(a),hcuA904PIC(a)].join(' ').toLowerCase();return (!cat||a.KATEGORI===cat)&&(!stat||a.STATUS_ASET===stat)&&(!q||t.includes(q));});
 out.innerHTML=list.length?list.map(hcuA904AssetRow).join(''):'<tr><td colspan="8">Tidak ada data.</td></tr>';
 document.getElementById('a904AssetCount').textContent=`${list.length} dari ${hcuA904State.assets.length} aset`;
}
function hcuA904Vehicle(a){return hcuA904State.vehicles.find(v=>v.ASSET_ID===a.ASSET_ID)||{};}
function hcuA904CompliancePage(){
 const vehicles=hcuA904State.assets.filter(a=>a.KATEGORI==='R2'||a.KATEGORI==='R4');
 const late=(v,field)=>!!v[field]&&v[field]<hcuA904Today();
 const overdue=vehicles.filter(a=>late(hcuA904Vehicle(a),'PAJAK_SAMPAI')).length;
 return `${hcuA904LiveBanner()}<div class="hero"><div><h1>Pajak & Asuransi</h1><p>Data kendaraan otomatis mengikuti Master Aset — tidak ada sumber kendaraan terpisah.</p></div><div class="chip">${vehicles.length} kendaraan</div></div>
 <div class="v9-metrics"><div class="v9-tile"><small>TOTAL KENDARAAN</small><strong>${vehicles.length}</strong></div><div class="v9-tile"><small>PAJAK LEWAT TANGGAL</small><strong>${overdue}</strong><span>Seluruh status aset</span></div><div class="v9-tile"><small>STATUS VALIDASI PAJAK</small><strong>${vehicles.filter(a=>hcuA904Vehicle(a).STATUS_VALIDASI_PAJAK==='VALID').length}</strong><span>Valid</span></div><div class="v9-tile"><small>PERLU PEMERIKSAAN</small><strong>${vehicles.filter(a=>hcuA904Vehicle(a).STATUS_VALIDASI_PAJAK!=='VALID').length}</strong></div></div>
 <div class="panel" style="margin-top:16px"><div class="vehicle-grid-head"><div><h3>Grid Pajak & Asuransi — Fy_Database</h3><span>Nopol, Kantor, PIC, Pajak, Polis dan Status Aset terhubung melalui ASSET_ID.</span></div><button class="vehicle-backup-btn" onclick="hcuA904Export('compliance')">⬇ Excel Pajak</button></div>
 <div class="toolbar"><input id="a904VehicleSearch" placeholder="Cari Nopol, PIC, nomor polis" oninput="hcuA904FilterVehicles()"><select id="a904VehicleScope" onchange="hcuA904FilterVehicles()"><option value="all">Semua Kendaraan</option><option value="active">Hanya Aktif</option></select><select id="a904VehicleVerify" onchange="hcuA904FilterVehicles()"><option value="">Semua Validasi</option><option value="VALID">Valid</option><option value="BELUM_REVIEW">Belum review</option><option value="PERLU_KOREKSI">Perlu koreksi</option></select></div><div class="countline" id="a904VehicleCount"></div>
 <div class="table-wrap"><table class="tbl"><thead><tr><th>Nopol / Jenis</th><th>Kantor / PIC</th><th>Pajak s.d.</th><th>Nominal</th><th>STNK s.d.</th><th>Polis s.d.</th><th>Premi</th><th>Nomor Polis</th><th>Status Aset</th><th>Validasi</th><th>Aksi</th></tr></thead><tbody id="a904VehicleBody"></tbody></table></div></div>${hcuA904Modal()}`;
}
function hcuA904FilterVehicles(){const tbody=document.getElementById('a904VehicleBody');if(!tbody)return;
 const q=(document.getElementById('a904VehicleSearch')?.value||'').toLowerCase(),scope=document.getElementById('a904VehicleScope')?.value,review=document.getElementById('a904VehicleVerify')?.value;
 const arr=hcuA904State.assets.filter(a=>['R2','R4'].includes(a.KATEGORI)).filter(a=>{const v=hcuA904Vehicle(a);return (scope!=='active'||String(a.STATUS_ASET).toUpperCase()==='AKTIF')&&(!review||v.STATUS_VALIDASI_PAJAK===review)&&(!q||[...Object.values(a),...Object.values(v),hcuA904PIC(a)].join(' ').toLowerCase().includes(q))});
 tbody.innerHTML=arr.map(a=>{const v=hcuA904Vehicle(a);return `<tr><td><b>${hcuA904Esc(a.NOPOL||'Tanpa Nopol')}</b><span class="a904-sub">${hcuA904Esc(a.NAMA_ASET)} • ${hcuA904Esc(a.ASSET_ID)}</span></td><td>${hcuA904Esc(a.KANTOR||'—')}<span class="a904-sub">${hcuA904Esc(hcuA904PIC(a))}</span></td><td>${hcuA904Esc(hcuA904ShortDate(v.PAJAK_SAMPAI))}</td><td>${hcuA904Num(v.NILAI_PAJAK)}</td><td>${hcuA904Esc(hcuA904ShortDate(v.STNK_SAMPAI))}</td><td>${hcuA904Esc(hcuA904ShortDate(v.POLIS_AKHIR))}</td><td>${hcuA904Num(v.PREMI)}</td><td>${hcuA904Esc(v.NO_POLIS||'—')}</td><td>${hcuA904Esc(a.STATUS_ASET)}</td><td>${hcuA904Esc(v.STATUS_VALIDASI_PAJAK||'BELUM_REVIEW')}</td><td><button class="a904-small" onclick="hcuA904Open('${hcuA904Esc(a.ASSET_ID)}','pajak')">✎ Edit</button></td></tr>`;}).join('')||'<tr><td colspan="11">Data tidak ditemukan.</td></tr>';
 document.getElementById('a904VehicleCount').textContent=`Menampilkan ${arr.length} kendaraan.`;
}
function hcuA904Field(label,k,val='',opt={}){const type=opt.type||'text';const disabled=opt.disabled?'disabled':'';
 return `<div class="field"><label>${hcuA904Esc(label)}</label><input data-a904="${hcuA904Esc(k)}" type="${type}" value="${hcuA904Esc(val)}" ${disabled} ${type==='number'?'min="0" step="any"':''}></div>`;
}
function hcuA904Select(label,k,val,opts,disabled=false){return `<div class="field"><label>${hcuA904Esc(label)}</label><select data-a904="${hcuA904Esc(k)}" ${disabled?'disabled':''}>${opts.map(s=>`<option value="${hcuA904Esc(s)}" ${s===val?'selected':''}>${hcuA904Esc(s)}</option>`).join('')}</select></div>`;}
// V9.06.1: semua kondisi aset dan transaksi memakai pilihan yang sama.
// Nilai kondisi historis yang belum standar tidak pernah diubah secara otomatis.
const HCU_A9061_CONDITIONS=Object.freeze(['Baik','Rusak Ringan','Rusak Berat']);
const HCU_A9061_KEEP_LEGACY='__HCU_A9061_KEEP_OLD__';
function hcuA9061ConditionSelect(label,key,value='',preserveOld=false){
 const old=hcuA904S(value).trim();
 const known=HCU_A9061_CONDITIONS.includes(old);
 const legacy=Boolean(preserveOld&&old&&!known);
 const initial=known?old:(legacy?HCU_A9061_KEEP_LEGACY:'');
 const options=[`<option value="" ${initial?'':'selected'} disabled>— Pilih kondisi —</option>`];
 if(legacy)options.push(`<option value="${HCU_A9061_KEEP_LEGACY}" selected disabled>Data lama: ${hcuA904Esc(old)} (tidak diubah)</option>`);
 options.push(...HCU_A9061_CONDITIONS.map(v=>`<option value="${hcuA904Esc(v)}" ${initial===v?'selected':''}>${hcuA904Esc(v)}</option>`));
 return `<div class="field"><label>${hcuA904Esc(label)}</label><select data-a904="${hcuA904Esc(key)}" required>${options.join('')}</select>${legacy?'<small>Kondisi historis dipertahankan sampai kamu memilih kondisi baru.</small>':''}</div>`;
}
function hcuA9061ValidCondition(value){return HCU_A9061_CONDITIONS.includes(hcuA904S(value).trim());}
function hcuA904EmployeeOptions(selected){const source=hcuA904State.employees;return `<option value="">— Pilih pegawai —</option>`+source.filter(e=>e.EMP_ID).sort((a,b)=>String(a.NAMA).localeCompare(String(b.NAMA),'id')).map(e=>`<option value="${hcuA904Esc(e.EMP_ID)}" ${selected===e.EMP_ID?'selected':''}>${hcuA904Esc(e.NAMA)} • ${hcuA904Esc(e.Loket_Kerja||'')}</option>`).join('');}
function hcuA904Open(id='',focus=''){const a=hcuA904State.assets.find(x=>x.ASSET_ID===id)||{KATEGORI:'KOMPUTER',PIC_TIPE:'TIDAK_ADA',STATUS_ASET:'Dikembalikan',KONDISI:'',KEPEMILIKAN:'MILIK_JR'};
 const details=a.KATEGORI==='KOMPUTER'?hcuA904State.computers.find(x=>x.ASSET_ID===id)||{}:hcuA904Vehicle(a);
 const title=document.getElementById('a904Title'),box=document.getElementById('a904ModalBody');if(!title||!box)return;
 title.textContent=id?'Edit '+id+' • Fy_Database':'Tambah Aset • Fy_Database';
 box.innerHTML=`<div class="v9-dialog-note"><b>${id?'Memperbarui aset terdaftar':'Menambahkan aset baru'}</b> • Setiap penyimpanan langsung diperiksa dan ditulis ke database pusat. Nomor/Nopol tidak boleh duplikat.</div>
 <div class="v9-section-title">Master Aset</div><div class="v9-form-grid">
 ${hcuA904Select('Kategori','KATEGORI',a.KATEGORI,['KOMPUTER','R2','R4'],!!id)}
 ${hcuA904Field('Nama Aset *','NAMA_ASET',a.NAMA_ASET)}${hcuA904Field('Nomor Aset','NOMOR_ASET',a.NOMOR_ASET)}${hcuA904Field('Tahun','TAHUN',a.TAHUN)}
 ${hcuA904Select('Kepemilikan','KEPEMILIKAN',a.KEPEMILIKAN||'MILIK_JR',['MILIK_JR','SEWA'])}
 ${hcuA904Select('Status Aset','STATUS_ASET',a.STATUS_ASET||'Dikembalikan',[...new Set(['Dikembalikan','Dipinjam','Perbaikan','Tersedia','AKTIF','LELANG','Hilang',a.STATUS_ASET].filter(Boolean))])}
 ${hcuA9061ConditionSelect('Kondisi','KONDISI',a.KONDISI,!!id)}${hcuA904Field('Lokasi Fisik','LOKASI_ASET',a.LOKASI_ASET)}${hcuA904Field('Kantor / Cabang','KANTOR',a.KANTOR)}
 ${hcuA904Select('Tipe PIC','PIC_TIPE',a.PIC_TIPE||'TIDAK_ADA',['TIDAK_ADA','PEGAWAI','UNIT','EKSTERNAL'])}
 <div class="field"><label>Pegawai / PIC (EMP_ID)</label><select data-a904="PIC_EMP_ID">${hcuA904EmployeeOptions(a.PIC_EMP_ID)}</select></div>
 ${hcuA904Field('Nama PIC Nonpegawai','PIC_NAMA',a.PIC_NAMA)}
 ${hcuA904Field('Nomor Seri Komputer','NO_SERI',a.NO_SERI)}${hcuA904Field('Nopol','NOPOL',a.NOPOL)}
 <div class="field span2"><label>Keterangan</label><textarea data-a904="KETERANGAN" rows="2">${hcuA904Esc(a.KETERANGAN)}</textarea></div></div>
 <div id="a904VehicleFields" style="${a.KATEGORI==='KOMPUTER'?'display:none':''}"><div class="v9-section-title">Pajak & Asuransi</div><div class="v9-form-grid">
 ${hcuA904Field('Nomor Rangka','NO_RANGKA',details.NO_RANGKA)}${hcuA904Field('Nomor Mesin','NO_MESIN',details.NO_MESIN)}
 ${hcuA904Field('Pajak s.d.','PAJAK_SAMPAI',details.PAJAK_SAMPAI,{type:'date'})}${hcuA904Field('STNK s.d.','STNK_SAMPAI',details.STNK_SAMPAI,{type:'date'})}
 ${hcuA904Field('Nominal Pajak','NILAI_PAJAK',details.NILAI_PAJAK,{type:'number'})}
 ${hcuA904Field('Polis Awal','POLIS_AWAL',details.POLIS_AWAL,{type:'date'})}${hcuA904Field('Polis Akhir','POLIS_AKHIR',details.POLIS_AKHIR,{type:'date'})}
 ${hcuA904Field('Premi','PREMI',details.PREMI,{type:'number'})}${hcuA904Field('Nomor Polis','NO_POLIS',details.NO_POLIS)}
 ${hcuA904Select('Validasi Pajak','STATUS_VALIDASI_PAJAK',details.STATUS_VALIDASI_PAJAK||'BELUM_REVIEW',['BELUM_REVIEW','VALID','PERLU_KOREKSI'])}
 ${hcuA904Field('Verifikator Pajak','VERIFIKATOR_PAJAK',details.VERIFIKATOR_PAJAK)}
 <div class="field span2"><label>Catatan Validasi Pajak</label><textarea data-a904="CATATAN_PAJAK" rows="2">${hcuA904Esc(details.CATATAN_PAJAK)}</textarea></div></div></div>
 <div class="v9-dialog-actions"><button type="button" class="btn secondary" onclick="hcuA904Close()">Batal</button><button type="button" class="btn success" id="a904SaveBtn" onclick="hcuA904Save('${hcuA904Esc(id)}')">${id?'Simpan Perubahan':'Tambah Aset'}</button></div><div class="a904-feedback" id="a904SaveMsg"></div>`;
 const catField=box.querySelector('[data-a904="KATEGORI"]');
 catField?.addEventListener('change',()=>{const veh=catField.value!=='KOMPUTER';box.querySelector('#a904VehicleFields').style.display=veh?'':'none';});
 if(focus==='pajak')box.querySelector('#a904VehicleFields')?.scrollIntoView({block:'center'});
 document.getElementById('a904Modal').classList.add('show');
}
function hcuA904Close(){if(hcuA904State.saving)return;document.getElementById('a904Modal')?.classList.remove('show');}
async function hcuA904Save(id){
 if(hcuA904State.saving)return;
 const box=document.getElementById('a904ModalBody'),btn=document.getElementById('a904SaveBtn');if(!box)return;
 const vals={};box.querySelectorAll('[data-a904]').forEach(el=>{if(!el.disabled)vals[el.dataset.a904]=el.value.trim()});
 const originalAsset=hcuA904State.assets.find(a=>a.ASSET_ID===id);
 const category=vals.KATEGORI||originalAsset?.KATEGORI;
 // Boleh mengedit field lain tanpa menimpa kondisi historis yang belum standar.
 const preservingCondition=vals.KONDISI===HCU_A9061_KEEP_LEGACY&&!!originalAsset;
 if(preservingCondition)vals.KONDISI=hcuA904S(originalAsset.KONDISI);
 if(!hcuA9061ValidCondition(vals.KONDISI)&&!preservingCondition){hcuA904SetFeedback('error','Pilih Kondisi: Baik, Rusak Ringan, atau Rusak Berat.');return;}
 const masterKeys=['NAMA_ASET','NOMOR_ASET','TAHUN','KEPEMILIKAN','STATUS_ASET','KONDISI','LOKASI_ASET','KANTOR','PIC_TIPE','PIC_EMP_ID','PIC_NAMA','NO_SERI','NOPOL','KETERANGAN'];
 const detailKeys=['NO_RANGKA','NO_MESIN','PAJAK_SAMPAI','STNK_SAMPAI','NILAI_PAJAK','POLIS_AWAL','POLIS_AKHIR','PREMI','NO_POLIS','STATUS_VALIDASI_PAJAK','VERIFIKATOR_PAJAK','CATATAN_PAJAK'];
 const asset={ASSET_ID:id||'',KATEGORI:category};masterKeys.forEach(k=>asset[k]=vals[k]||'');
 const detail={};detailKeys.forEach(k=>detail[k]=vals[k]||'');
 if(!asset.NAMA_ASET){hcuA904SetFeedback('error','Nama aset wajib diisi.');return;}
 if(asset.PIC_TIPE==='PEGAWAI'&&!asset.PIC_EMP_ID){hcuA904SetFeedback('error','Pilih PIC dari Master Pegawai.');return;}
 if(category!=='KOMPUTER'&&detail.POLIS_AWAL&&detail.POLIS_AKHIR&&detail.POLIS_AWAL>detail.POLIS_AKHIR){hcuA904SetFeedback('error','Tanggal awal polis tidak boleh melebihi akhir.');return;}
 let operator;
 try{operator=hcuA904Operator();}catch(e){hcuA904SetFeedback('error',e.message);return;}
 hcuA904State.saving=true;if(btn){btn.disabled=true;btn.dataset.label=btn.textContent;btn.textContent='⟳ Sedang menyimpan...';}
 hcuA904SetFeedback('progress','Tahap 1/2 — Menyimpan perubahan ke Fy_Database. Mohon tunggu...',1);
 let confirmed=false;
 try{
  const result=await hcuA904Req('saveAssetV904',{asset,detail,expectedRevision:id?hcuA904State.revisions[id]:'',updatedBy:operator});
  hcuA904SetFeedback('progress','Tahap 2/2 — Membaca ulang untuk memverifikasi data tersimpan...',2);
  const ok=await hcuA904Load(true);
  if(!ok)throw Error('Server merespons penyimpanan, tetapi pembacaan ulang gagal. Periksa data sebelum mencoba menyimpan lagi: '+hcuA904State.error);
  const message=result.message|| (id?'Perubahan aset berhasil disimpan ke Fy_Database.':'Aset baru berhasil ditambahkan ke Fy_Database.');
  hcuA904SetFeedback('success',message);hcuA904RememberSave(message);
  await new Promise(resolve=>setTimeout(resolve,850));
  hcuA904State.saving=false;
  hcuA904Close();await show(currentPage,{skipDatabaseSync:true,skipAssetSync:true});
  toast(message,'success');
 }catch(e){
  hcuA904SetFeedback('error',e.message||'Penyimpanan belum dapat dikonfirmasi.');
  toast('Periksa penyimpanan: '+(e.message||'Terjadi kesalahan'),'error');
 }finally{
  hcuA904State.saving=false;
  if(btn&&btn.isConnected){btn.disabled=false;btn.textContent=btn.dataset.label||'Simpan';}
 }
}
function hcuA904ActiveVehicleRow(a){
 const holder=hcuA904HasHolder(a),loan=hcuA904LoanActive(a.ASSET_ID);
 const state=loan?'Transaksi Pinjam Pakai aktif':holder?'PIC lama tercatat':'Belum ada PIC';
 const actions=`<button class="a904-small" type="button" onclick="hcuA904Open('${hcuA904Esc(a.ASSET_ID)}')">✎ Edit</button>`+
 (hcuA904LegacyReturnable(a)?` <button class="a904-small" type="button" onclick="hcuA904LegacyReturnOpen('${hcuA904Esc(a.ASSET_ID)}')">↩ Pengembalian PIC Lama</button>`:'')+
 (hcuA904LoanEligible(a)?` <button class="a904-small" type="button" onclick="hcuA904LoanOpen('${hcuA904Esc(a.ASSET_ID)}')">+ Serah Terima</button>`:'');
 return `<tr><td><b>${hcuA904Esc(a.ASSET_ID)}</b><span class="a904-sub">${hcuA904Esc(a.NOMOR_ASET||'—')}</span></td><td>${hcuA904Esc(a.KATEGORI)}</td><td><b>${hcuA904Esc(a.NAMA_ASET)}</b><span class="a904-sub">${hcuA904Esc(a.NOPOL||'—')}</span></td><td>${hcuA904Esc(hcuA904PIC(a))}</td><td>${hcuA904Esc(a.KANTOR||a.LOKASI_ASET||'—')}</td><td>AKTIF<span class="a904-sub">${hcuA904Esc(state)}</span></td><td>${actions}</td></tr>`;
}
function hcuA904FilterActiveVehicles(){
 const body=document.getElementById('a904ActiveVehicleBody');if(!body)return;
 const all=hcuA904State.assets.filter(hcuA904IsActiveVehicle);
 const q=String(document.getElementById('a904ActiveVehicleSearch')?.value||'').trim().toLowerCase();
 const cat=String(document.getElementById('a904ActiveVehicleCategory')?.value||'');
 const filtered=all.filter(a=>(!cat||a.KATEGORI===cat)&&(!q||[...Object.values(a),hcuA904PIC(a)].join(' ').toLowerCase().includes(q)));
 body.innerHTML=filtered.map(hcuA904ActiveVehicleRow).join('')||'<tr><td colspan="7">Tidak ada kendaraan AKTIF sesuai filter.</td></tr>';
 const label=document.getElementById('a904ActiveVehicleCount');if(label)label.textContent=`Menampilkan ${filtered.length} dari ${all.length} kendaraan AKTIF (R2/R4).`;
}
// V9.06.2 - Kartu Kontrol riwayat pemakaian aset, READ ONLY.
// Semua kartu dikaitkan berdasarkan ASSET_ID, bukan nama aset/PIC.
// Lokasi dan PIC saat ini selalu berasal dari Master_Aset; tanggal historis dari Pinjam_Pakai.
function hcuA9062OpenControl(loanId){
 const selected=hcuA904State.loans.find(x=>x.PINJAM_ID===loanId);
 if(!selected){toast('Transaksi pinjam pakai tidak ditemukan pada data saat ini.','error');return;}
 hcuA9063OpenAssetControl(selected.ASSET_ID);
}
// V9.06.3: akses Kartu Kontrol langsung dari setiap baris Master Aset.
// Memanfaatkan modal/riwayat yang sama dengan Riwayat Pinjam Pakai; tidak menulis database.
function hcuA9063OpenAssetControl(assetId){
 const asset=hcuA904State.assets.find(x=>x.ASSET_ID===assetId);
 if(!asset){toast('Aset tidak ditemukan pada Fy_Database yang sedang dibaca.','error');return;}
 const selected={ASSET_ID:assetId};
 const modal=document.getElementById('a904Modal');
 const body=document.getElementById('a904ModalBody');
 const heading=document.getElementById('a904Title');
 if(!selected||!modal||!body||!heading)return;
 const history=hcuA904State.loans.filter(x=>x.ASSET_ID===selected.ASSET_ID)
  .slice().sort((a,b)=>String(a.TANGGAL_SERAH||'').localeCompare(String(b.TANGGAL_SERAH||''))||String(a.PINJAM_ID||'').localeCompare(String(b.PINJAM_ID||'')));
 const currentPIC=asset?hcuA904PIC(asset):'Tidak ditemukan di Master Aset';
 const currentLocation=asset?(asset.LOKASI_ASET||asset.KANTOR||'Belum tercatat'):'Tidak ditemukan di Master Aset';
 const currentStatus=asset?(asset.STATUS_ASET||'Belum tercatat'):'Tidak ditemukan';
 const activeCount=history.filter(x=>x.STATUS_PINJAM==='AKTIF').length;
 const cards=history.map((tx,index)=>{
  const ongoing=tx.STATUS_PINJAM==='AKTIF';
  const borrower=tx.NAMA_PEMINJAM_SNAPSHOT||(hcuA904State.employees.find(e=>e.EMP_ID===tx.EMP_ID)?.NAMA)||tx.EMP_ID||'Belum tercatat';
  const returnDate=tx.TANGGAL_KEMBALI?hcuA904ShortDate(tx.TANGGAL_KEMBALI):(ongoing?'Belum dikembalikan':'Tidak tercatat');
  // PDF hanya tersedia jika nomor benar-benar ada pada register surat yang sudah dibaca.
  // onclick memakai JSON.stringify agar ID transaksi aman sebagai argumen JavaScript.
  const letterLink=(type)=>{
   const number=hcuA908IssuedNumber(tx.PINJAM_ID,type);
   const title=type==='serah'?'Surat Penyerahan':'Surat Pengembalian';
   const call=`hcuA9064OpenRegisteredLetter(${hcuA904Esc(JSON.stringify(tx.PINJAM_ID))},'${type}')`;
   const status=number?hcuA907LetterStatus(tx.PINJAM_ID,type):'';
   const action=`hcuA906OpenLetter(${hcuA904Esc(JSON.stringify(tx.PINJAM_ID))},'${type}')`;
   const followUp=number&&status!=='QR_TERBIT'?`<div style="margin-top:5px"><span style="color:#ac711a;font-weight:650">● Menunggu Cetak Awal</span><br><button type="button" class="a904-small" style="margin-top:5px;white-space:normal" onclick="${action}">☷ Cetak awal / Konfirmasi / Aktifkan QR</button></div>`:'';
   const registered=number?`<a href="#" style="color:#075c9d;font-weight:750;text-decoration:underline;text-underline-offset:2px" title="Buka PDF ${hcuA904Esc(title)} ${hcuA904Esc(number)} di tab baru" onclick="event.preventDefault();${call}">${hcuA904Esc(number)} ↗</a>${status==='QR_TERBIT'?'<div style="color:#24734d;font-weight:700;margin-top:5px">✓ QR Terbit</div>':followUp}`:'<span style="color:#78899b">Belum terbit</span>';
   return `<div style="margin-top:6px;font-size:11px;line-height:1.5;overflow-wrap:anywhere"><span style="color:#60778e;font-weight:600">No. ${title}:</span> ${registered}</div>`;
  };
  return `<div style="border:1px solid #d9e4ef;border-radius:12px;padding:13px 15px;background:${ongoing?'#f3f8ff':'#ffffff'};margin-bottom:10px">
   <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:10px"><strong>${index+1}. ${hcuA904Esc(tx.PINJAM_ID)}</strong><span style="font-weight:700;font-size:12px;color:${ongoing?'#155a97':'#25734b'}">${hcuA904Esc(tx.STATUS_PINJAM||'Tidak tercatat')}</span></div>
   <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px 16px;font-size:13px">
    <div><div style="color:#60778e;font-size:11px;font-weight:700">PIC / PEMINJAM</div><strong>${hcuA904Esc(borrower)}</strong></div>
    <div><div style="color:#60778e;font-size:11px;font-weight:700">TANGGAL DIPINJAM</div><strong>${hcuA904Esc(hcuA904ShortDate(tx.TANGGAL_SERAH))}</strong>${letterLink('serah')}</div>
    <div><div style="color:#60778e;font-size:11px;font-weight:700">TANGGAL DIKEMBALIKAN</div><strong>${hcuA904Esc(returnDate)}</strong>${letterLink('kembali')}</div>
    <div><div style="color:#60778e;font-size:11px;font-weight:700">LOKASI SAAT SERAH</div><strong>${hcuA904Esc(tx.LOKASI_SERAH||'Belum tercatat')}</strong></div>
    <div><div style="color:#60778e;font-size:11px;font-weight:700">KONDISI SERAH</div><strong>${hcuA904Esc(tx.KONDISI_SERAH||'Belum tercatat')}</strong></div>
    <div><div style="color:#60778e;font-size:11px;font-weight:700">KONDISI KEMBALI</div><strong>${hcuA904Esc(tx.KONDISI_KEMBALI||(ongoing?'Belum dikembalikan':'Tidak tercatat'))}</strong></div>
   </div>
   ${tx.KETERANGAN?`<div style="color:#435c74;font-size:12px;margin-top:11px"><b>Keterangan:</b> ${hcuA904Esc(tx.KETERANGAN)}</div>`:''}
  </div>`;
 }).join('');
 heading.textContent='Kartu Kontrol Aset • '+selected.ASSET_ID;
 body.innerHTML=`<div style="margin-bottom:13px"><b style="font-size:16px;color:#143968">${hcuA904Esc(asset?.NAMA_ASET||selected.ASSET_ID)}</b><div style="font-size:12px;color:#637c94">ID: ${hcuA904Esc(selected.ASSET_ID)} · Nomor Aset: ${hcuA904Esc(asset?.NOMOR_ASET||'Belum tercatat')} · ${hcuA904Esc(asset?.KATEGORI||'Kategori belum tercatat')}</div></div>
  <div style="border:1px solid #b9d9f0;background:#eef6fd;border-radius:12px;padding:14px;margin-bottom:15px">
   <div style="color:#194c77;font-weight:800;margin-bottom:9px">Posisi Aset Saat Ini — Master Aset Live</div>
   <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(155px,1fr));gap:12px;font-size:13px">
    <div><span style="color:#56728a">PIC saat ini</span><div><b>${hcuA904Esc(currentPIC)}</b></div></div>
    <div><span style="color:#56728a">Lokasi sekarang</span><div><b>${hcuA904Esc(currentLocation)}</b></div></div>
    <div><span style="color:#56728a">Status aset</span><div><b>${hcuA904Esc(currentStatus)}</b></div></div>
    <div><span style="color:#56728a">Pinjaman aktif tercatat</span><div><b>${activeCount}</b></div></div>
   </div>
  </div>
  <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px"><h3 style="margin:0;font-size:16px;color:#173e68">Riwayat Pemakaian</h3><span style="font-size:12px;color:#5e7890">${history.length} transaksi sejak migrasi</span></div>
  ${cards||'<div style="border:1px dashed #c5d8e7;border-radius:12px;padding:16px;color:#496b84;background:#f8fbfd;font-size:13px">Belum ada transaksi Pinjam Pakai yang tercatat untuk aset ini sejak migrasi. PIC dan lokasi saat ini tetap ditampilkan dari Master Aset. Data sebelum migrasi tidak dibuat sebagai riwayat fiktif.</div>'}
  <p style="color:#60778e;font-size:12px;margin-top:12px">Sumber: Pinjam_Pakai untuk tanggal dan PIC historis; Master_Aset untuk PIC dan posisi saat ini. Riwayat peminjaman sebelum migrasi yang tidak tercatat tidak dimasukkan.</p>
  <div class="v9-dialog-actions"><button class="btn secondary" type="button" onclick="hcuA904Close()">Tutup Kartu Kontrol</button></div>`;
 modal.classList.add('show');
}
// V9.05.5: satu aturan ketersediaan untuk Grid Aset Available dan form Serah Terima.
// STATUS_ASET=AKTIF pada R2/R4 tidak otomatis berarti tersedia: wajib tidak punya PIC dan transaksi aktif.
function hcuA905AvailableAssets(){
 const rank={KOMPUTER:0,R2:1,R4:2};
 return hcuA904State.assets.filter(a=>['KOMPUTER','R2','R4'].includes(a.KATEGORI)&&hcuA904LoanEligible(a))
  .sort((a,b)=>(rank[a.KATEGORI]??9)-(rank[b.KATEGORI]??9)||String(a.NAMA_ASET||'').localeCompare(String(b.NAMA_ASET||''),'id')||String(a.ASSET_ID||'').localeCompare(String(b.ASSET_ID||'')));
}
function hcuA905AvailableRow(a){
 const id=hcuA904Esc(a.ASSET_ID);
 const identity=a.KATEGORI==='KOMPUTER'?(a.NO_SERI||a.NOMOR_ASET||'—'):(a.NOPOL||a.NOMOR_ASET||'—');
 return `<tr><td><b>${id}</b><span class="a904-sub">${hcuA904Esc(a.NOMOR_ASET||'—')}</span></td><td>${hcuA904Esc(a.KATEGORI)}</td><td><b>${hcuA904Esc(a.NAMA_ASET||'—')}</b><span class="a904-sub">${hcuA904Esc(identity)}</span></td><td>${hcuA904Esc(a.KANTOR||a.LOKASI_ASET||'—')}</td><td>${hcuA904Esc(a.STATUS_ASET||'—')}</td><td>${hcuA904Esc(a.KONDISI||'—')}</td><td><div style="display:flex;gap:6px;flex-wrap:wrap"><button class="a904-small" type="button" onclick="hcuA904LoanOpen('${id}')">+ Serah Terima</button><button class="a904-small" type="button" onclick="hcuA904Open('${id}')">✎ Edit</button></div></td></tr>`;
}
function hcuA905FilterAvailableAssets(){
 const body=document.getElementById('a905AvailableBody');if(!body)return;
 const available=hcuA905AvailableAssets();
 const q=String(document.getElementById('a905AvailableSearch')?.value||'').trim().toLowerCase();
 const cat=String(document.getElementById('a905AvailableCategory')?.value||'');
 const filtered=available.filter(a=>(!cat||a.KATEGORI===cat)&&(!q||[...Object.values(a),hcuA904PIC(a)].join(' ').toLowerCase().includes(q)));
 body.innerHTML=filtered.map(hcuA905AvailableRow).join('')||'<tr><td colspan="7">Tidak ada aset available sesuai filter.</td></tr>';
 const count=document.getElementById('a905AvailableCount');if(count)count.textContent=`Menampilkan ${filtered.length} dari ${available.length} aset available (Komputer, R2, R4).`;
}
// V9.07.3: warna PDF mengikuti status register masing-masing surat,
// bukan status pinjam aset. Tidak ada perubahan data maupun penerbitan surat.
function hcuA907PdfGridButton(loanId,type){
 const issued=hcuA907LetterStatus(loanId,type)==='QR_TERBIT';
 const label=type==='serah'?'PDF Penyerahan':'PDF Pengembalian';
 const status=issued?'QR sudah terbit':'QR belum terbit';
 const id=hcuA904Esc(loanId);
 return `<button class="a904-small a907-letter-pdf ${issued?'a907-qr-terbit':'a907-qr-belum'}" type="button" data-a907-loan="${id}" data-a907-type="${type}" title="${status}" aria-label="${label} — ${status}" onclick="hcuA906OpenLetter('${id}','${type}')">⬇ ${label}</button>`;
}
function hcuA907UpdatePdfGridColors(){
 document.querySelectorAll('button.a907-letter-pdf[data-a907-loan][data-a907-type]').forEach(btn=>{
  const type=btn.dataset.a907Type;
  if(type!=='serah'&&type!=='kembali')return;
  const issued=hcuA907LetterStatus(btn.dataset.a907Loan,type)==='QR_TERBIT';
  const status=issued?'QR sudah terbit':'QR belum terbit';
  btn.classList.toggle('a907-qr-terbit',issued);
  btn.classList.toggle('a907-qr-belum',!issued);
  btn.title=status;
  btn.setAttribute('aria-label',(type==='serah'?'PDF Penyerahan':'PDF Pengembalian')+' — '+status);
 });
}
// V9.07.4: pencarian/filter lokal Riwayat Pinjam Pakai, tanpa mengubah data atau status surat.
// Cari ID transaksi, identitas aset (termasuk serial/Nopol), peminjam, lokasi, tanggal, status,
// dan nomor surat; tombol PDF & Kartu Kontrol tetap menggunakan handler yang sudah ada.
function hcuA9074FilterLoanHistory(){
 const body=document.getElementById('a9074LoanHistoryBody');if(!body)return;
 const query=String(document.getElementById('a9074LoanHistorySearch')?.value||'').trim().toLowerCase();
 const terms=query.split(/\s+/).filter(Boolean);
 const status=String(document.getElementById('a9074LoanHistoryStatus')?.value||'').toUpperCase();
 const assetsById=new Map(hcuA904State.assets.map(a=>[String(a.ASSET_ID),a]));
 const employeesById=new Map(hcuA904State.employees.map(e=>[String(e.EMP_ID),e]));
 const loansById=new Map(hcuA904State.loans.map(x=>[String(x.PINJAM_ID),x]));
 let shown=0;
 body.querySelectorAll('tr[data-a9074-loan-id]').forEach(row=>{
  const loan=loansById.get(row.dataset.a9074LoanId);
  const asset=loan?assetsById.get(String(loan.ASSET_ID)):null;
  const employee=loan?employeesById.get(String(loan.EMP_ID)):null;
  const fields=loan?[
   loan.PINJAM_ID,loan.ASSET_ID,loan.NAMA_PEMINJAM_SNAPSHOT,
   loan.TANGGAL_SERAH,hcuA904ShortDate(loan.TANGGAL_SERAH),loan.TANGGAL_KEMBALI,hcuA904ShortDate(loan.TANGGAL_KEMBALI),
   loan.STATUS_PINJAM,loan.LOKASI_SERAH,loan.LOKASI_KEMBALI,loan.KONDISI_SERAH,loan.KONDISI_KEMBALI,
   asset?.NAMA_ASET,asset?.NOMOR_ASET,asset?.NO_SERI,asset?.NOPOL,asset?.KATEGORI,
   employee?.NAMA,employee?.NPP,
   hcuA908IssuedNumber(loan.PINJAM_ID,'serah'),hcuA908IssuedNumber(loan.PINJAM_ID,'kembali')
  ].map(hcuA904S).join(' ').toLowerCase():'';
  const matches=!!loan&&(!status||String(loan.STATUS_PINJAM||'').toUpperCase()===status)&&terms.every(term=>fields.includes(term));
  row.style.display=matches?'':'none';
  if(matches)shown++;
 });
 const empty=document.getElementById('a9074LoanHistoryNoMatch');
 if(empty)empty.style.display=hcuA904State.loans.length&&!shown?'':'none';
 const count=document.getElementById('a9074LoanHistoryCount');
 if(count)count.textContent=`Menampilkan ${shown} dari ${hcuA904State.loans.length} transaksi pinjam pakai.`;
}
function hcuA904LoanPage(){
 const loans=hcuA904State.loans,activeVehicles=hcuA904State.assets.filter(hcuA904IsActiveVehicle),legacy=hcuA904State.assets.filter(hcuA904LegacyReturnable),available=hcuA905AvailableAssets();
 const r2=activeVehicles.filter(x=>x.KATEGORI==='R2').length,r4=activeVehicles.filter(x=>x.KATEGORI==='R4').length;
 return `${hcuA904LiveBanner()}<style>
 .a904-small.a907-letter-pdf {background:#1667b8;border-color:#1667b8;color:#fff;transition:filter .15s ease;}
 .a904-small.a907-letter-pdf.a907-qr-terbit {background:#18804b;border-color:#18804b;color:#fff;}
 .a904-small.a907-letter-pdf:hover {filter:brightness(.90);}
 .a904-small.a907-letter-pdf:focus-visible {outline:3px solid #92cafa;outline-offset:2px;}
 </style><div class="hero"><div><h1>Pinjam Pakai <span class="a904-label">V9.06.3</span></h1><p>Riwayat transaksi, aset available Komputer/R2/R4, pengembalian aset migrasi, dan daftar kendaraan AKTIF.</p></div><div class="chip">${available.length} aset available</div></div>
 <div class="v9-metrics"><div class="v9-tile"><small>R2 AKTIF</small><strong>${r2}</strong><span>Master Aset</span></div><div class="v9-tile"><small>R4 AKTIF</small><strong>${r4}</strong><span>Master Aset</span></div><div class="v9-tile"><small>TRANSAKSI AKTIF</small><strong>${loans.filter(x=>x.STATUS_PINJAM==='AKTIF').length}</strong><span>Transaksi baru</span></div><div class="v9-tile"><small>PERLU CEK PENGEMBALIAN</small><strong>${legacy.length}</strong><span>Penugasan lama tanpa transaksi aktif</span></div></div>
 <!-- 1. Riwayat Pinjam Pakai -->
 <div class="panel" style="margin-top:16px"><div class="vehicle-grid-head"><div><h3>Riwayat Pinjam Pakai</h3><span>Transaksi baru sejak migrasi. Setiap baris dapat dibuatkan PDF penyerahan; PDF pengembalian tersedia setelah transaksi berstatus DIKEMBALIKAN.</span></div><button class="btn success" onclick="hcuA904LoanOpen()">+ Serah Terima</button></div>
 <div class="toolbar"><input type="search" id="a9074LoanHistorySearch" aria-label="Cari transaksi, aset, atau peminjam" placeholder="Cari ID transaksi, nama/nomor aset, serial, Nopol, peminjam..." oninput="hcuA9074FilterLoanHistory()"><select id="a9074LoanHistoryStatus" aria-label="Filter status pinjam pakai" onchange="hcuA9074FilterLoanHistory()"><option value="">Semua Status</option><option value="AKTIF">Aktif</option><option value="DIKEMBALIKAN">Dikembalikan</option></select></div><div class="countline" id="a9074LoanHistoryCount">Menampilkan ${loans.length} dari ${loans.length} transaksi pinjam pakai.</div>
 <div class="table-wrap"><table class="tbl"><thead><tr><th>ID Transaksi</th><th>Aset</th><th>Peminjam</th><th>Tanggal Serah</th><th>Status</th><th>Lokasi</th><th>Kondisi</th><th>Aksi</th></tr></thead><tbody id="a9074LoanHistoryBody">${loans.map(x=>{const a=hcuA904State.assets.find(a=>a.ASSET_ID===x.ASSET_ID);return `<tr data-a9074-loan-id="${hcuA904Esc(x.PINJAM_ID)}"><td>${hcuA904Esc(x.PINJAM_ID)}</td><td><b>${hcuA904Esc(a?.NAMA_ASET||x.ASSET_ID)}</b><span class="a904-sub">No. Aset: ${hcuA904Esc(a?.NOMOR_ASET||'Belum tercatat')}</span></td><td>${hcuA904Esc(x.NAMA_PEMINJAM_SNAPSHOT)}</td><td>${hcuA904Esc(hcuA904ShortDate(x.TANGGAL_SERAH))}</td><td>${hcuA904Esc(x.STATUS_PINJAM)}</td><td>${hcuA904Esc(x.LOKASI_SERAH)}</td><td>${hcuA904Esc(x.KONDISI_KEMBALI||x.KONDISI_SERAH)}</td><td><div style="display:flex;gap:5px;flex-wrap:wrap"><button class="a904-small" type="button" onclick="hcuA9062OpenControl('${hcuA904Esc(x.PINJAM_ID)}')">▤ Kartu Kontrol</button>${hcuA908IssuedNumber(x.PINJAM_ID,'serah')?hcuA907PdfGridButton(x.PINJAM_ID,'serah'):'<span class="a904-sub">Surat penyerahan belum terdaftar</span>'}${x.STATUS_PINJAM==='AKTIF'?`<button class="a904-small" type="button" onclick="hcuA904ReturnOpen('${hcuA904Esc(x.PINJAM_ID)}')">↩ Kembalikan</button>`:`${hcuA908IssuedNumber(x.PINJAM_ID,'kembali')?hcuA907PdfGridButton(x.PINJAM_ID,'kembali'):'<span class="a904-sub">Surat pengembalian belum terdaftar</span>'}`}</div></td></tr>`;}).join('')||'<tr><td colspan="8" class="a904-empty">Belum ada transaksi baru. Data PIC lama tetap ada di Master Aset.</td></tr>'}<tr id="a9074LoanHistoryNoMatch" style="display:none"><td colspan="8" class="a904-empty">Tidak ada transaksi Pinjam Pakai yang sesuai pencarian atau filter.</td></tr></tbody></table></div></div>
 <!-- 2. Asset Available (Komputer, R2, R4) -->
 <div class="panel" style="margin-top:16px"><div class="vehicle-grid-head"><div><h3>Aset Available — Komputer & Kendaraan</h3><span>Aset tanpa PIC/pemegang dan tanpa transaksi Pinjam Pakai aktif. Kendaraan wajib berstatus AKTIF; komputer berstatus tersedia/dikembalikan/di gudang. Kendaraan yang memiliki PIC tetap ditampilkan pada Daftar Kendaraan di bagian bawah, tetapi tidak dianggap available.</span></div><span class="chip">${available.length} tersedia</span></div>
 <div class="toolbar"><input id="a905AvailableSearch" placeholder="Cari nama aset, nomor aset, serial, Nopol, kantor..." oninput="hcuA905FilterAvailableAssets()"><select id="a905AvailableCategory" onchange="hcuA905FilterAvailableAssets()"><option value="">Semua Jenis</option><option value="KOMPUTER">Komputer</option><option value="R2">Kendaraan R2</option><option value="R4">Kendaraan R4</option></select></div><div class="countline" id="a905AvailableCount">Menampilkan ${available.length} dari ${available.length} aset available (Komputer, R2, R4).</div>
 <div class="table-wrap"><table class="tbl"><thead><tr><th>ID / No. Aset</th><th>Jenis</th><th>Nama / Identitas</th><th>Kantor / Lokasi</th><th>Status Aset</th><th>Kondisi</th><th>Tindakan</th></tr></thead><tbody id="a905AvailableBody">${available.map(hcuA905AvailableRow).join('')||'<tr><td colspan="7">Belum ada aset available.</td></tr>'}</tbody></table></div></div>
 <!-- 3. Pengembalian Aset Migrasi/PIC Lama -->
 <div class="panel" style="margin-top:16px"><div class="vehicle-grid-head"><div><h3>Pengembalian Aset Migrasi / PIC Lama</h3><span>${legacy.length} aset tercatat pada PIC tanpa transaksi aktif di Pinjam Pakai. Pengembalian hanya dicatat setelah aset benar-benar diterima secara fisik.</span></div></div><div class="table-wrap"><table class="tbl"><thead><tr><th>ID / Aset</th><th>PIC tercatat</th><th>Lokasi</th><th>Status Aset</th><th>Tindakan</th></tr></thead><tbody>${legacy.map(a=>`<tr><td><b>${hcuA904Esc(a.ASSET_ID)} • ${hcuA904Esc(a.NAMA_ASET)}</b>${a.NOPOL?' ('+hcuA904Esc(a.NOPOL)+')':''}<span class="a904-sub">No. Aset: ${hcuA904Esc(a.NOMOR_ASET||'Belum tercatat')}</span></td><td>${hcuA904Esc(hcuA904PIC(a))}</td><td>${hcuA904Esc(a.LOKASI_ASET||a.KANTOR||'—')}</td><td>${hcuA904Esc(a.STATUS_ASET)}</td><td><button class="a904-small" type="button" onclick="hcuA904LegacyReturnOpen('${hcuA904Esc(a.ASSET_ID)}')">↩ Catat Pengembalian</button></td></tr>`).join('')||'<tr><td colspan="5">Tidak ada aset yang memerlukan pengembalian PIC lama.</td></tr>'}</tbody></table></div></div>
 <!-- 4. Daftar Kendaraan di PALING BAWAH -->
 <div class="panel" style="margin-top:16px"><div class="vehicle-grid-head"><div><h3>Daftar Kendaraan AKTIF — R2 dan R4</h3><span>Seluruh kendaraan STATUS_ASET = AKTIF, termasuk yang sudah memiliki PIC. Status AKTIF bukan berarti available; cek status PIC sebelum serah terima.</span></div></div>
 <div class="toolbar"><input id="a904ActiveVehicleSearch" placeholder="Cari Nopol, Nomor Aset, PIC, Kantor..." oninput="hcuA904FilterActiveVehicles()"><select id="a904ActiveVehicleCategory" onchange="hcuA904FilterActiveVehicles()"><option value="">R2 & R4</option><option value="R2">R2</option><option value="R4">R4</option></select></div><div class="countline" id="a904ActiveVehicleCount">Menampilkan ${activeVehicles.length} dari ${activeVehicles.length} kendaraan AKTIF (R2/R4).</div>
 <div class="table-wrap"><table class="tbl"><thead><tr><th>ID / No. Aset</th><th>Jenis</th><th>Nama / Nopol</th><th>PIC</th><th>Kantor / Lokasi</th><th>Status</th><th>Tindakan</th></tr></thead><tbody id="a904ActiveVehicleBody">${activeVehicles.map(hcuA904ActiveVehicleRow).join('')||'<tr><td colspan="7">Belum ada kendaraan berstatus AKTIF.</td></tr>'}</tbody></table></div></div>${hcuA904Modal()}`;
}

// Pengembalian barang migrasi yang belum pernah memiliki transaksi baru.
// Wajib melalui saveAssetV904 agar audit history tercatat, tanpa membuat transaksi palsu Pinjam_Pakai.
function hcuA904LegacyReturnOpen(id){
 const a=hcuA904State.assets.find(x=>x.ASSET_ID===id);
 if(!hcuA904LegacyReturnable(a)){toast('Aset ini harus dikembalikan melalui transaksi Pinjam Pakai aktif, atau statusnya sudah berubah.','error');return;}
 const modal=document.getElementById('a904Modal');if(!modal)return;
 document.getElementById('a904Title').textContent='Pengembalian Aset Migrasi • '+id;
 document.getElementById('a904ModalBody').innerHTML=`<div class="v9-dialog-note"><b>${hcuA904Esc(a.NAMA_ASET)}</b> (${hcuA904Esc(id)})<br>PIC sebelumnya: <b>${hcuA904Esc(hcuA904PIC(a))}</b>.<br><strong>Penting:</strong> Ini bukan transaksi Pinjam Pakai lama. Form hanya mencatat perubahan penguasaan aset setelah fisik barang benar-benar kembali. ${hcuA904IsActiveVehicle(a)?'Status operasional kendaraan tetap AKTIF.':''}</div>
 <div class="v9-form-grid">${hcuA904Field('Tanggal pengembalian sebenarnya *','LEGACY_DATE','',{type:'date'})}${hcuA9061ConditionSelect('Kondisi diterima *','LEGACY_CONDITION','')}${hcuA904Field('Lokasi penerimaan *','LEGACY_LOCATION','Gudang Kanwil')}${hcuA904Field('Keterangan (bila ada)','LEGACY_NOTE','')}</div>
 <div class="v9-dialog-actions"><button class="btn secondary" onclick="hcuA904Close()">Batal</button><button class="btn success" id="a904TxBtn" onclick="hcuA904LegacyReturnSave('${hcuA904Esc(id)}')">Konfirmasi Pengembalian</button></div><div class="a904-feedback" id="a904SaveMsg"></div>`;
 modal.classList.add('show');
}
async function hcuA904LegacyReturnSave(id){
 if(hcuA904State.saving)return;
 const a=hcuA904State.assets.find(x=>x.ASSET_ID===id);
 if(!hcuA904LegacyReturnable(a)){hcuA904SetFeedback('error','Status aset telah berubah. Tutup form dan buka ulang data.');return;}
 const get=k=>(document.querySelector(`[data-a904="${k}"]`)?.value||'').trim();
 const date=get('LEGACY_DATE'),condition=get('LEGACY_CONDITION'),location=get('LEGACY_LOCATION'),note=get('LEGACY_NOTE');
 if(!date||!location){hcuA904SetFeedback('error','Tanggal dan lokasi penerimaan wajib diisi.');return;}
 if(!hcuA9061ValidCondition(condition)){hcuA904SetFeedback('error','Pilih Kondisi Diterima: Baik, Rusak Ringan, atau Rusak Berat.');return;}
 if(date>hcuA904Today()){hcuA904SetFeedback('error','Tanggal pengembalian tidak boleh di masa depan.');return;}
 const previousPic=hcuA904PIC(a);
 const newLine=`PENGEMBALIAN ASET MIGRASI • ${date} • PIC sebelumnya: ${previousPic} • lokasi terima: ${location}${note?' • '+note:''}`;
 const memo=[String(a.KETERANGAN||'').trim(),newLine].filter(Boolean).join(' | ');
 if(memo.length>1000){hcuA904SetFeedback('error','Keterangan lama dan baru melebihi 1000 karakter. Perpendek catatan melalui Edit Aset terlebih dahulu tanpa menghilangkan informasi penting.');return;}
 const nextStatus=hcuA904IsActiveVehicle(a)?'AKTIF':'Dikembalikan';
 const asset={...a,STATUS_ASET:nextStatus,KONDISI:condition,LOKASI_ASET:location,PIC_TIPE:'TIDAK_ADA',PIC_EMP_ID:'',PIC_NAMA:'',KETERANGAN:memo};
 const detail=a.KATEGORI==='KOMPUTER'?(hcuA904State.computers.find(v=>v.ASSET_ID===id)||{}):hcuA904Vehicle(a);
 const btn=document.getElementById('a904TxBtn');hcuA904State.saving=true;
 if(btn){btn.disabled=true;btn.dataset.label=btn.textContent;btn.textContent='⟳ Sedang menyimpan...';}
 hcuA904SetFeedback('progress','Tahap 1/2 — Mencatat pengembalian di Fy_Database...',1);
 try{
  await hcuA904Req('saveAssetV904',{asset,detail,expectedRevision:hcuA904State.revisions[id],updatedBy:hcuA904Operator()});
  hcuA904SetFeedback('progress','Tahap 2/2 — Memeriksa ulang status dan PIC...',2);
  const ok=await hcuA904Load(true);
  if(!ok)throw Error('Penyimpanan direspons server, tetapi pembacaan ulang gagal. Periksa Master Aset sebelum mencoba lagi.');
  const confirmed=hcuA904State.assets.find(x=>x.ASSET_ID===id);
  if(!confirmed||confirmed.STATUS_ASET!==nextStatus||confirmed.PIC_TIPE!=='TIDAK_ADA'||confirmed.PIC_EMP_ID||confirmed.PIC_NAMA||confirmed.LOKASI_ASET!==location)
   throw Error('Data hasil pembacaan ulang belum sesuai. Periksa status aset di database sebelum mengulang.');
  const message=`Pengembalian ${id} berhasil tercatat; PIC dikosongkan dan aset berada di ${location}.`;
  hcuA904SetFeedback('success',message);hcuA904RememberSave(message);
  await new Promise(r=>setTimeout(r,850));hcuA904State.saving=false;hcuA904Close();
  await show(currentPage,{skipAssetSync:true,skipDatabaseSync:true});toast(message,'success');
 }catch(e){hcuA904SetFeedback('error',e.message||'Pengembalian belum dapat dikonfirmasi.');toast('Periksa pengembalian: '+(e.message||''),'error');}
 finally{hcuA904State.saving=false;if(btn&&btn.isConnected){btn.disabled=false;btn.textContent=btn.dataset.label||'Konfirmasi Pengembalian';}}
}
function hcuA9060SignOfficerField_(){
 const officials=hcuA907Officials().filter(x=>x.NPP&&x.JABATAN&&x.Loket_Kerja);
 const value=officials.length===1?officials[0].EMP_ID:'';
 return `<div class="field span2"><label>Kasubag HCU Aktif — Penandatangan Surat *</label>
  <select id="a9060Officer"><option value="">— Pilih pejabat —</option>${officials.map(o=>`<option value="${hcuA904Esc(o.EMP_ID)}" ${value===o.EMP_ID?'selected':''}>${hcuA904Esc(o.NAMA)} • ${hcuA904Esc(o.JABATAN)}</option>`).join('')}</select>
  ${officials.length?'':'<small style="color:#a11">Kasubag HCU Aktif tidak ditemukan pada Master Pegawai. Lengkapi data sebelum transaksi.</small>'}</div>
  <div class="field"><label>Tempat Penandatanganan Surat *</label><input id="a9060City" value="Palembang" maxlength="100"></div>`;
}
function hcuA904LoanOpen(preselectedId=''){const modal=document.getElementById('a904Modal');if(!modal)return;
 document.getElementById('a904Title').textContent='Serah Terima Aset';
 const available=hcuA904State.assets.filter(hcuA904LoanEligible);
 document.getElementById('a904ModalBody').innerHTML=`<div class="v9-dialog-note">Aset tersedia, termasuk kendaraan R2/R4 berstatus AKTIF yang BELUM memiliki PIC, dapat diserahkan. Jika PIC sudah tercatat, lakukan pengembalian lama terlebih dahulu.</div>
 <div class="v9-form-grid"><div class="field span2"><label>Aset</label><select id="a904LoanAsset"><option value="">— Pilih Aset —</option>${available.map(a=>`<option value="${hcuA904Esc(a.ASSET_ID)}" ${a.ASSET_ID===preselectedId?'selected':''}>${hcuA904Esc(a.ASSET_ID+' • '+a.KATEGORI+' • '+a.NAMA_ASET+' • '+(a.NOPOL||a.NOMOR_ASET||a.NO_SERI||''))}</option>`).join('')}</select></div>
 <div class="field span2"><label>Nama Pegawai / PIC</label><select id="a904LoanEmployee">${hcuA904EmployeeOptions('')}</select></div>
 ${hcuA904Field('Tanggal Serah','DATE',hcuA904Today(),{type:'date'})}${hcuA904Field('Lokasi Serah','LOCATION','Kanwil Sumsel')}
 ${hcuA9061ConditionSelect('Kondisi Saat Serah','CONDITION','')}${hcuA904Field('Keterangan','NOTE','')}${hcuA9060SignOfficerField_()}
 </div><div class="v9-dialog-actions"><button class="btn secondary" onclick="hcuA904Close()">Batal</button><button class="btn success" id="a904TxBtn" onclick="hcuA904LoanCreate()">Simpan Serah Terima</button></div><div class="a904-feedback" id="a904SaveMsg"></div>`;
 modal.classList.add('show');
}
async function hcuA904LoanCreate(){if(hcuA904State.saving)return;
 const assetId=document.getElementById('a904LoanAsset')?.value||'',empId=document.getElementById('a904LoanEmployee')?.value||'';
 if(!assetId||!empId){hcuA904SetFeedback('error','Pilih aset dan pegawai.');return;}
 const selectedCondition=document.querySelector('[data-a904="CONDITION"]')?.value||'';
 if(!hcuA9061ValidCondition(selectedCondition)){hcuA904SetFeedback('error','Pilih Kondisi Saat Serah: Baik, Rusak Ringan, atau Rusak Berat.');return;}
 const officerEmpId=document.getElementById('a9060Officer')?.value||'',city=document.getElementById('a9060City')?.value?.trim()||'';
 if(!officerEmpId||!city){hcuA904SetFeedback('error','Pilih Kasubag HCU Aktif dan isi kota surat sebelum Simpan.');return;}
 await hcuA904DoTx('createLoanV904',{assetId,empId,date:document.querySelector('[data-a904="DATE"]').value,location:document.querySelector('[data-a904="LOCATION"]').value,condition:document.querySelector('[data-a904="CONDITION"]').value,note:document.querySelector('[data-a904="NOTE"]').value,officerEmpId,city});
}
function hcuA904ReturnOpen(id){const l=hcuA904State.loans.find(x=>x.PINJAM_ID===id);if(!l)return;
 document.getElementById('a904Title').textContent='Pengembalian • '+id;
 document.getElementById('a904ModalBody').innerHTML=`<div class="v9-dialog-note"><b>${hcuA904Esc(l.NAMA_PEMINJAM_SNAPSHOT)}</b><br>Aset ${hcuA904Esc(l.ASSET_ID)} akan masuk ke Gudang Kanwil; PIC akan dikosongkan.</div>
 <div class="v9-form-grid">${hcuA904Field('Tanggal Kembali','DATE',hcuA904Today(),{type:'date'})}${hcuA9061ConditionSelect('Kondisi Kembali','CONDITION','')}${hcuA904Field('Keterangan','NOTE','')}${hcuA9060SignOfficerField_()}</div>
 <div class="v9-dialog-actions"><button class="btn secondary" onclick="hcuA904Close()">Batal</button><button class="btn success" id="a904TxBtn" onclick="hcuA904LoanReturn('${hcuA904Esc(id)}')">Konfirmasi Kembali</button></div><div class="a904-feedback" id="a904SaveMsg"></div>`;
 document.getElementById('a904Modal').classList.add('show');
}
async function hcuA904LoanReturn(id){if(hcuA904State.saving)return;
 const date=document.querySelector('[data-a904="DATE"]').value,condition=document.querySelector('[data-a904="CONDITION"]').value,note=document.querySelector('[data-a904="NOTE"]').value;
 if(!hcuA9061ValidCondition(condition)){hcuA904SetFeedback('error','Pilih Kondisi Kembali: Baik, Rusak Ringan, atau Rusak Berat.');return;}
 const officerEmpId=document.getElementById('a9060Officer')?.value||'',city=document.getElementById('a9060City')?.value?.trim()||'';
 if(!officerEmpId||!city){hcuA904SetFeedback('error','Pilih Kasubag HCU Aktif dan isi kota surat sebelum Simpan.');return;}
 await hcuA904DoTx('returnLoanV904',{loanId:id,date,condition,note,officerEmpId,city});
}
async function hcuA904DoTx(action,payload){
 if(hcuA904State.saving)return;
 const btn=document.getElementById('a904TxBtn');
 let operator;
 try{operator=hcuA904Operator();}catch(e){hcuA904SetFeedback('error',e.message);return;}
 hcuA904State.saving=true;
 if(btn){btn.disabled=true;btn.dataset.label=btn.textContent;btn.textContent='⟳ Sedang menyimpan...';}
 hcuA904SetFeedback('progress','Tahap 1/2 — Menyimpan transaksi dan mendaftarkan nomor surat secara otomatis...',1);
 try{
  const result=await hcuA904Req(action,{...payload,updatedBy:operator});
  if(!result.surat?.number)throw Error('Transaksi mungkin sudah tersimpan, tetapi nomor surat belum terkonfirmasi. Periksa riwayat dan register sebelum mengulangi.');
  hcuA904SetFeedback('progress','Tahap 2/2 — Memverifikasi transaksi dan nomor surat di Fy_Database...',2);
  const ok=await hcuA904Load(true);
  if(!ok)throw Error('Server merespons transaksi, tetapi pembacaan ulang gagal. Periksa riwayat sebelum mencoba kembali: '+hcuA904State.error);
  const letterType=action==='createLoanV904'?'serah':'kembali';
  const listed=hcuA904State.issuedLetters.find(x=>x.loanId===result.loanId&&x.type===letterType);
  if(!listed||listed.number!==result.surat.number)throw Error('Transaksi sudah diproses, namun verifikasi nomor surat belum cocok. Jangan ulang Simpan. Hubungi administrator.');
  const message=result.message||('Transaksi dan surat '+result.surat.number+' berhasil disimpan.');
  hcuA904SetFeedback('success',message);hcuA904RememberSave(message);
  await new Promise(resolve=>setTimeout(resolve,850));
  hcuA904State.saving=false;
  hcuA904Close();await show('pinjam',{skipDatabaseSync:true,skipAssetSync:true});
  toast(message,'success');
 }catch(e){
  hcuA904SetFeedback('error',e.message||'Transaksi belum dapat dikonfirmasi.');
  toast('Periksa transaksi: '+(e.message||'Terjadi kesalahan'),'error');
 }finally{
  hcuA904State.saving=false;
  if(btn&&btn.isConnected){btn.disabled=false;btn.textContent=btn.dataset.label||'Simpan Transaksi';}
 }
}
function hcuA904Export(which){const master=hcuA904State.assets;let rows,headers;
 if(which==='compliance'){
  headers=['ASSET_ID','KATEGORI','NAMA_ASET','NOPOL','KANTOR','PIC_NAMA','STATUS_ASET','PAJAK_SAMPAI','STNK_SAMPAI','NILAI_PAJAK','POLIS_AWAL','POLIS_AKHIR','PREMI','NO_POLIS','STATUS_VALIDASI_PAJAK'];
  rows=master.filter(a=>['R2','R4'].includes(a.KATEGORI)).map(a=>({...a,...hcuA904Vehicle(a)}));
 }else{headers=['ASSET_ID','NOMOR_ASET','KATEGORI','NAMA_ASET','TAHUN','KEPEMILIKAN','NOPOL','NO_SERI','KANTOR','LOKASI_ASET','PIC_TIPE','PIC_EMP_ID','PIC_NAMA','STATUS_ASET','KONDISI','KETERANGAN'];rows=master;}
 try{const blob=vehicleBackupXlsx(rows,headers,{title:'BACKUP FY_DATABASE LIVE V9.04',source:'Fy_Database V9.04',sheetName:which==='compliance'?'Pajak':'MasterAset'});hcuAuditDownload(blob,`Fy_Database_${which==='compliance'?'Pajak_Asuransi':'Master_Aset'}_${hcuAuditTimestamp()}.xlsx`);toast('Excel berhasil diekspor.','success');}
 catch(e){toast('Gagal ekspor Excel: '+e.message,'error');}
}
// Install page overrides in final inline script, AFTER pageFns.inventaris=assetAuditPage.

/* ============================================================
 * V9.05 — FY_DATABASE LIVE ONLY.
 * No legacy source selector, local draft, or manual sync action.
 * Existing V9.02 functions remain present for unrelated modules
 * but are NEVER used to render these three asset modules.
 * ============================================================ */
const hcuA905LivePages={inventaris:hcuA904AssetPage,compliance:hcuA904CompliancePage,pinjam:hcuA904LoanPage};
function hcuA904InstallLivePages(pages){
 for(const page of Object.keys(hcuA905LivePages)){
  if(typeof pages[page]!=='function')throw Error('Halaman portal tidak tersedia: '+page);
  pages[page]=()=>hcuA904State.ready?hcuA905LivePages[page]():hcuA904ErrorPage(page);
 }
}
async function hcuA904RefreshVisible(reason='auto'){
 const page=currentPage;
 if(!Object.prototype.hasOwnProperty.call(hcuA905LivePages,page)||document.hidden||hcuA904State.saving||hcuAnyModalOpen())return;
 if(reason==='interval'&&Date.now()-hcuA904State.time<60000)return;
 const serial=pageRenderSerial;
 const ok=await hcuA904Load(true);
 if(page!==currentPage||serial!==pageRenderSerial)return;
 if(ok)await show(page,{skipAssetSync:true,skipDatabaseSync:true,preserveSerial:true});
 else content.innerHTML=hcuA904ErrorPage(page);
}


/* ================================================================
 * V9.05.6 SURAT SERAH TERIMA / PENGEMBALIAN
 * Acuan: berkas contoh pengguna PINJAM PAKAI INVENTARIS 2026.pdf
 * dan BERITA ACARA PENGEMBALIAN ASET.docx.
 * Dibuat sebagai PDF A4 langsung dari browser; tidak menulis DB.
 * Nomor surat dan penandatangan diperiksa manual; tidak dibuat otomatis.
 * ================================================================ */
const HCU_A906_MONTHS=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const HCU_A906_DAYS=['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
function hcuA906DateParts(iso){
 const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(hcuA904S(iso));
 if(!match)throw Error('Tanggal transaksi tidak valid. PDF tidak dibuat.');
 const d=new Date(Date.UTC(+match[1],+match[2]-1,+match[3]));
 if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==iso)throw Error('Tanggal transaksi tidak valid.');
 return {iso,day:HCU_A906_DAYS[d.getUTCDay()],date:+match[3],month:HCU_A906_MONTHS[+match[2]-1],year:+match[1],formatted:`${match[3]}/${match[2]}/${match[1]}`};
}
function hcuA906Words(value){
 const n=Math.floor(value);
 const w=['nol','satu','dua','tiga','empat','lima','enam','tujuh','delapan','sembilan','sepuluh','sebelas'];
 if(n<12)return w[n];if(n<20)return w[n-10]+' belas';
 if(n<100)return w[Math.floor(n/10)]+' puluh'+(n%10?' '+w[n%10]:'');
 if(n<200)return 'seratus'+(n%100?' '+hcuA906Words(n%100):'');
 if(n<1000)return w[Math.floor(n/100)]+' ratus'+(n%100?' '+hcuA906Words(n%100):'');
 if(n<2000)return 'seribu'+(n%1000?' '+hcuA906Words(n%1000):'');
 if(n<1000000)return hcuA906Words(Math.floor(n/1000))+' ribu'+(n%1000?' '+hcuA906Words(n%1000):'');
 return String(n);
}
function hcuA906Input(label,key,val='',span=false,placeholder=''){
 return `<div class="field ${span?'span2':''}"><label>${hcuA904Esc(label)}</label><input data-a906="${hcuA904Esc(key)}" value="${hcuA904Esc(val)}" placeholder="${hcuA904Esc(placeholder)}" autocomplete="off" maxlength="160"></div>`;
}
function hcuA906Read(k){return (document.querySelector(`[data-a906="${k}"]`)?.value||'').trim();}
function hcuA906Asset(loan){return hcuA904State.assets.find(x=>x.ASSET_ID===loan.ASSET_ID)||null;}
function hcuA906Employee(loan){return hcuA904State.employees.find(x=>x.EMP_ID===loan.EMP_ID)||{};}
/* V9.05.7 — Identitas berita acara dikunci dari Master Pegawai. */
function hcuA907OfficialActive(emp){
 const status=hcuA904S(emp?.STATUS).trim().toLowerCase();
 const job=hcuA904S(emp?.JABATAN).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 const kasubag=/(^| )(kasubag|kepala sub bagian|kepala subbagian)( |$)/.test(job);
 const hc=/(^| )(hc|hcu)( |$)/.test(job)||job.includes('human capital');
 return status==='aktif'&&kasubag&&hc&&(job.includes('umum')||/(^| )hcu( |$)/.test(job));
}
function hcuA907Officials(){return hcuA904State.employees.filter(hcuA907OfficialActive);}
function hcuA907EmpById(id){return hcuA904State.employees.find(x=>hcuA904S(x.EMP_ID).trim()===hcuA904S(id).trim());}
function hcuA907ValidatePerson(person,party){
 if(!person?.EMP_ID)throw Error(party+' belum terhubung dengan EMP_ID Master Pegawai. Perbaiki transaksi/data pegawai terlebih dahulu.');
 for(const [key,label] of [['NAMA','Nama'],['NPP','NPP'],['JABATAN','Jabatan'],['Loket_Kerja','Loket Kerja']]){
  if(!hcuA904S(person[key]).trim())throw Error(label+' '+party+' belum lengkap pada Master Pegawai (EMP_ID '+person.EMP_ID+'). Lengkapi database sebelum cetak.');
 }
 return person;
}
function hcuA907ReturnSignatories(loan,officerId){
 const borrower=hcuA907ValidatePerson(hcuA907EmpById(loan.EMP_ID),'PIHAK PERTAMA / pengembali');
 const officer=hcuA907ValidatePerson(hcuA907EmpById(officerId),'PIHAK KEDUA / penerima');
 if(!hcuA907OfficialActive(officer))throw Error('PIHAK KEDUA harus pegawai berstatus Aktif dengan jabatan Kasubag Human Capital dan Umum/HCU.');
 return {borrower,officer};
}
function hcuA907PersonCard(person){
 if(!person)return '<div class="v9-dialog-note">Belum ada pejabat dipilih.</div>';
 const fmt=(label,val)=>`<div><b>${label}</b>: ${hcuA904Esc(val||'—')}</div>`;
 return `<div class="v9-dialog-note">${fmt('Nama',person.NAMA)}${fmt('NPP',person.NPP)}${fmt('Jabatan',person.JABATAN)}${fmt('Loket Kerja',person.Loket_Kerja)}<small style="display:block;margin-top:6px">Sumber: Master Pegawai Fy_Database · EMP_ID ${hcuA904Esc(person.EMP_ID)} · tidak bisa diedit di surat.</small></div>`;
}
function hcuA908OnOfficerChange(){
 const id=document.getElementById('a908SerahOfficer')?.value||'';
 const el=document.getElementById('a908SerahOfficerSummary');
 if(el)el.innerHTML=hcuA907PersonCard(hcuA907EmpById(id));
}
function hcuA908IssuedNumber(loanId,type='serah'){
 return hcuA904State.issuedLetters.find(x=>x.loanId===loanId&&x.type===type)?.number||'';
}
function hcuA907OnOfficerChange(){
 const id=document.getElementById('a907OfficerSelect')?.value||'';
 const el=document.getElementById('a907OfficerSummary');
 if(el)el.innerHTML=hcuA907PersonCard(hcuA907EmpById(id));
}


const hcuA907FirstViewReady = new Set();
function hcuA907LetterStatus(id,type){
 const item=hcuA904State.issuedLetters.find(x=>x.loanId===id&&x.type===type);
 return item?.qrStatus==='QR_TERBIT'?'QR_TERBIT':'MENUNGGU_CETAK_AWAL';
}
async function hcuA907ConfirmPrint(id,type){
 const btn=document.getElementById('a907ConfirmPrintBtn');
 const number=hcuA908IssuedNumber(id,type);
 if(!number)return toast('Nomor surat tidak tersedia.','error');
 if(!hcuA907FirstViewReady.has(id+'|'+type)){toast('Silakan buka/unduh PDF tanpa QR terlebih dahulu, lalu cetak untuk tanda tangan basah.','error');return;}
 if(!window.confirm('Konfirmasi bahwa PDF awal TANPA QR sudah dicetak untuk tanda tangan basah? Tindakan ini mengaktifkan QR sebagai registrasi internal, BUKAN tanda tangan elektronik.'))return;
 try{
  if(btn)btn.disabled=true;
  hcuA904SetFeedback('progress','Mengonfirmasi cetak awal pada register surat...',1);
  const res=await hcuA904Req('confirmAssetLetterPrintV907',{loanId:id,type,number,confirmedPrinted:true},{timeoutMs:45000});
  if(res.qrStatus!=='QR_TERBIT')throw Error('Status QR belum terkonfirmasi; muat ulang sebelum mencoba kembali.');
  await hcuA904Load(true);
  const status=hcuA907LetterStatus(id,type);
  if(status!=='QR_TERBIT')throw Error('Konfirmasi diterima, tetapi status register belum tersinkron. Jangan ulang konfirmasi; buka ulang menu.');
  hcuA907UpdatePdfGridColors();
  if(btn)btn.style.display='none';
  const t=document.getElementById('a907PrintStatus');if(t)t.textContent='✓ QR registrasi internal telah terbit. Mulai sekarang PDF surat menampilkan QR kedua pihak. Surat fisik tetap memerlukan tanda tangan basah.';
  hcuA904SetFeedback('success','Konfirmasi berhasil. QR telah aktif untuk PDF arsip digital. Nomor surat tidak berubah.');
  toast('QR surat berhasil diaktifkan sebagai penanda registrasi internal.','success');
 }catch(err){hcuA904SetFeedback('error',err.message||'Gagal memproses konfirmasi cetak awal.');}
 finally{if(btn)btn.disabled=false;}
}
// V9.07.2: QR memuat URL verifikasi khusus dokumen, bukan teks NPP.
// Data tampilan dibaca ulang dari snapshot surat yang sudah terdaftar.
function hcuA907QrMatrices(fields,loan,type){
 if(!globalThis.HcuQR907||typeof globalThis.HcuQR907!=='function')throw Error('Generator QR internal tidak tersedia. Muat ulang halaman.');
 const tokens=fields.verificationTokens;
 if(!tokens?.p1||!tokens?.p2)throw Error('Token verifikasi QR belum tersedia. Periksa deployment GAS V9.07.2 dan kunci verifikasi.');
 return ['p1','p2'].map(p=>{
  const token=String(tokens[p]);
  if(!/^SURAT-[A-F0-9]{16}\.(p1|p2)\.[A-Za-z0-9_-]{43}$/.test(token))throw Error('Format token verifikasi surat tidak valid.');
  const url=new URL('/verify-letter.html',window.location.origin);
  url.searchParams.set('token',token);
  return globalThis.HcuQR907(url.toString());
 });
}
function hcuA906OpenLetter(id,type){
 const loan=hcuA904State.loans.find(x=>x.PINJAM_ID===id);
 const asset=loan&&hcuA906Asset(loan);
 if(!loan||!asset){toast('Transaksi tidak ditemukan. Muat ulang modul.','error');return;}
 if(type==='kembali'&&(loan.STATUS_PINJAM!=='DIKEMBALIKAN'||!loan.TANGGAL_KEMBALI)){
  toast('Surat Pengembalian hanya tersedia setelah transaksi pengembalian selesai.','error');return;
 }
 const number=hcuA908IssuedNumber(id,type);
 if(!number){toast('Nomor '+(type==='serah'?'Penyerahan':'Pengembalian')+' belum terdaftar. Untuk transaksi lama, hubungi admin; tombol cetak tidak membuat nomor baru.','error');return;}
 const title=type==='serah'?'Surat Pinjam Pakai Inventaris Perusahaan':'Berita Acara Pengembalian Aset';
 const modal=document.getElementById('a904Modal');if(!modal)return;
 document.getElementById('a904Title').textContent=title+' • '+id;
 document.getElementById('a904ModalBody').innerHTML=`<div class="v9-dialog-note"><b>${hcuA904Esc(asset.NAMA_ASET)} • ${hcuA904Esc(id)}</b><br>Surat sudah terdaftar saat transaksi disimpan. Cetak/Unduh hanya membaca snapshot Fy_Database, tanpa membuat nomor baru.</div>
  <div class="v9-form-grid">${hcuA906Input('Nomor Surat Terdaftar','number',number,true)}
  ${hcuA906Input('Tanggal Transaksi (Fy_Database)','readonlyDate',hcuA904ShortDate(type==='serah'?loan.TANGGAL_SERAH:loan.TANGGAL_KEMBALI),true)}</div>
  <div class="v9-dialog-note">Data PIHAK PERTAMA dan PIHAK KEDUA beserta NPP, Jabatan, dan Loket berasal dari snapshot surat terbit, tidak dapat diedit saat cetak.</div>
  <div id="a907PrintStatus" class="v9-dialog-note" role="status">${hcuA907LetterStatus(id,type)==='QR_TERBIT'?'✓ QR registrasi internal sudah terbit. PDF berikutnya menampilkan QR kedua pihak.':'TAHAP 1: Buka atau unduh PDF tanpa QR untuk tanda tangan basah. Sesudah surat dicetak, pilih Konfirmasi Cetak Awal.'}</div>
  <div class="v9-dialog-actions"><button class="btn secondary" onclick="hcuA904Close()">Tutup</button>
   <button class="btn success" onclick="hcuA906ExportLetter('${hcuA904Esc(id)}','${type}','download')">⬇ Unduh PDF</button>
   <button class="btn secondary" onclick="hcuA906ExportLetter('${hcuA904Esc(id)}','${type}','preview')">↗ Buka PDF untuk Cetak</button>
   <button class="btn success" id="a907ConfirmPrintBtn" ${hcuA907LetterStatus(id,type)==='QR_TERBIT'?'style="display:none"':(hcuA907FirstViewReady.has(id+'|'+type)?'':'disabled')} onclick="hcuA907ConfirmPrint('${hcuA904Esc(id)}','${type}')">✓ Konfirmasi Cetak Awal</button></div>
  <div class="a904-feedback" id="a904SaveMsg"></div>`;
 for(const k of ['number','readonlyDate']){const el=document.querySelector('[data-a906="'+k+'"]');if(el)el.readOnly=true;}
 modal.classList.add('show');hcuA904SetFeedback('success','Nomor '+number+' sudah terdaftar. Surat siap diunduh atau dicetak.');
}

function hcuA906CleanPdf(s){return hcuA904S(s).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/[–—]/g,'-').replace(/[•]/g,'-').replace(/[^\x20-\x7E]/g,' ').trim();}
function hcuA906EscapePDF(text){return hcuA906CleanPdf(text).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');}
function hcuA906PdfBuilder(){
 const height=841.89,width=595.28,margin=62,maxWidth=width-2*margin;
 const pages=[],fonts=['/F1','/F2'];let cmds=[],y=62;
 const addPage=()=>{if(cmds.length)pages.push(cmds.join('\n'));cmds=[];y=62;};
 const text=(t,x,top,size=10.4,bold=false)=>{cmds.push(`BT ${bold?fonts[1]:fonts[0]} ${size} Tf 1 0 0 1 ${x.toFixed(2)} ${(height-top).toFixed(2)} Tm (${hcuA906EscapePDF(t)}) Tj ET`);};
 const rule=(at)=>cmds.push(`0.65 w ${margin} ${(height-at).toFixed(2)} m ${width-margin} ${(height-at).toFixed(2)} l S`);
 const roughWidth=(t,size,bold)=>[...hcuA906CleanPdf(t)].reduce((sum,c)=>sum+(c===' '?0.26:'il.,:;!|'.includes(c)?0.28:'MW@#%'.includes(c)?0.82: /[A-Z0-9]/.test(c)?0.60:bold?0.54:0.50),0)*size;
 const wrap=(input,size,bold=false,max=maxWidth)=>{
  const out=[];hcuA906CleanPdf(input).split('\n').forEach(p=>{
    const words=p.split(/\s+/).filter(Boolean);let line='';
    words.forEach(word=>{const trial=line?line+' '+word:word;
      if(line&&roughWidth(trial,size,bold)>max){out.push(line);line=word;}else line=trial;
    });out.push(line);
  });return out;
 };
 const ensure=(need=20)=>{if(y+need>height-65)addPage()};
 const advance=(v)=>{y+=v;};
 const paragraph=(value,opts={})=>{const size=opts.size||10.1,leading=opts.leading||15;
  const left=margin+(opts.indent||0),lines=wrap(value,size,!!opts.bold,maxWidth-(opts.indent||0));
  lines.forEach(line=>{ensure(leading);text(line,left,y,size,!!opts.bold);advance(leading);});
  advance(opts.after===undefined?8:opts.after);
 };
 const label=(key,value,opts={})=>{const size=opts.size||10.1,leading=14.5,keyW=opts.keyW||140;
  const lines=wrap(value||'-',size,false,maxWidth-keyW-12);
  ensure(Math.max(1,lines.length)*leading);
  text(key,margin+(opts.indent||0),y,size);text(':',margin+keyW-9,y,size);
  lines.forEach((line,i)=>{text(line,margin+keyW,y+i*leading,size);});advance(lines.length*leading);
 };
 const parties=(name,rows)=>{ensure(25+rows.length*15);if(name)paragraph(name,{bold:true,after:5});rows.forEach(([k,v])=>label(k,v,{indent:8,keyW:140}));advance(6);};
 const qrDraw=(matrix,x,top,side)=>{
  const n=matrix.length,quiet=4,step=side/(n+2*quiet);
  // PDF remains vector. Dark modules use full black rectangles for reliable scanning.
  cmds.push('0 0 0 rg');
  matrix.forEach((cells,row)=>cells.forEach((dark,col)=>{
   if(dark)cmds.push(`${(x+(col+quiet)*step).toFixed(3)} ${(height-top-(row+quiet+1)*step).toFixed(3)} ${step.toFixed(3)} ${step.toFixed(3)} re f`);
  }));
 };
 const sign=(leftName,rightName,qrs=null)=>{ensure(qrs?120:124);advance(9);text('PIHAK PERTAMA',margin,y,10.4);text('PIHAK KEDUA',width/2+10,y,10.4);if(qrs){
  advance(8);qrDraw(qrs[0],margin+20,y,116);qrDraw(qrs[1],width/2+30,y,116);advance(130);
 }else{advance(78);}const s1=wrap(leftName,9.8,true,204);const s2=wrap(rightName,9.8,true,204);s1.forEach((v,i)=>text(v,margin,y+i*13,9.8,true));s2.forEach((v,i)=>text(v,width/2+10,y+i*13,9.8,true));advance(Math.max(s1.length,s2.length)*13);};
 const title=(name,number)=>{const lines=wrap(name.toUpperCase(),12.5,true,maxWidth);lines.forEach(line=>{text(line,Math.max(margin,(width-roughWidth(line,12.5,true))/2),y,12.5,true);advance(16)});
  const numbered='NOMOR : '+number;text(numbered,Math.max(margin,(width-roughWidth(numbered,11,true))/2),y,11,true);advance(12);rule(y+1);advance(25);
 };
 const build=()=>{
  if(cmds.length)pages.push(cmds.join('\n'));
  const n=pages.length;
  // Use a PDF object graph with all offsets measured in ASCII bytes.
  const objects=[null];const reserve=()=>{objects.push(null);return objects.length-1;};
  const catalog=reserve(),pageList=reserve(),fontRegular=reserve(),fontBold=reserve();
  const refs=[];pages.forEach(stream=>{const page=reserve(),contents=reserve();refs.push({page,contents,stream});});
  objects[catalog]=`<< /Type /Catalog /Pages ${pageList} 0 R >>`;
  objects[pageList]=`<< /Type /Pages /Kids [${refs.map(r=>r.page+' 0 R').join(' ')}] /Count ${n} >>`;
  objects[fontRegular]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
  objects[fontBold]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
  refs.forEach(r=>{
   objects[r.page]=`<< /Type /Page /Parent ${pageList} 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 ${fontRegular} 0 R /F2 ${fontBold} 0 R >> >> /Contents ${r.contents} 0 R >>`;
   objects[r.contents]=`<< /Length ${r.stream.length} >>\nstream\n${r.stream}\nendstream`;
  });
  let pdf='%PDF-1.4\n';const offsets=[0];
  for(let i=1;i<objects.length;i++){offsets[i]=pdf.length;pdf+=`${i} 0 obj\n${objects[i]}\nendobj\n`;}
  const xref=pdf.length;
  pdf+=`xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for(let i=1;i<offsets.length;i++)pdf+=`${String(offsets[i]).padStart(10,'0')} 00000 n \n`;
  pdf+=`trailer\n<< /Size ${objects.length} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([pdf],{type:'application/pdf'});
 };
 return {paragraph,label,parties,sign,title,advance,build};
}
function hcuA906GenerateLetter(loan,asset,type,fields,qrStatus='MENUNGGU_CETAK_AWAL'){
 const dt=hcuA906DateParts(type==='serah'?loan.TANGGAL_SERAH:loan.TANGGAL_KEMBALI);
 const pdf=hcuA906PdfBuilder();
 pdf.title(type==='serah'?'PINJAM PAKAI INVENTARIS PERUSAHAAN':'BERITA ACARA SERAH TERIMA PENGEMBALIAN ASET',fields.number);
 if(type==='serah'){
  pdf.paragraph(`Pada hari ini ${dt.day} tanggal ${hcuA906Words(dt.date)} bulan ${dt.month} tahun ${hcuA906Words(dt.year)} (${dt.formatted}), yang bertanda tangan dibawah ini :`,{after:10});
  pdf.parties('',[['Nama',fields.p1name],['NPP',fields.p1npp],['Jabatan',fields.p1role],['Loket kantor',fields.p1office]]);
  pdf.paragraph('Sebagai PIHAK PERTAMA',{bold:true,after:7});
  pdf.parties('',[['Nama',fields.p2name],['NPP',fields.p2npp],['Jabatan',fields.p2role],['Loket kantor',fields.p2office]]);
  pdf.paragraph('Sebagai PIHAK KEDUA',{bold:true,after:7});
  pdf.paragraph('PIHAK PERTAMA menyerahkan / meminjamkan kepada PIHAK KEDUA :',{bold:true,after:8});
 }else{
  pdf.paragraph(`Pada hari ini, ${dt.day}, tanggal ${dt.date} bulan ${dt.month} tahun ${dt.year}, yang bertanda tangan di bawah ini:`,{after:10});
  pdf.parties('',[['Nama',fields.p1name],['NPP',fields.p1npp||'-'],['Jabatan',fields.p1role],['Loket Kerja',fields.p1office]]);
  pdf.paragraph('Selanjutnya disebut sebagai PIHAK PERTAMA.',{after:9});
  pdf.parties('',[['Nama',fields.p2name],['NPP',fields.p2npp||'-'],['Jabatan',fields.p2role],['Loket Kerja',fields.p2office]]);
  pdf.paragraph('Selanjutnya disebut sebagai PIHAK KEDUA.',{after:9});
  pdf.paragraph('PIHAK PERTAMA dengan ini menyerahkan kembali aset milik perusahaan kepada PIHAK KEDUA, dan PIHAK KEDUA menyatakan telah menerima aset tersebut dalam keadaan sebagaimana dijelaskan sebagai berikut :',{after:9});
 }
 const category=asset.KATEGORI==='KOMPUTER'?'Komputer':'Kendaraan '+asset.KATEGORI;
 const vehicle=asset._a908Detail||hcuA904State.vehicles.find(x=>x.ASSET_ID===asset.ASSET_ID)||{};
 const serial=asset.KATEGORI==='KOMPUTER'?asset.NO_SERI:[vehicle.NO_RANGKA,vehicle.NO_MESIN].filter(Boolean).join(' / ');
 pdf.label('Nama Asset',asset.NAMA_ASET);
 pdf.label('Jenis Asset',type==='serah'&&asset.KATEGORI==='KOMPUTER'?'Peralatan Komputer':category);
 pdf.label('Nomor Asset',asset.NOMOR_ASET||'-');
 pdf.label('Tahun Perolehan',asset.TAHUN||'-');
 pdf.label('SN/Noka-Nosin',serial||'-');
 if(asset.KATEGORI!=='KOMPUTER')pdf.label('Nomor Polisi',asset.NOPOL||'-');
 if(type==='kembali')pdf.label('Kondisi Kembali',loan.KONDISI_KEMBALI||'-');
 pdf.advance(12);
 if(type==='serah'){
  pdf.paragraph('PIHAK KEDUA telah menerima dalam keadaan '+(loan.KONDISI_SERAH||'baik')+' dan akan menggunakan barang inventaris tersebut untuk kepentingan dinas dan berkewajiban merawat dengan baik.',{after:12});
  pdf.paragraph('Demikian Berita Acara Serah Terima Inventaris Perusahaan dibuat dalam rangkap 2 (dua) untuk dapat dipergunakan sebagaimana mestinya.',{after:26});
 }else{
  pdf.paragraph('Atas pengembalian tersebut :',{after:4});
  pdf.paragraph('1. PIHAK KEDUA telah melakukan pengecekan fisik dan fungsi terhadap aset yang dikembalikan oleh PIHAK PERTAMA.',{indent:14,after:2});
  pdf.paragraph('2. Apabila dikemudian hari ditemukan kerusakan tersembunyi yang belum dilaporkan saat serah terima ini (Khususnya untuk perangkat elektronik), maka akan diselesaikan sesuai kebijakan perusahaan yang berlaku.',{indent:14,after:8});
  const reason=fields.reason?` sehubungan dengan ${fields.reason}.`:'.';
  pdf.paragraph('Demikian Berita Acara ini dibuat dengan sebenarnya dalam 2 (dua) rangkap untuk dipergunakan sebagaimana mestinya, serta menjadi bukti bahwa PIHAK PERTAMA telah menyelesaikan kewajiban pengembalian aset perusahaan'+reason,{after:9});
  pdf.paragraph(`${fields.city}, ${dt.date} ${dt.month} ${dt.year}`,{after:15});
 }
 pdf.sign(fields.p1name,fields.p2name,qrStatus==='QR_TERBIT'?hcuA907QrMatrices(fields,loan,type):null);
 return pdf.build();
}
// V9.06.4: buka PDF resmi langsung melalui tautan Kartu Kontrol.
// GET getAssetLetterV9060 bersifat READ ONLY, memakai snapshot terbit.
// Tidak ada POST, pendaftaran nomor baru, atau perubahan Fy_Database.
async function hcuA9064OpenRegisteredLetter(id,type){
 if(!['serah','kembali'].includes(type)){toast('Jenis surat tidak dikenali.','error');return;}
 const loan=hcuA904State.loans.find(x=>x.PINJAM_ID===id);
 const number=hcuA908IssuedNumber(id,type);
 if(!loan||!number){toast('Surat belum terdaftar untuk transaksi ini.','error');return;}
 if(type==='kembali'&&(loan.STATUS_PINJAM!=='DIKEMBALIKAN'||!loan.TANGGAL_KEMBALI)){
  toast('Surat pengembalian belum dapat dibuka karena transaksi belum selesai.','error');return;
 }
 // Dibuka langsung saat klik agar browser tidak menghalangi tab baru setelah await/fetch.
 const tab=window.open('about:blank','_blank');
 if(!tab){toast('Browser memblokir tab PDF. Izinkan pop-up untuk HCU-Portal dan coba lagi.','error');return;}
 try{
  tab.opener=null;
  tab.document.title='Menyiapkan PDF Surat Aset';
  tab.document.body.textContent='Memuat PDF surat terdaftar dari Fy_Database...';
  tab.document.body.style.cssText='font:15px system-ui,sans-serif;padding:30px;color:#173e68';
  const issued=await hcuA904Req('getAssetLetterV9060',null,{params:{loanId:id,type},timeoutMs:40000});
  if(!issued.snapshot?.officer||!issued.snapshot?.borrower||!issued.snapshot?.asset||!issued.snapshot?.loan)throw Error('Snapshot surat terdaftar tidak lengkap.');
  if(issued.number!==number)throw Error('Nomor surat berbeda dengan register. Buka ulang modul untuk membaca data terbaru.');
  const snap=issued.snapshot;
  const serah=type==='serah';
  const fields={number:issued.number,city:snap.city||'Palembang',reason:snap.reason||'',
   p1name:serah?snap.officer.NAMA:snap.borrower.NAMA,p1npp:serah?snap.officer.NPP:snap.borrower.NPP,
   p1role:serah?snap.officer.JABATAN:snap.borrower.JABATAN,p1office:serah?snap.officer.Loket_Kerja:snap.borrower.Loket_Kerja,
   p2name:serah?snap.borrower.NAMA:snap.officer.NAMA,p2npp:serah?snap.borrower.NPP:snap.officer.NPP,
   p2role:serah?snap.borrower.JABATAN:snap.officer.JABATAN,p2office:serah?snap.borrower.Loket_Kerja:snap.officer.Loket_Kerja};
  for(const key of ['number','city','p1name','p1npp','p1role','p1office','p2name','p2npp','p2role','p2office']){
   if(!fields[key])throw Error('Data surat belum lengkap: '+key);
  }
  const asset={...snap.asset,_a908Detail:snap.detail||{}};
  fields.verificationTokens=issued.verificationTokens;
  const blob=hcuA906GenerateLetter(snap.loan,asset,type,fields,issued.qrStatus);
  const blobUrl=URL.createObjectURL(blob);
  tab.location.replace(blobUrl);
  setTimeout(()=>URL.revokeObjectURL(blobUrl),600000);
  if(issued.qrStatus!=='QR_TERBIT'){
   // Membuka PDF dari Kartu Kontrol = first view disiapkan, BUKAN konfirmasi cetak.
   // Petugas tetap harus menyatakan bahwa cetak basah sudah dilakukan.
   hcuA907FirstViewReady.add(id+'|'+type);
   toast('Surat awal tanpa QR dibuka. Setelah dicetak, pilih Cetak awal / Konfirmasi / Aktifkan QR di Kartu Kontrol.','success');
  }
 }catch(err){
  try{tab.document.title='PDF Surat Gagal Dibuka';tab.document.body.textContent='PDF tidak dapat dibuka: '+(err?.message||'Kesalahan koneksi Fy_Database');}catch(_){/* tab ditutup saat proses */}
  toast(err?.message||'Gagal membuka PDF dari Fy_Database.','error');
 }
}

async function hcuA906ExportLetter(id,type,mode){
 const printTab=mode==='preview'?window.open('about:blank','_blank'):null;
 if(mode==='preview'&&!printTab){toast('Browser memblokir tab PDF. Izinkan pop-up HCU-Portal terlebih dahulu.','error');return;}
 if(printTab){printTab.opener=null;printTab.document.title='Menyiapkan Surat Aset';printTab.document.body.textContent='Menyiapkan dokumen Fy_Database...';}
 const buttons=[...document.querySelectorAll('#a904ModalBody .v9-dialog-actions button')];
 try{
  const loan=hcuA904State.loans.find(l=>l.PINJAM_ID===id);
  if(!loan)throw Error('Transaksi tidak ditemukan. Buka kembali halaman Pinjam Pakai.');
  const issuedNum=hcuA908IssuedNumber(id,type);
  if(!issuedNum)throw Error('Nomor surat belum terdaftar. Cetak tidak dapat menerbitkan nomor baru.');
  buttons.forEach(b=>b.disabled=true);
  hcuA904SetFeedback('progress','Mengambil snapshot surat yang sudah terdaftar — READ ONLY...',1);
  const issued=await hcuA904Req('getAssetLetterV9060',null,{params:{loanId:id,type},timeoutMs:40000});
  if(!issued.snapshot?.officer||!issued.snapshot?.borrower||!issued.snapshot?.asset||!issued.snapshot?.loan)throw Error('Data surat terdaftar tidak lengkap.');
  if(issued.number!==issuedNum)throw Error('Nomor surat tidak sesuai dengan register terbaru. Muat ulang halaman.');
  const ss=issued.snapshot,serah=type==='serah';
  const f={number:issued.number,city:ss.city||'Palembang',reason:ss.reason||'',
   p1name:serah?ss.officer.NAMA:ss.borrower.NAMA,p1npp:serah?ss.officer.NPP:ss.borrower.NPP,
   p1role:serah?ss.officer.JABATAN:ss.borrower.JABATAN,p1office:serah?ss.officer.Loket_Kerja:ss.borrower.Loket_Kerja,
   p2name:serah?ss.borrower.NAMA:ss.officer.NAMA,p2npp:serah?ss.borrower.NPP:ss.officer.NPP,
   p2role:serah?ss.borrower.JABATAN:ss.officer.JABATAN,p2office:serah?ss.borrower.Loket_Kerja:ss.officer.Loket_Kerja};
  for(const key of ['number','city','p1name','p1npp','p1role','p1office','p2name','p2npp','p2role','p2office'])if(!f[key])throw Error('Data surat belum lengkap: '+key);
  const asset={...ss.asset,_a908Detail:ss.detail||{}};
  f.verificationTokens=issued.verificationTokens;
  const file=hcuA906GenerateLetter(ss.loan,asset,type,f,issued.qrStatus);
  const url=URL.createObjectURL(file);
  const filename=`${serah?'Surat_Penyerahan':'Surat_Pengembalian'}_${id}_${ss.asset.ASSET_ID}.pdf`;
  if(mode==='download'){
   const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
  }else{
   printTab.location.replace(url);
  }
  setTimeout(()=>URL.revokeObjectURL(url),mode==='preview'?600000:120000);
  if(issued.qrStatus!=='QR_TERBIT'){
   hcuA907FirstViewReady.add(id+'|'+type);
   const confirm=document.getElementById('a907ConfirmPrintBtn');if(confirm)confirm.disabled=false;
   const info=document.getElementById('a907PrintStatus');if(info)info.textContent='PDF awal tanpa QR telah disiapkan. Setelah benar-benar dicetak untuk tanda tangan basah, klik Konfirmasi Cetak Awal.';
  }
  hcuA904SetFeedback('success','PDF '+issued.number+' berhasil disiapkan. Tidak ada pendaftaran nomor ulang.');
  toast('PDF berhasil disiapkan dari surat yang sudah terdaftar.','success');
 }catch(err){if(printTab){try{printTab.document.title='Surat Gagal Dibuka';printTab.document.body.textContent='PDF tidak dapat ditampilkan: '+(err.message||'Kesalahan Fy_Database');}catch(_){/* already closed */}}hcuA904SetFeedback('error',err.message||'Gagal membaca surat dari database.');toast(err.message||'Gagal membaca surat.','error');}
 finally{buttons.forEach(b=>{b.disabled=b.id==='a907ConfirmPrintBtn' ? !hcuA907FirstViewReady.has(id+'|'+type) : false;});}
}


/* QR module generator (Kazuhiko Arase, MIT license). Adapted from qr-code vendor
 * distribution in qrcode-terminal. MIT permission notice retained here.
 * Copyright (c) 2009 Kazuhiko Arase
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
 * of the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to inclusion of this copyright and permission notice.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.
 */
;(function(global){
'use strict';
const mods=Object.create(null),cache=Object.create(null);
const requireQr=function(p){const key=p.replace(/^\.\//,'');if(cache[key])return cache[key].exports;const fac=mods[key];if(!fac)throw Error('QR module: '+key);const module={exports:{}};cache[key]=module;fac(requireQr,module,module.exports);return module.exports;};
mods["QRMode"]=function(require,module,exports){
module.exports = {
    MODE_NUMBER :       1 << 0,
    MODE_ALPHA_NUM :    1 << 1,
    MODE_8BIT_BYTE :    1 << 2,
    MODE_KANJI :        1 << 3
};

};
mods["QRErrorCorrectLevel"]=function(require,module,exports){
module.exports = {
	L : 1,
	M : 0,
	Q : 3,
	H : 2
};


};
mods["QRMaskPattern"]=function(require,module,exports){
module.exports = {
	PATTERN000 : 0,
	PATTERN001 : 1,
	PATTERN010 : 2,
	PATTERN011 : 3,
	PATTERN100 : 4,
	PATTERN101 : 5,
	PATTERN110 : 6,
	PATTERN111 : 7
};

};
mods["QRMath"]=function(require,module,exports){
var QRMath = {

	glog : function(n) {
	
		if (n < 1) {
			throw new Error("glog(" + n + ")");
		}
		
		return QRMath.LOG_TABLE[n];
	},
	
	gexp : function(n) {
	
		while (n < 0) {
			n += 255;
		}
	
		while (n >= 256) {
			n -= 255;
		}
	
		return QRMath.EXP_TABLE[n];
	},
	
	EXP_TABLE : new Array(256),
	
	LOG_TABLE : new Array(256)

};
	
for (var i = 0; i < 8; i++) {
	QRMath.EXP_TABLE[i] = 1 << i;
}
for (var i = 8; i < 256; i++) {
	QRMath.EXP_TABLE[i] = QRMath.EXP_TABLE[i - 4]
		^ QRMath.EXP_TABLE[i - 5]
		^ QRMath.EXP_TABLE[i - 6]
		^ QRMath.EXP_TABLE[i - 8];
}
for (var i = 0; i < 255; i++) {
	QRMath.LOG_TABLE[QRMath.EXP_TABLE[i] ] = i;
}

module.exports = QRMath;

};
mods["QRPolynomial"]=function(require,module,exports){
var QRMath = require('./QRMath');

function QRPolynomial(num, shift) {
	if (num.length === undefined) {
		throw new Error(num.length + "/" + shift);
	}

	var offset = 0;

	while (offset < num.length && num[offset] === 0) {
		offset++;
	}

	this.num = new Array(num.length - offset + shift);
	for (var i = 0; i < num.length - offset; i++) {
		this.num[i] = num[i + offset];
	}
}

QRPolynomial.prototype = {

	get : function(index) {
		return this.num[index];
	},
	
	getLength : function() {
		return this.num.length;
	},
	
	multiply : function(e) {
	
		var num = new Array(this.getLength() + e.getLength() - 1);
	
		for (var i = 0; i < this.getLength(); i++) {
			for (var j = 0; j < e.getLength(); j++) {
				num[i + j] ^= QRMath.gexp(QRMath.glog(this.get(i) ) + QRMath.glog(e.get(j) ) );
			}
		}
	
		return new QRPolynomial(num, 0);
	},
	
	mod : function(e) {
	
		if (this.getLength() - e.getLength() < 0) {
			return this;
		}
	
		var ratio = QRMath.glog(this.get(0) ) - QRMath.glog(e.get(0) );
	
		var num = new Array(this.getLength() );
		
		for (var i = 0; i < this.getLength(); i++) {
			num[i] = this.get(i);
		}
		
		for (var x = 0; x < e.getLength(); x++) {
			num[x] ^= QRMath.gexp(QRMath.glog(e.get(x) ) + ratio);
		}
	
		// recursive call
		return new QRPolynomial(num, 0).mod(e);
	}
};

module.exports = QRPolynomial;

};
mods["QR8bitByte"]=function(require,module,exports){
var QRMode = require('./QRMode');

function QR8bitByte(data) {
	this.mode = QRMode.MODE_8BIT_BYTE;
	this.data = data;
}

QR8bitByte.prototype = {

	getLength : function() {
		return this.data.length;
	},
	
	write : function(buffer) {
		for (var i = 0; i < this.data.length; i++) {
			// not JIS ...
			buffer.put(this.data.charCodeAt(i), 8);
		}
	}
};

module.exports = QR8bitByte;

};
mods["QRBitBuffer"]=function(require,module,exports){
function QRBitBuffer() {
	this.buffer = [];
	this.length = 0;
}

QRBitBuffer.prototype = {

	get : function(index) {
		var bufIndex = Math.floor(index / 8);
		return ( (this.buffer[bufIndex] >>> (7 - index % 8) ) & 1) == 1;
	},
	
	put : function(num, length) {
		for (var i = 0; i < length; i++) {
			this.putBit( ( (num >>> (length - i - 1) ) & 1) == 1);
		}
	},
	
	getLengthInBits : function() {
		return this.length;
	},
	
	putBit : function(bit) {
	
		var bufIndex = Math.floor(this.length / 8);
		if (this.buffer.length <= bufIndex) {
			this.buffer.push(0);
		}
	
		if (bit) {
			this.buffer[bufIndex] |= (0x80 >>> (this.length % 8) );
		}
	
		this.length++;
	}
};

module.exports = QRBitBuffer;

};
mods["QRRSBlock"]=function(require,module,exports){
var QRErrorCorrectLevel = require('./QRErrorCorrectLevel');

function QRRSBlock(totalCount, dataCount) {
	this.totalCount = totalCount;
	this.dataCount  = dataCount;
}

QRRSBlock.RS_BLOCK_TABLE = [

	// L
	// M
	// Q
	// H

	// 1
	[1, 26, 19],
	[1, 26, 16],
	[1, 26, 13],
	[1, 26, 9],
	
	// 2
	[1, 44, 34],
	[1, 44, 28],
	[1, 44, 22],
	[1, 44, 16],

	// 3
	[1, 70, 55],
	[1, 70, 44],
	[2, 35, 17],
	[2, 35, 13],

	// 4		
	[1, 100, 80],
	[2, 50, 32],
	[2, 50, 24],
	[4, 25, 9],
	
	// 5
	[1, 134, 108],
	[2, 67, 43],
	[2, 33, 15, 2, 34, 16],
	[2, 33, 11, 2, 34, 12],
	
	// 6
	[2, 86, 68],
	[4, 43, 27],
	[4, 43, 19],
	[4, 43, 15],
	
	// 7		
	[2, 98, 78],
	[4, 49, 31],
	[2, 32, 14, 4, 33, 15],
	[4, 39, 13, 1, 40, 14],
	
	// 8
	[2, 121, 97],
	[2, 60, 38, 2, 61, 39],
	[4, 40, 18, 2, 41, 19],
	[4, 40, 14, 2, 41, 15],
	
	// 9
	[2, 146, 116],
	[3, 58, 36, 2, 59, 37],
	[4, 36, 16, 4, 37, 17],
	[4, 36, 12, 4, 37, 13],
	
	// 10		
	[2, 86, 68, 2, 87, 69],
	[4, 69, 43, 1, 70, 44],
	[6, 43, 19, 2, 44, 20],
	[6, 43, 15, 2, 44, 16],

	// 11
	[4, 101, 81],
	[1, 80, 50, 4, 81, 51],
	[4, 50, 22, 4, 51, 23],
	[3, 36, 12, 8, 37, 13],

	// 12
	[2, 116, 92, 2, 117, 93],
	[6, 58, 36, 2, 59, 37],
	[4, 46, 20, 6, 47, 21],
	[7, 42, 14, 4, 43, 15],

	// 13
	[4, 133, 107],
	[8, 59, 37, 1, 60, 38],
	[8, 44, 20, 4, 45, 21],
	[12, 33, 11, 4, 34, 12],

	// 14
	[3, 145, 115, 1, 146, 116],
	[4, 64, 40, 5, 65, 41],
	[11, 36, 16, 5, 37, 17],
	[11, 36, 12, 5, 37, 13],

	// 15
	[5, 109, 87, 1, 110, 88],
	[5, 65, 41, 5, 66, 42],
	[5, 54, 24, 7, 55, 25],
	[11, 36, 12],

	// 16
	[5, 122, 98, 1, 123, 99],
	[7, 73, 45, 3, 74, 46],
	[15, 43, 19, 2, 44, 20],
	[3, 45, 15, 13, 46, 16],

	// 17
	[1, 135, 107, 5, 136, 108],
	[10, 74, 46, 1, 75, 47],
	[1, 50, 22, 15, 51, 23],
	[2, 42, 14, 17, 43, 15],

	// 18
	[5, 150, 120, 1, 151, 121],
	[9, 69, 43, 4, 70, 44],
	[17, 50, 22, 1, 51, 23],
	[2, 42, 14, 19, 43, 15],

	// 19
	[3, 141, 113, 4, 142, 114],
	[3, 70, 44, 11, 71, 45],
	[17, 47, 21, 4, 48, 22],
	[9, 39, 13, 16, 40, 14],

	// 20
	[3, 135, 107, 5, 136, 108],
	[3, 67, 41, 13, 68, 42],
	[15, 54, 24, 5, 55, 25],
	[15, 43, 15, 10, 44, 16],

	// 21
	[4, 144, 116, 4, 145, 117],
	[17, 68, 42],
	[17, 50, 22, 6, 51, 23],
	[19, 46, 16, 6, 47, 17],

	// 22
	[2, 139, 111, 7, 140, 112],
	[17, 74, 46],
	[7, 54, 24, 16, 55, 25],
	[34, 37, 13],

	// 23
	[4, 151, 121, 5, 152, 122],
	[4, 75, 47, 14, 76, 48],
	[11, 54, 24, 14, 55, 25],
	[16, 45, 15, 14, 46, 16],

	// 24
	[6, 147, 117, 4, 148, 118],
	[6, 73, 45, 14, 74, 46],
	[11, 54, 24, 16, 55, 25],
	[30, 46, 16, 2, 47, 17],

	// 25
	[8, 132, 106, 4, 133, 107],
	[8, 75, 47, 13, 76, 48],
	[7, 54, 24, 22, 55, 25],
	[22, 45, 15, 13, 46, 16],

	// 26
	[10, 142, 114, 2, 143, 115],
	[19, 74, 46, 4, 75, 47],
	[28, 50, 22, 6, 51, 23],
	[33, 46, 16, 4, 47, 17],

	// 27
	[8, 152, 122, 4, 153, 123],
	[22, 73, 45, 3, 74, 46],
	[8, 53, 23, 26, 54, 24],
	[12, 45, 15, 28, 46, 16],

	// 28
	[3, 147, 117, 10, 148, 118],
	[3, 73, 45, 23, 74, 46],
	[4, 54, 24, 31, 55, 25],
	[11, 45, 15, 31, 46, 16],

	// 29
	[7, 146, 116, 7, 147, 117],
	[21, 73, 45, 7, 74, 46],
	[1, 53, 23, 37, 54, 24],
	[19, 45, 15, 26, 46, 16],

	// 30
	[5, 145, 115, 10, 146, 116],
	[19, 75, 47, 10, 76, 48],
	[15, 54, 24, 25, 55, 25],
	[23, 45, 15, 25, 46, 16],

	// 31
	[13, 145, 115, 3, 146, 116],
	[2, 74, 46, 29, 75, 47],
	[42, 54, 24, 1, 55, 25],
	[23, 45, 15, 28, 46, 16],

	// 32
	[17, 145, 115],
	[10, 74, 46, 23, 75, 47],
	[10, 54, 24, 35, 55, 25],
	[19, 45, 15, 35, 46, 16],

	// 33
	[17, 145, 115, 1, 146, 116],
	[14, 74, 46, 21, 75, 47],
	[29, 54, 24, 19, 55, 25],
	[11, 45, 15, 46, 46, 16],

	// 34
	[13, 145, 115, 6, 146, 116],
	[14, 74, 46, 23, 75, 47],
	[44, 54, 24, 7, 55, 25],
	[59, 46, 16, 1, 47, 17],

	// 35
	[12, 151, 121, 7, 152, 122],
	[12, 75, 47, 26, 76, 48],
	[39, 54, 24, 14, 55, 25],
	[22, 45, 15, 41, 46, 16],

	// 36
	[6, 151, 121, 14, 152, 122],
	[6, 75, 47, 34, 76, 48],
	[46, 54, 24, 10, 55, 25],
	[2, 45, 15, 64, 46, 16],

	// 37
	[17, 152, 122, 4, 153, 123],
	[29, 74, 46, 14, 75, 47],
	[49, 54, 24, 10, 55, 25],
	[24, 45, 15, 46, 46, 16],

	// 38
	[4, 152, 122, 18, 153, 123],
	[13, 74, 46, 32, 75, 47],
	[48, 54, 24, 14, 55, 25],
	[42, 45, 15, 32, 46, 16],

	// 39
	[20, 147, 117, 4, 148, 118],
	[40, 75, 47, 7, 76, 48],
	[43, 54, 24, 22, 55, 25],
	[10, 45, 15, 67, 46, 16],

	// 40
	[19, 148, 118, 6, 149, 119],
	[18, 75, 47, 31, 76, 48],
	[34, 54, 24, 34, 55, 25],
	[20, 45, 15, 61, 46, 16]
];

QRRSBlock.getRSBlocks = function(typeNumber, errorCorrectLevel) {
	
	var rsBlock = QRRSBlock.getRsBlockTable(typeNumber, errorCorrectLevel);
	
	if (rsBlock === undefined) {
		throw new Error("bad rs block @ typeNumber:" + typeNumber + "/errorCorrectLevel:" + errorCorrectLevel);
	}

	var length = rsBlock.length / 3;
	
	var list = [];
	
	for (var i = 0; i < length; i++) {

		var count = rsBlock[i * 3 + 0];
		var totalCount = rsBlock[i * 3 + 1];
		var dataCount  = rsBlock[i * 3 + 2];

		for (var j = 0; j < count; j++) {
			list.push(new QRRSBlock(totalCount, dataCount) );	
		}
	}
	
	return list;
};

QRRSBlock.getRsBlockTable = function(typeNumber, errorCorrectLevel) {

	switch(errorCorrectLevel) {
	case QRErrorCorrectLevel.L :
		return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
	case QRErrorCorrectLevel.M :
		return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
	case QRErrorCorrectLevel.Q :
		return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
	case QRErrorCorrectLevel.H :
		return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
	default :
		return undefined;
	}
};

module.exports = QRRSBlock;

};
mods["QRUtil"]=function(require,module,exports){
var QRMode = require('./QRMode');
var QRPolynomial = require('./QRPolynomial');
var QRMath = require('./QRMath');
var QRMaskPattern = require('./QRMaskPattern');

var QRUtil = {

    PATTERN_POSITION_TABLE : [
        [],
        [6, 18],
        [6, 22],
        [6, 26],
        [6, 30],
        [6, 34],
        [6, 22, 38],
        [6, 24, 42],
        [6, 26, 46],
        [6, 28, 50],
        [6, 30, 54],        
        [6, 32, 58],
        [6, 34, 62],
        [6, 26, 46, 66],
        [6, 26, 48, 70],
        [6, 26, 50, 74],
        [6, 30, 54, 78],
        [6, 30, 56, 82],
        [6, 30, 58, 86],
        [6, 34, 62, 90],
        [6, 28, 50, 72, 94],
        [6, 26, 50, 74, 98],
        [6, 30, 54, 78, 102],
        [6, 28, 54, 80, 106],
        [6, 32, 58, 84, 110],
        [6, 30, 58, 86, 114],
        [6, 34, 62, 90, 118],
        [6, 26, 50, 74, 98, 122],
        [6, 30, 54, 78, 102, 126],
        [6, 26, 52, 78, 104, 130],
        [6, 30, 56, 82, 108, 134],
        [6, 34, 60, 86, 112, 138],
        [6, 30, 58, 86, 114, 142],
        [6, 34, 62, 90, 118, 146],
        [6, 30, 54, 78, 102, 126, 150],
        [6, 24, 50, 76, 102, 128, 154],
        [6, 28, 54, 80, 106, 132, 158],
        [6, 32, 58, 84, 110, 136, 162],
        [6, 26, 54, 82, 110, 138, 166],
        [6, 30, 58, 86, 114, 142, 170]
    ],

    G15 : (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0),
    G18 : (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0),
    G15_MASK : (1 << 14) | (1 << 12) | (1 << 10)    | (1 << 4) | (1 << 1),

    getBCHTypeInfo : function(data) {
        var d = data << 10;
        while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15) >= 0) {
            d ^= (QRUtil.G15 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15) ) );    
        }
        return ( (data << 10) | d) ^ QRUtil.G15_MASK;
    },

    getBCHTypeNumber : function(data) {
        var d = data << 12;
        while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18) >= 0) {
            d ^= (QRUtil.G18 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18) ) );    
        }
        return (data << 12) | d;
    },

    getBCHDigit : function(data) {

        var digit = 0;

        while (data !== 0) {
            digit++;
            data >>>= 1;
        }

        return digit;
    },

    getPatternPosition : function(typeNumber) {
        return QRUtil.PATTERN_POSITION_TABLE[typeNumber - 1];
    },

    getMask : function(maskPattern, i, j) {
        
        switch (maskPattern) {
            
        case QRMaskPattern.PATTERN000 : return (i + j) % 2 === 0;
        case QRMaskPattern.PATTERN001 : return i % 2 === 0;
        case QRMaskPattern.PATTERN010 : return j % 3 === 0;
        case QRMaskPattern.PATTERN011 : return (i + j) % 3 === 0;
        case QRMaskPattern.PATTERN100 : return (Math.floor(i / 2) + Math.floor(j / 3) ) % 2 === 0;
        case QRMaskPattern.PATTERN101 : return (i * j) % 2 + (i * j) % 3 === 0;
        case QRMaskPattern.PATTERN110 : return ( (i * j) % 2 + (i * j) % 3) % 2 === 0;
        case QRMaskPattern.PATTERN111 : return ( (i * j) % 3 + (i + j) % 2) % 2 === 0;

        default :
            throw new Error("bad maskPattern:" + maskPattern);
        }
    },

    getErrorCorrectPolynomial : function(errorCorrectLength) {

        var a = new QRPolynomial([1], 0);

        for (var i = 0; i < errorCorrectLength; i++) {
            a = a.multiply(new QRPolynomial([1, QRMath.gexp(i)], 0) );
        }

        return a;
    },

    getLengthInBits : function(mode, type) {

        if (1 <= type && type < 10) {

            // 1 - 9

            switch(mode) {
            case QRMode.MODE_NUMBER     : return 10;
            case QRMode.MODE_ALPHA_NUM  : return 9;
            case QRMode.MODE_8BIT_BYTE  : return 8;
            case QRMode.MODE_KANJI      : return 8;
            default :
                throw new Error("mode:" + mode);
            }

        } else if (type < 27) {

            // 10 - 26

            switch(mode) {
            case QRMode.MODE_NUMBER     : return 12;
            case QRMode.MODE_ALPHA_NUM  : return 11;
            case QRMode.MODE_8BIT_BYTE  : return 16;
            case QRMode.MODE_KANJI      : return 10;
            default :
                throw new Error("mode:" + mode);
            }

        } else if (type < 41) {

            // 27 - 40

            switch(mode) {
            case QRMode.MODE_NUMBER     : return 14;
            case QRMode.MODE_ALPHA_NUM  : return 13;
            case QRMode.MODE_8BIT_BYTE  : return 16;
            case QRMode.MODE_KANJI      : return 12;
            default :
                throw new Error("mode:" + mode);
            }

        } else {
            throw new Error("type:" + type);
        }
    },

    getLostPoint : function(qrCode) {
        
        var moduleCount = qrCode.getModuleCount();
        var lostPoint = 0;
        var row = 0; 
        var col = 0;

        
        // LEVEL1
        
        for (row = 0; row < moduleCount; row++) {

            for (col = 0; col < moduleCount; col++) {

                var sameCount = 0;
                var dark = qrCode.isDark(row, col);

                for (var r = -1; r <= 1; r++) {

                    if (row + r < 0 || moduleCount <= row + r) {
                        continue;
                    }

                    for (var c = -1; c <= 1; c++) {

                        if (col + c < 0 || moduleCount <= col + c) {
                            continue;
                        }

                        if (r === 0 && c === 0) {
                            continue;
                        }

                        if (dark === qrCode.isDark(row + r, col + c) ) {
                            sameCount++;
                        }
                    }
                }

                if (sameCount > 5) {
                    lostPoint += (3 + sameCount - 5);
                }
            }
        }

        // LEVEL2

        for (row = 0; row < moduleCount - 1; row++) {
            for (col = 0; col < moduleCount - 1; col++) {
                var count = 0;
                if (qrCode.isDark(row,     col    ) ) count++;
                if (qrCode.isDark(row + 1, col    ) ) count++;
                if (qrCode.isDark(row,     col + 1) ) count++;
                if (qrCode.isDark(row + 1, col + 1) ) count++;
                if (count === 0 || count === 4) {
                    lostPoint += 3;
                }
            }
        }

        // LEVEL3

        for (row = 0; row < moduleCount; row++) {
            for (col = 0; col < moduleCount - 6; col++) {
                if (qrCode.isDark(row, col) && 
                        !qrCode.isDark(row, col + 1) && 
                         qrCode.isDark(row, col + 2) && 
                         qrCode.isDark(row, col + 3) && 
                         qrCode.isDark(row, col + 4) && 
                        !qrCode.isDark(row, col + 5) && 
                         qrCode.isDark(row, col + 6) ) {
                    lostPoint += 40;
                }
            }
        }

        for (col = 0; col < moduleCount; col++) {
            for (row = 0; row < moduleCount - 6; row++) {
                if (qrCode.isDark(row, col) &&
                        !qrCode.isDark(row + 1, col) &&
                         qrCode.isDark(row + 2, col) &&
                         qrCode.isDark(row + 3, col) &&
                         qrCode.isDark(row + 4, col) &&
                        !qrCode.isDark(row + 5, col) &&
                         qrCode.isDark(row + 6, col) ) {
                    lostPoint += 40;
                }
            }
        }

        // LEVEL4
        
        var darkCount = 0;

        for (col = 0; col < moduleCount; col++) {
            for (row = 0; row < moduleCount; row++) {
                if (qrCode.isDark(row, col) ) {
                    darkCount++;
                }
            }
        }
        
        var ratio = Math.abs(100 * darkCount / moduleCount / moduleCount - 50) / 5;
        lostPoint += ratio * 10;

        return lostPoint;       
    }

};

module.exports = QRUtil;

};
mods["index"]=function(require,module,exports){
//---------------------------------------------------------------------
// QRCode for JavaScript
//
// Copyright (c) 2009 Kazuhiko Arase
//
// URL: http://www.d-project.com/
//
// Licensed under the MIT license:
//   http://www.opensource.org/licenses/mit-license.php
//
// The word "QR Code" is registered trademark of 
// DENSO WAVE INCORPORATED
//   http://www.denso-wave.com/qrcode/faqpatent-e.html
//
//---------------------------------------------------------------------
// Modified to work in node for this project (and some refactoring)
//---------------------------------------------------------------------

var QR8bitByte = require('./QR8bitByte');
var QRUtil = require('./QRUtil');
var QRPolynomial = require('./QRPolynomial');
var QRRSBlock = require('./QRRSBlock');
var QRBitBuffer = require('./QRBitBuffer');

function QRCode(typeNumber, errorCorrectLevel) {
	this.typeNumber = typeNumber;
	this.errorCorrectLevel = errorCorrectLevel;
	this.modules = null;
	this.moduleCount = 0;
	this.dataCache = null;
	this.dataList = [];
}

QRCode.prototype = {
	
	addData : function(data) {
		var newData = new QR8bitByte(data);
		this.dataList.push(newData);
		this.dataCache = null;
	},
	
	isDark : function(row, col) {
		if (row < 0 || this.moduleCount <= row || col < 0 || this.moduleCount <= col) {
			throw new Error(row + "," + col);
		}
		return this.modules[row][col];
	},

	getModuleCount : function() {
		return this.moduleCount;
	},
	
	make : function() {
		// Calculate automatically typeNumber if provided is < 1
		if (this.typeNumber < 1 ){
			var typeNumber = 1;
			for (typeNumber = 1; typeNumber < 40; typeNumber++) {
				var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, this.errorCorrectLevel);

				var buffer = new QRBitBuffer();
				var totalDataCount = 0;
				for (var i = 0; i < rsBlocks.length; i++) {
					totalDataCount += rsBlocks[i].dataCount;
				}

				for (var x = 0; x < this.dataList.length; x++) {
					var data = this.dataList[x];
					buffer.put(data.mode, 4);
					buffer.put(data.getLength(), QRUtil.getLengthInBits(data.mode, typeNumber) );
					data.write(buffer);
				}
				if (buffer.getLengthInBits() <= totalDataCount * 8)
					break;
			}
			this.typeNumber = typeNumber;
		}
		this.makeImpl(false, this.getBestMaskPattern() );
	},
	
	makeImpl : function(test, maskPattern) {
		
		this.moduleCount = this.typeNumber * 4 + 17;
		this.modules = new Array(this.moduleCount);
		
		for (var row = 0; row < this.moduleCount; row++) {
			
			this.modules[row] = new Array(this.moduleCount);
			
			for (var col = 0; col < this.moduleCount; col++) {
				this.modules[row][col] = null;//(col + row) % 3;
			}
		}
	
		this.setupPositionProbePattern(0, 0);
		this.setupPositionProbePattern(this.moduleCount - 7, 0);
		this.setupPositionProbePattern(0, this.moduleCount - 7);
		this.setupPositionAdjustPattern();
		this.setupTimingPattern();
		this.setupTypeInfo(test, maskPattern);
		
		if (this.typeNumber >= 7) {
			this.setupTypeNumber(test);
		}
	
		if (this.dataCache === null) {
			this.dataCache = QRCode.createData(this.typeNumber, this.errorCorrectLevel, this.dataList);
		}
	
		this.mapData(this.dataCache, maskPattern);
	},

	setupPositionProbePattern : function(row, col)  {
		
		for (var r = -1; r <= 7; r++) {
			
			if (row + r <= -1 || this.moduleCount <= row + r) continue;
			
			for (var c = -1; c <= 7; c++) {
				
				if (col + c <= -1 || this.moduleCount <= col + c) continue;
				
				if ( (0 <= r && r <= 6 && (c === 0 || c === 6) ) || 
                     (0 <= c && c <= 6 && (r === 0 || r === 6) ) || 
                     (2 <= r && r <= 4 && 2 <= c && c <= 4) ) {
					this.modules[row + r][col + c] = true;
				} else {
					this.modules[row + r][col + c] = false;
				}
			}		
		}		
	},
	
	getBestMaskPattern : function() {
	
		var minLostPoint = 0;
		var pattern = 0;
	
		for (var i = 0; i < 8; i++) {
			
			this.makeImpl(true, i);
	
			var lostPoint = QRUtil.getLostPoint(this);
	
			if (i === 0 || minLostPoint >  lostPoint) {
				minLostPoint = lostPoint;
				pattern = i;
			}
		}
	
		return pattern;
	},
	
	createMovieClip : function(target_mc, instance_name, depth) {
	
		var qr_mc = target_mc.createEmptyMovieClip(instance_name, depth);
		var cs = 1;
	
		this.make();

		for (var row = 0; row < this.modules.length; row++) {
			
			var y = row * cs;
			
			for (var col = 0; col < this.modules[row].length; col++) {
	
				var x = col * cs;
				var dark = this.modules[row][col];
			
				if (dark) {
					qr_mc.beginFill(0, 100);
					qr_mc.moveTo(x, y);
					qr_mc.lineTo(x + cs, y);
					qr_mc.lineTo(x + cs, y + cs);
					qr_mc.lineTo(x, y + cs);
					qr_mc.endFill();
				}
			}
		}
		
		return qr_mc;
	},

	setupTimingPattern : function() {
		
		for (var r = 8; r < this.moduleCount - 8; r++) {
			if (this.modules[r][6] !== null) {
				continue;
			}
			this.modules[r][6] = (r % 2 === 0);
		}
	
		for (var c = 8; c < this.moduleCount - 8; c++) {
			if (this.modules[6][c] !== null) {
				continue;
			}
			this.modules[6][c] = (c % 2 === 0);
		}
	},
	
	setupPositionAdjustPattern : function() {
	
		var pos = QRUtil.getPatternPosition(this.typeNumber);
		
		for (var i = 0; i < pos.length; i++) {
		
			for (var j = 0; j < pos.length; j++) {
			
				var row = pos[i];
				var col = pos[j];
				
				if (this.modules[row][col] !== null) {
					continue;
				}
				
				for (var r = -2; r <= 2; r++) {
				
					for (var c = -2; c <= 2; c++) {
					
						if (Math.abs(r) === 2 || 
                            Math.abs(c) === 2 ||
                            (r === 0 && c === 0) ) {
							this.modules[row + r][col + c] = true;
						} else {
							this.modules[row + r][col + c] = false;
						}
					}
				}
			}
		}
	},
	
	setupTypeNumber : function(test) {
	
		var bits = QRUtil.getBCHTypeNumber(this.typeNumber);
        var mod;
	
		for (var i = 0; i < 18; i++) {
			mod = (!test && ( (bits >> i) & 1) === 1);
			this.modules[Math.floor(i / 3)][i % 3 + this.moduleCount - 8 - 3] = mod;
		}
	
		for (var x = 0; x < 18; x++) {
			mod = (!test && ( (bits >> x) & 1) === 1);
			this.modules[x % 3 + this.moduleCount - 8 - 3][Math.floor(x / 3)] = mod;
		}
	},
	
	setupTypeInfo : function(test, maskPattern) {
	
		var data = (this.errorCorrectLevel << 3) | maskPattern;
		var bits = QRUtil.getBCHTypeInfo(data);
        var mod;
	
		// vertical		
		for (var v = 0; v < 15; v++) {
	
			mod = (!test && ( (bits >> v) & 1) === 1);
	
			if (v < 6) {
				this.modules[v][8] = mod;
			} else if (v < 8) {
				this.modules[v + 1][8] = mod;
			} else {
				this.modules[this.moduleCount - 15 + v][8] = mod;
			}
		}
	
		// horizontal
		for (var h = 0; h < 15; h++) {
	
			mod = (!test && ( (bits >> h) & 1) === 1);
			
			if (h < 8) {
				this.modules[8][this.moduleCount - h - 1] = mod;
			} else if (h < 9) {
				this.modules[8][15 - h - 1 + 1] = mod;
			} else {
				this.modules[8][15 - h - 1] = mod;
			}
		}
	
		// fixed module
		this.modules[this.moduleCount - 8][8] = (!test);
	
	},
	
	mapData : function(data, maskPattern) {
		
		var inc = -1;
		var row = this.moduleCount - 1;
		var bitIndex = 7;
		var byteIndex = 0;
		
		for (var col = this.moduleCount - 1; col > 0; col -= 2) {
	
			if (col === 6) col--;
	
			while (true) {
	
				for (var c = 0; c < 2; c++) {
					
					if (this.modules[row][col - c] === null) {
						
						var dark = false;
	
						if (byteIndex < data.length) {
							dark = ( ( (data[byteIndex] >>> bitIndex) & 1) === 1);
						}
	
						var mask = QRUtil.getMask(maskPattern, row, col - c);
	
						if (mask) {
							dark = !dark;
						}
						
						this.modules[row][col - c] = dark;
						bitIndex--;
	
						if (bitIndex === -1) {
							byteIndex++;
							bitIndex = 7;
						}
					}
				}
								
				row += inc;
	
				if (row < 0 || this.moduleCount <= row) {
					row -= inc;
					inc = -inc;
					break;
				}
			}
		}
		
	}

};

QRCode.PAD0 = 0xEC;
QRCode.PAD1 = 0x11;

QRCode.createData = function(typeNumber, errorCorrectLevel, dataList) {
	
	var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectLevel);
	
	var buffer = new QRBitBuffer();
	
	for (var i = 0; i < dataList.length; i++) {
		var data = dataList[i];
		buffer.put(data.mode, 4);
		buffer.put(data.getLength(), QRUtil.getLengthInBits(data.mode, typeNumber) );
		data.write(buffer);
	}

	// calc num max data.
	var totalDataCount = 0;
	for (var x = 0; x < rsBlocks.length; x++) {
		totalDataCount += rsBlocks[x].dataCount;
	}

	if (buffer.getLengthInBits() > totalDataCount * 8) {
		throw new Error("code length overflow. (" + 
            buffer.getLengthInBits() + 
            ">" +  
            totalDataCount * 8 + 
            ")");
	}

	// end code
	if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
		buffer.put(0, 4);
	}

	// padding
	while (buffer.getLengthInBits() % 8 !== 0) {
		buffer.putBit(false);
	}

	// padding
	while (true) {
		
		if (buffer.getLengthInBits() >= totalDataCount * 8) {
			break;
		}
		buffer.put(QRCode.PAD0, 8);
		
		if (buffer.getLengthInBits() >= totalDataCount * 8) {
			break;
		}
		buffer.put(QRCode.PAD1, 8);
	}

	return QRCode.createBytes(buffer, rsBlocks);
};

QRCode.createBytes = function(buffer, rsBlocks) {

	var offset = 0;
	
	var maxDcCount = 0;
	var maxEcCount = 0;
	
	var dcdata = new Array(rsBlocks.length);
	var ecdata = new Array(rsBlocks.length);
	
	for (var r = 0; r < rsBlocks.length; r++) {

		var dcCount = rsBlocks[r].dataCount;
		var ecCount = rsBlocks[r].totalCount - dcCount;

		maxDcCount = Math.max(maxDcCount, dcCount);
		maxEcCount = Math.max(maxEcCount, ecCount);
		
		dcdata[r] = new Array(dcCount);
		
		for (var i = 0; i < dcdata[r].length; i++) {
			dcdata[r][i] = 0xff & buffer.buffer[i + offset];
		}
		offset += dcCount;
		
		var rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
		var rawPoly = new QRPolynomial(dcdata[r], rsPoly.getLength() - 1);

		var modPoly = rawPoly.mod(rsPoly);
		ecdata[r] = new Array(rsPoly.getLength() - 1);
		for (var x = 0; x < ecdata[r].length; x++) {
            var modIndex = x + modPoly.getLength() - ecdata[r].length;
			ecdata[r][x] = (modIndex >= 0)? modPoly.get(modIndex) : 0;
		}

	}
	
	var totalCodeCount = 0;
	for (var y = 0; y < rsBlocks.length; y++) {
		totalCodeCount += rsBlocks[y].totalCount;
	}

	var data = new Array(totalCodeCount);
	var index = 0;

	for (var z = 0; z < maxDcCount; z++) {
		for (var s = 0; s < rsBlocks.length; s++) {
			if (z < dcdata[s].length) {
				data[index++] = dcdata[s][z];
			}
		}
	}

	for (var xx = 0; xx < maxEcCount; xx++) {
		for (var t = 0; t < rsBlocks.length; t++) {
			if (xx < ecdata[t].length) {
				data[index++] = ecdata[t][xx];
			}
		}
	}

	return data;

};

module.exports = QRCode;

};

const QRCode=requireQr('index');
const ECC=requireQr('QRErrorCorrectLevel');
global.HcuQR907=function(content){
 const q=new QRCode(-1,ECC.L); const bytes=new TextEncoder().encode(String(content)); let data=''; for(const b of bytes)data+=String.fromCharCode(b); q.addData(data); q.make();
 return q.modules.map(row=>row.map(Boolean));
};
})(typeof globalThis!=='undefined'?globalThis:window);
