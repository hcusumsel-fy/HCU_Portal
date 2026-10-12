// FY HCU-Portal V9.04 — Fy_Database live client. All authoritative data comes from /api/assets.
// This script is loaded BEFORE the existing application's final inline initialization.
const HCU_A904_API = '/api/assets';
let hcuA904AccessCode='';
let hcuA904Actor='';
function hcuA904Operator(){if(hcuA904Actor)return hcuA904Actor;const s=prompt('Nama petugas/pencatat untuk log aset:');if(!s||!s.trim())throw Error('Nama petugas wajib diisi untuk pencatatan perubahan.');hcuA904Actor=s.trim();return hcuA904Actor;}
function hcuA904AskAccess(){
 if(hcuA904AccessCode)return hcuA904AccessCode;
 const value=prompt('Kode akses Aset V9.04 (dari admin Fy_Database):');
 if(!value)throw Error('Kode akses diperlukan untuk membuka data aset live.');
 hcuA904AccessCode=value;return value;
}
const hcuA904State={assets:[],vehicles:[],computers:[],loans:[],employees:[],revisions:{},ready:false,error:'',time:0,pending:null,saving:false};
const hcuA904S=x=>String(x===null||x===undefined?'':x);
const hcuA904Esc=x=>hcuA904S(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hcuA904Num=x=>x===''?'—':new Intl.NumberFormat('id-ID').format(Number(x)||0);
const hcuA904ShortDate=x=>{const s=hcuA904S(x);if(!s)return '—';const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s);return m?m[3]+'/'+m[2]+'/'+m[1]:s;};
const hcuA904Today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
async function hcuA904Req(action,data=null){
 const url=data?HCU_A904_API:HCU_A904_API+'?action='+encodeURIComponent(action);
 const code=hcuA904AskAccess();
 const response=await fetch(url,data?{method:'POST',headers:{'Content-Type':'application/json','X-HCU-Asset-Access':code},body:JSON.stringify({...data,action}),cache:'no-store'}:{headers:{'X-HCU-Asset-Access':code},cache:'no-store'});
 const raw=await response.text();let result;
 try{result=JSON.parse(raw)}catch(_){throw Error('API Aset belum tersedia / respons tidak berupa JSON. Pastikan Apps Script sudah deploy versi V9.04.');}
 if(response.status===401)hcuA904AccessCode='';
 if(!response.ok||!result.success)throw Error(result.message||`Database gagal (HTTP ${response.status}).`);
 return result;
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
   hcuA904State.computers=p.computers;hcuA904State.loans=p.loans;hcuA904State.employees=p.employees;hcuA904State.revisions=p.revisions||{};
   hcuA904State.ready=true;hcuA904State.error='';hcuA904State.time=Date.now();return true;
  }catch(e){hcuA904State.error=e.message||'Database tidak terbaca';hcuA904State.ready=false;return false;}
  finally{hcuA904State.pending=null;}
 })();return hcuA904State.pending;
}
function hcuA904LiveBanner(){return `<div class="a904-banner"><b>● Fy_Database LIVE</b> <span>Master Aset, Pajak & Asuransi serta Pinjam Pakai menggunakan data pusat yang sama. Tidak memakai draft browser.</span><button type="button" onclick="hcuA904Reload()">⟳ Sinkronkan</button></div>`;}
function hcuA904Modal(){return `<div class="modal" id="a904Modal" role="dialog" aria-modal="true" aria-label="Form Aset Fy_Database" onclick="if(event.target===this)hcuA904Close()"><div class="modal-card a904-dialog"><div class="modal-head"><div><h2 id="a904Title">Form Master Aset</h2><p>Perubahan langsung disimpan ke Fy_Database.</p></div><button type="button" class="close" onclick="hcuA904Close()">×</button></div><div class="modal-body" id="a904ModalBody"></div></div></div>`;}
function hcuA904PIC(a){
 if(a.PIC_TIPE==='PEGAWAI'){
  const emp=hcuA904State.employees.find(e=>e.EMP_ID===a.PIC_EMP_ID);
  return emp?.NAMA||a.PIC_NAMA||a.PIC_EMP_ID||'—';
 }
 return a.PIC_TIPE==='TIDAK_ADA'?'—':a.PIC_NAMA||a.PIC_LAMA||'—';
}
function hcuA904AssetRow(a){return `<tr class="clickable" onclick="hcuA904Open('${hcuA904Esc(a.ASSET_ID)}')"><td><b>${hcuA904Esc(a.ASSET_ID)}</b><span class="a904-sub">${hcuA904Esc(a.NOMOR_ASET||'—')}</span></td><td><b>${hcuA904Esc(a.NAMA_ASET)}</b><span class="a904-sub">${hcuA904Esc(a.KATEGORI==='KOMPUTER'?a.NO_SERI:a.NOPOL)}</span></td><td>${hcuA904Esc(a.KATEGORI)}</td><td>${hcuA904Esc(hcuA904PIC(a))}</td><td>${hcuA904Esc(a.KANTOR||a.LOKASI_ASET||'—')}</td><td>${hcuA904Esc(a.STATUS_ASET||'—')}</td><td>${hcuA904Esc(a.KONDISI||'—')}</td><td><button type="button" class="a904-small" onclick="event.stopPropagation();hcuA904Open('${hcuA904Esc(a.ASSET_ID)}')">✎ Edit</button></td></tr>`;}
function hcuA904AssetPage(){
 const arr=hcuA904State.assets;
 const count=t=>arr.filter(a=>a.KATEGORI===t).length;
 return `${hcuA904LiveBanner()}<div class="hero"><div><h1>Master Aset <span class="a904-label">V9.04</span></h1><p>Inventaris terpadu — Komputer, R2, dan R4. PIC terhubung Master Pegawai.</p></div><div class="chip">${arr.length} aset</div></div>
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
function hcuA904EmployeeOptions(selected){const source=hcuA904State.employees;return `<option value="">— Pilih pegawai —</option>`+source.filter(e=>e.EMP_ID).sort((a,b)=>String(a.NAMA).localeCompare(String(b.NAMA),'id')).map(e=>`<option value="${hcuA904Esc(e.EMP_ID)}" ${selected===e.EMP_ID?'selected':''}>${hcuA904Esc(e.NAMA)} • ${hcuA904Esc(e.Loket_Kerja||'')}</option>`).join('');}
function hcuA904Open(id='',focus=''){const a=hcuA904State.assets.find(x=>x.ASSET_ID===id)||{KATEGORI:'KOMPUTER',PIC_TIPE:'TIDAK_ADA',STATUS_ASET:'Dikembalikan',KONDISI:'Baik',KEPEMILIKAN:'MILIK_JR'};
 const details=a.KATEGORI==='KOMPUTER'?hcuA904State.computers.find(x=>x.ASSET_ID===id)||{}:hcuA904Vehicle(a);
 const title=document.getElementById('a904Title'),box=document.getElementById('a904ModalBody');if(!title||!box)return;
 title.textContent=id?'Edit '+id+' • Fy_Database':'Tambah Aset • Fy_Database';
 box.innerHTML=`<div class="v9-dialog-note"><b>${id?'Memperbarui aset terdaftar':'Menambahkan aset baru'}</b> • Setiap penyimpanan langsung diperiksa dan ditulis ke database pusat. Nomor/Nopol tidak boleh duplikat.</div>
 <div class="v9-section-title">Master Aset</div><div class="v9-form-grid">
 ${hcuA904Select('Kategori','KATEGORI',a.KATEGORI,['KOMPUTER','R2','R4'],!!id)}
 ${hcuA904Field('Nama Aset *','NAMA_ASET',a.NAMA_ASET)}${hcuA904Field('Nomor Aset','NOMOR_ASET',a.NOMOR_ASET)}${hcuA904Field('Tahun','TAHUN',a.TAHUN)}
 ${hcuA904Select('Kepemilikan','KEPEMILIKAN',a.KEPEMILIKAN||'MILIK_JR',['MILIK_JR','SEWA'])}
 ${hcuA904Select('Status Aset','STATUS_ASET',a.STATUS_ASET||'Dikembalikan',[...new Set(['Dikembalikan','Dipinjam','Perbaikan','Tersedia','AKTIF','LELANG','Hilang',a.STATUS_ASET].filter(Boolean))])}
 ${hcuA904Field('Kondisi','KONDISI',a.KONDISI)}${hcuA904Field('Lokasi Fisik','LOKASI_ASET',a.LOKASI_ASET)}${hcuA904Field('Kantor / Cabang','KANTOR',a.KANTOR)}
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
function hcuA904Close(){document.getElementById('a904Modal')?.classList.remove('show');}
async function hcuA904Save(id){
 if(hcuA904State.saving)return;
 const box=document.getElementById('a904ModalBody'),msg=document.getElementById('a904SaveMsg'),btn=document.getElementById('a904SaveBtn');if(!box)return;
 const vals={};box.querySelectorAll('[data-a904]').forEach(el=>{if(!el.disabled)vals[el.dataset.a904]=el.value.trim()});
 const category=vals.KATEGORI||hcuA904State.assets.find(a=>a.ASSET_ID===id)?.KATEGORI;
 const masterKeys=['NAMA_ASET','NOMOR_ASET','TAHUN','KEPEMILIKAN','STATUS_ASET','KONDISI','LOKASI_ASET','KANTOR','PIC_TIPE','PIC_EMP_ID','PIC_NAMA','NO_SERI','NOPOL','KETERANGAN'];
 const detailKeys=['NO_RANGKA','NO_MESIN','PAJAK_SAMPAI','STNK_SAMPAI','NILAI_PAJAK','POLIS_AWAL','POLIS_AKHIR','PREMI','NO_POLIS','STATUS_VALIDASI_PAJAK','VERIFIKATOR_PAJAK','CATATAN_PAJAK'];
 const asset={ASSET_ID:id||'',KATEGORI:category};masterKeys.forEach(k=>asset[k]=vals[k]||'');
 const detail={};detailKeys.forEach(k=>detail[k]=vals[k]||'');
 if(!asset.NAMA_ASET){msg.textContent='Nama aset wajib diisi.';return;}
 if(asset.PIC_TIPE==='PEGAWAI'&&!asset.PIC_EMP_ID){msg.textContent='Pilih PIC dari Master Pegawai.';return;}
 if(category!=='KOMPUTER'&&detail.POLIS_AWAL&&detail.POLIS_AKHIR&&detail.POLIS_AWAL>detail.POLIS_AKHIR){msg.textContent='Tanggal awal polis tidak boleh melebihi akhir.';return;}
 hcuA904State.saving=true;btn.disabled=true;msg.textContent='Menyimpan ke Fy_Database. Jangan tutup tab...';
 try{await hcuA904Req('saveAssetV904',{asset,detail,expectedRevision:id?hcuA904State.revisions[id]:'',updatedBy:hcuA904Operator()});
  const ok=await hcuA904Load(true);if(!ok)throw Error('Penyimpanan kemungkinan berhasil, tetapi gagal membaca ulang. Periksa data sebelum mengulang: '+hcuA904State.error);
  hcuA904Close();await show(currentPage,{skipDatabaseSync:true,skipAssetSync:true});toast('Data berhasil disimpan ke Fy_Database.','success');
 }catch(e){msg.textContent=e.message;toast('Gagal mengonfirmasi simpan: '+e.message,'error');}
 finally{hcuA904State.saving=false;btn.disabled=false;}
}
function hcuA904LoanPage(){const loans=hcuA904State.loans;
 return `${hcuA904LiveBanner()}<div class="hero"><div><h1>Pinjam Pakai</h1><p>Histori transaksi dimulai kosong sejak migrasi V9.03. PIC aset lama tetap tersedia di Master Aset.</p></div><div class="chip">${loans.length} transaksi</div></div>
 <div class="v9-metrics"><div class="v9-tile"><small>TRANSAKSI</small><strong>${loans.length}</strong></div><div class="v9-tile"><small>AKTIF</small><strong>${loans.filter(x=>x.STATUS_PINJAM==='AKTIF').length}</strong></div><div class="v9-tile"><small>DIKEMBALIKAN</small><strong>${loans.filter(x=>x.STATUS_PINJAM==='DIKEMBALIKAN').length}</strong></div></div>
 <div class="panel" style="margin-top:16px"><div class="vehicle-grid-head"><div><h3>Riwayat Pinjam Pakai</h3><span>Periode transaksi baru; tidak dibuat transaksi fiktif dari PIC master lama.</span></div><button class="btn success" onclick="hcuA904LoanOpen()">+ Serah Terima</button></div><div class="table-wrap"><table class="tbl"><thead><tr><th>ID Transaksi</th><th>Aset</th><th>Peminjam</th><th>Tanggal Serah</th><th>Status</th><th>Lokasi</th><th>Kondisi</th><th>Aksi</th></tr></thead><tbody>${loans.map(x=>{const a=hcuA904State.assets.find(a=>a.ASSET_ID===x.ASSET_ID);return `<tr><td>${hcuA904Esc(x.PINJAM_ID)}</td><td>${hcuA904Esc(a?.NAMA_ASET||x.ASSET_ID)}</td><td>${hcuA904Esc(x.NAMA_PEMINJAM_SNAPSHOT)}</td><td>${hcuA904Esc(hcuA904ShortDate(x.TANGGAL_SERAH))}</td><td>${hcuA904Esc(x.STATUS_PINJAM)}</td><td>${hcuA904Esc(x.LOKASI_SERAH)}</td><td>${hcuA904Esc(x.KONDISI_KEMBALI||x.KONDISI_SERAH)}</td><td>${x.STATUS_PINJAM==='AKTIF'?`<button class="a904-small" onclick="hcuA904ReturnOpen('${hcuA904Esc(x.PINJAM_ID)}')">Kembalikan</button>`:'Selesai'}</td></tr>`;}).join('')||'<tr><td colspan="8" class="a904-empty">Belum ada transaksi Pinjam Pakai. Klik + Serah Terima untuk memulai.</td></tr>'}</tbody></table></div></div>${hcuA904Modal()}`;
}
function hcuA904LoanOpen(){const modal=document.getElementById('a904Modal');if(!modal)return;
 document.getElementById('a904Title').textContent='Serah Terima Aset';
 const available=hcuA904State.assets.filter(a=>['dikembalikan','tersedia','di gudang'].includes(String(a.STATUS_ASET).trim().toLowerCase())&&!hcuA904State.loans.some(x=>x.ASSET_ID===a.ASSET_ID&&x.STATUS_PINJAM==='AKTIF'));
 document.getElementById('a904ModalBody').innerHTML=`<div class="v9-dialog-note">Hanya aset yang tersedia dan tidak sedang memiliki transaksi aktif yang bisa diserahkan. Aset dengan PIC warisan belum diubah menjadi transaksi baru.</div>
 <div class="v9-form-grid"><div class="field span2"><label>Aset</label><select id="a904LoanAsset"><option value="">— Pilih Aset —</option>${available.map(a=>`<option value="${hcuA904Esc(a.ASSET_ID)}">${hcuA904Esc(a.ASSET_ID+' • '+a.NAMA_ASET+' • '+(a.NOPOL||a.NOMOR_ASET||a.NO_SERI||''))}</option>`).join('')}</select></div>
 <div class="field span2"><label>Nama Pegawai / PIC</label><select id="a904LoanEmployee">${hcuA904EmployeeOptions('')}</select></div>
 ${hcuA904Field('Tanggal Serah','DATE',hcuA904Today(),{type:'date'})}${hcuA904Field('Lokasi Serah','LOCATION','Kanwil Sumsel')}
 ${hcuA904Field('Kondisi Saat Serah','CONDITION','Baik')}${hcuA904Field('Keterangan','NOTE','')}
 </div><div class="v9-dialog-actions"><button class="btn secondary" onclick="hcuA904Close()">Batal</button><button class="btn success" id="a904TxBtn" onclick="hcuA904LoanCreate()">Simpan Serah Terima</button></div><div class="a904-feedback" id="a904SaveMsg"></div>`;
 modal.classList.add('show');
}
async function hcuA904LoanCreate(){if(hcuA904State.saving)return;
 const assetId=document.getElementById('a904LoanAsset')?.value||'',empId=document.getElementById('a904LoanEmployee')?.value||'';
 if(!assetId||!empId){document.getElementById('a904SaveMsg').textContent='Pilih aset dan pegawai.';return;}
 await hcuA904DoTx('createLoanV904',{assetId,empId,date:document.querySelector('[data-a904="DATE"]').value,location:document.querySelector('[data-a904="LOCATION"]').value,condition:document.querySelector('[data-a904="CONDITION"]').value,note:document.querySelector('[data-a904="NOTE"]').value,updatedBy:hcuA904Operator()});
}
function hcuA904ReturnOpen(id){const l=hcuA904State.loans.find(x=>x.PINJAM_ID===id);if(!l)return;
 document.getElementById('a904Title').textContent='Pengembalian • '+id;
 document.getElementById('a904ModalBody').innerHTML=`<div class="v9-dialog-note"><b>${hcuA904Esc(l.NAMA_PEMINJAM_SNAPSHOT)}</b><br>Aset ${hcuA904Esc(l.ASSET_ID)} akan masuk ke Gudang Kanwil; PIC akan dikosongkan.</div>
 <div class="v9-form-grid">${hcuA904Field('Tanggal Kembali','DATE',hcuA904Today(),{type:'date'})}${hcuA904Field('Kondisi Kembali','CONDITION','Baik')}${hcuA904Field('Keterangan','NOTE','')}</div>
 <div class="v9-dialog-actions"><button class="btn secondary" onclick="hcuA904Close()">Batal</button><button class="btn success" id="a904TxBtn" onclick="hcuA904LoanReturn('${hcuA904Esc(id)}')">Konfirmasi Kembali</button></div><div class="a904-feedback" id="a904SaveMsg"></div>`;
 document.getElementById('a904Modal').classList.add('show');
}
async function hcuA904LoanReturn(id){if(hcuA904State.saving)return;
 const date=document.querySelector('[data-a904="DATE"]').value,condition=document.querySelector('[data-a904="CONDITION"]').value,note=document.querySelector('[data-a904="NOTE"]').value;
 if(!condition.trim()){document.getElementById('a904SaveMsg').textContent='Isi kondisi saat pengembalian.';return;}
 await hcuA904DoTx('returnLoanV904',{loanId:id,date,condition,note,updatedBy:hcuA904Operator()});
}
async function hcuA904DoTx(action,payload){const btn=document.getElementById('a904TxBtn'),msg=document.getElementById('a904SaveMsg');hcuA904State.saving=true;if(btn)btn.disabled=true;if(msg)msg.textContent='Memproses transaksi ke Fy_Database...';
 try{await hcuA904Req(action,payload);const ok=await hcuA904Load(true);if(!ok)throw Error('Transaksi mungkin tersimpan tetapi pembacaan ulang gagal. Periksa transaksi sebelum mencoba lagi.');hcuA904Close();await show('pinjam',{skipDatabaseSync:true,skipAssetSync:true});toast('Transaksi berhasil tersimpan.','success');}
 catch(e){if(msg)msg.textContent=e.message;toast('Transaksi belum dapat dikonfirmasi: '+e.message,'error');}
 finally{hcuA904State.saving=false;if(btn)btn.disabled=false;}
}
async function hcuA904Reload(){if(hcuA904State.saving)return;const page=currentPage;const ok=await hcuA904Load(true);if(!ok){if(typeof hcuA904HybridModes!=='undefined'&&hcuA904HybridModes[page])hcuA904HybridModes[page]='arsip';if(currentPage===page)await show(page,{skipDatabaseSync:true});toast('Tidak dapat sinkronisasi Fy_Database: '+hcuA904State.error+'. Arsip V9.02 ditampilkan.','error');return;}if(currentPage===page)await show(page,{skipDatabaseSync:true});}
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
 * V9.04R SAFE BRIDGE -- DOES NOT REPLACE V9.02 LEGACY MODULES.
 * Legacy 91-record review, old asset/loan views, current settings,
 * and localStorage remain reachable even when live API fails.
 * No automatic imports/writes to production.
 * ============================================================ */
const hcuA904HybridModes={inventaris:'arsip',compliance:'arsip',pinjam:'arsip'};
const hcuA904HybridNames={inventaris:'Master Aset',compliance:'Pajak & Asuransi',pinjam:'Pinjam Pakai'};
function hcuA904HybridBanner(page,live){
 const label=hcuA904HybridNames[page]||page;
 const count=page==='inventaris'?'91 record sumber vs 78 aset final':page==='compliance'?'47 kendaraan sumber vs 46 kendaraan final':'data lama (bukan transaksi) vs transaksi baru Fy_Database';
 return `<section class="a904-hybrid-bar" aria-label="Pilihan sumber data ${hcuA904Esc(label)}">
   <div class="a904-hybrid-copy"><b>${live?'Fy_Database LIVE':'Arsip V9.02'}</b><span>${live?'Data final produksi dibaca dari Fy_Database.':'Draft verifikasi dan pengaturan V9.02 di browser tetap dipertahankan.'} <small>${count}</small></span></div>
   <div class="a904-hybrid-actions"><button type="button" class="${!live?'selected':''}" onclick="hcuA904HybridSwitch('${page}','arsip')">Arsip / V9.02</button><button id="hcuA904GoLive-${page}" type="button" class="${live?'selected':''}" onclick="hcuA904HybridSwitch('${page}','live')">● Fy_Database Live</button></div>
 </section>`;
}
function hcuA904HybridPage(page,legacy,livePage){
 const live=hcuA904HybridModes[page]==='live'&&hcuA904State.ready;
 return hcuA904HybridBanner(page,live)+(live?livePage():legacy());
}
async function hcuA904HybridSwitch(page,mode){
 if(!Object.prototype.hasOwnProperty.call(hcuA904HybridModes,page))return;
 if(hcuA904State.saving){toast('Tunggu hingga proses simpan selesai.','error');return;}
 if(mode==='arsip'){
  hcuA904HybridModes[page]='arsip';
  if(currentPage===page)await show(page,{skipDatabaseSync:true});
  return;
 }
 const btn=document.getElementById('hcuA904GoLive-'+page);
 if(btn){btn.disabled=true;btn.textContent='Menghubungkan Fy_Database...';}
 try{
  // Explicit user-initiated switch: never silently replace local draft.
  const ok=await hcuA904Load(true);
  if(!ok){
   hcuA904HybridModes[page]='arsip';
   toast('Fy_Database belum dapat dibaca: '+hcuA904State.error+'. Arsip V9.02 tetap aman.','error');
   return;
  }
  hcuA904HybridModes[page]='live';
  if(currentPage===page)await show(page,{skipDatabaseSync:true});
 }finally{
  if(btn&&btn.isConnected){btn.disabled=false;btn.textContent='● Fy_Database Live';}
 }
}
function hcuA904InstallHybridPages(pages){
 const livePages={inventaris:hcuA904AssetPage,compliance:hcuA904CompliancePage,pinjam:hcuA904LoanPage};
 for(const page of Object.keys(livePages)){
  const original=pages[page];
  if(typeof original!=='function')throw Error('Halaman V9.02 hilang: '+page);
  if(original.__hcuA904Hybrid)return;
  const wrapped=()=>hcuA904HybridPage(page,original,livePages[page]);
  wrapped.__hcuA904Hybrid=true;
  pages[page]=wrapped;
 }
}
