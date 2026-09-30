const D = window.PORTAL_DATA;
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const fmt = n => new Intl.NumberFormat('id-ID').format(Number(n||0));
const rupiah = n => 'Rp ' + new Intl.NumberFormat('id-ID').format(Number(n||0));
const today = new Date();
function parseDate(v){ if(!v) return null; const d=new Date(v); return isNaN(d)?null:d; }
function daysUntil(v){ const d=parseDate(v); if(!d)return null; return Math.ceil((d-today)/86400000); }
function severity(days){ if(days===null)return 'none'; if(days<0)return 'overdue'; if(days<=7)return 'urgent'; if(days<=30)return 'warning'; return 'safe'; }
function vehicleActive(v){ return String(v.assetStatus).toUpperCase()==='AKTIF'; }
const activeVehicles=D.vehicles.filter(vehicleActive);
const taxBuckets={overdue:0,urgent:0,warning:0,safe:0,missing:0};
const policyBuckets={overdue:0,urgent:0,warning:0,safe:0,missing:0};
activeVehicles.forEach(v=>{
  let t=daysUntil(v.taxUntil), p=daysUntil(v.policyEnd);
  let ts=severity(t), ps=severity(p);
  taxBuckets[ts==='none'?'missing':ts]++;
  policyBuckets[ps==='none'?'missing':ps]++;
});
const notificationCount=taxBuckets.overdue+taxBuckets.urgent+policyBuckets.overdue+policyBuckets.urgent;
$('#notifCount').textContent=notificationCount;

const pageNames={dashboard:'Dashboard',employees:'Data Pegawai',assets:'Inventaris',loans:'Pinjam Pakai',vehicles:'Kendaraan',compliance:'Pajak & Asuransi',finance:'Keuangan',reports:'Laporan'};
function setPage(p){
  $$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.page===p));
  $('#crumb').textContent=pageNames[p]||p;
  render[p]?.();
  if(innerWidth<760) $('.sidebar').classList.remove('open');
}
$$('.nav-item').forEach(b=>b.onclick=()=>setPage(b.dataset.page));
$('#menuBtn').onclick=()=>$('.sidebar').classList.toggle('open');
function pageHeader(title,sub){return `<div class="hero-row"><div><h1>${title}</h1><p>${sub}</p></div><div class="date-chip">Data prototype · ${today.toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'})}</div></div>`}
function pill(text,kind=''){return `<span class="pill ${kind}">${text||'-'}</span>`}
function table(headers,rows){return `<div class="table-wrap"><table class="data-table"><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')||`<tr><td colspan="${headers.length}" class="empty-state">Tidak ada data.</td></tr>`}</tbody></table></div>`}
const render={
 dashboard(){
   const empActive=D.employees.filter(e=>String(e.status).toUpperCase()==='AKTIF').length;
   const assetLoan=D.assets.filter(a=>a.status==='Dipinjam').length;
   const unitCounts={}; D.employees.filter(e=>String(e.status).toUpperCase()==='AKTIF').forEach(e=>{let k=e.loket||'Lainnya';unitCounts[k]=(unitCounts[k]||0)+1});
   const topUnits=Object.entries(unitCounts).sort((a,b)=>b[1]-a[1]).slice(0,5);
   const max=Math.max(...topUnits.map(x=>x[1]),1);
   $('#content').innerHTML=pageHeader('HCU Control Center','Ringkasan pekerjaan operasional Human Capital & Umum Kanwil Sumatera Selatan')+`
   <div class="kpi-grid">
     <div class="kpi"><div class="label">PEGAWAI AKTIF</div><div class="value">${fmt(empActive)}</div><div class="meta">dari ${fmt(D.employees.length)} data pegawai</div></div>
     <div class="kpi"><div class="label">ASET TERCATAT</div><div class="value">${fmt(D.assets.length)}</div><div class="meta">hasil konsolidasi pinjam pakai</div></div>
     <div class="kpi"><div class="label">KENDARAAN AKTIF</div><div class="value">${fmt(activeVehicles.length)}</div><div class="meta">dari ${fmt(D.vehicles.length)} data kendaraan</div></div>
     <div class="kpi"><div class="label">PINJAMAN AKTIF</div><div class="value">${fmt(D.loans.filter(x=>x.status==='Dipinjam').length)}</div><div class="meta">berdasarkan status transaksi</div></div>
     <div class="kpi"><div class="label">ACTION PRIORITY</div><div class="value">${notificationCount}</div><div class="meta">pajak/polis overdue atau ≤7 hari</div></div>
   </div>
   <div class="grid-2">
     <section class="panel"><div class="panel-title"><h3>Action Center</h3><span>Prioritas otomatis</span></div><div class="action-list">
       <div class="action"><span class="sev red"></span><div><b>Pajak kendaraan overdue</b><small>Perlu pemeriksaan & tindak lanjut</small></div><div class="count">${taxBuckets.overdue}</div></div>
       <div class="action"><span class="sev amber"></span><div><b>Pajak jatuh tempo ≤ 7 hari</b><small>Siapkan proses pembayaran/perpanjangan</small></div><div class="count">${taxBuckets.urgent}</div></div>
       <div class="action"><span class="sev red"></span><div><b>Polis asuransi telah berakhir</b><small>Validasi status pembaruan polis</small></div><div class="count">${policyBuckets.overdue}</div></div>
       <div class="action"><span class="sev amber"></span><div><b>Polis berakhir ≤ 7 hari</b><small>Prioritas renewal asuransi</small></div><div class="count">${policyBuckets.urgent}</div></div>
       <div class="action"><span class="sev blue"></span><div><b>Aset sedang dipinjam</b><small>Monitoring pemegang aset aktif</small></div><div class="count">${assetLoan}</div></div>
     </div></section>
     <section class="panel"><div class="panel-title"><h3>Sebaran Pegawai Aktif</h3><span>Top unit/loket</span></div><div class="chart">${topUnits.map(([k,v])=>`<div class="bar-group"><div class="bar-wrap"><div class="bar" style="height:${Math.max(18,v/max*100)}%"></div></div><div class="bar-label">${k.replace('Kantor ','Ktr ')}</div><b>${v}</b></div>`).join('')}</div></section>
   </div>`;
 },
 employees(){
   $('#content').innerHTML=pageHeader('Data Pegawai','Master pegawai operasional untuk relasi aset, kendaraan, dan layanan HCU')+`<section class="panel"><div class="toolbar"><input id="empSearch" placeholder="Cari nama, NPP, jabatan, loket..."><select id="empStatus"><option value="">Semua status</option><option>AKTIF</option><option>NON AKTIF</option></select></div><div id="empTable"></div></section>`;
   const draw=()=>{let q=$('#empSearch').value.toLowerCase(),st=$('#empStatus').value;let rows=D.employees.filter(e=>(!st||String(e.status).toUpperCase()===st)&&Object.values(e).join(' ').toLowerCase().includes(q)).map(e=>`<tr><td><b>${e.name}</b><br><small>${e.id}</small></td><td>${e.npp}</td><td>${e.position}</td><td>${e.loket}</td><td>${e.unit}</td><td>${e.jobGrade||'-'}</td><td>${pill(e.status,String(e.status).toUpperCase()==='AKTIF'?'':'amber')}</td></tr>`);$('#empTable').innerHTML=table(['Nama','NPP','Jabatan','Loket','Unit','Grade','Status'],rows)};$('#empSearch').oninput=draw;$('#empStatus').onchange=draw;draw();
 },
 assets(){
   $('#content').innerHTML=pageHeader('Inventaris','Master aset hasil konsolidasi dari riwayat pinjam pakai')+`<section class="panel"><div class="toolbar"><input id="assetSearch" placeholder="Cari nomor aset, nama aset, pemegang..."><select id="assetStatus"><option value="">Semua status</option><option>Dipinjam</option><option>Tersedia</option><option>Perlu Verifikasi</option></select></div><div id="assetTable"></div></section>`;
   const draw=()=>{let q=$('#assetSearch').value.toLowerCase(),st=$('#assetStatus').value;let rows=D.assets.filter(x=>(!st||x.status===st)&&Object.values(x).join(' ').toLowerCase().includes(q)).map(x=>`<tr><td><b>${x.assetNo||x.id}</b></td><td>${x.name}</td><td>${x.type}</td><td>${x.year||'-'}</td><td>${x.holder||'-'}</td><td>${pill(x.status,x.status==='Dipinjam'?'blue':x.status==='Tersedia'?'':'amber')}</td><td>${x.lastLetter||'-'}</td></tr>`);$('#assetTable').innerHTML=table(['Nomor Aset','Nama Aset','Jenis','Tahun','Pemegang Terakhir','Status','Surat Terakhir'],rows)};$('#assetSearch').oninput=draw;$('#assetStatus').onchange=draw;draw();
 },
 loans(){
   $('#content').innerHTML=pageHeader('Pinjam Pakai','Histori transaksi peminjaman dan pengembalian inventaris')+`<section class="panel"><div class="toolbar"><input id="loanSearch" placeholder="Cari pegawai, aset, nomor surat..."><select id="loanStatus"><option value="">Semua status</option><option>Dipinjam</option><option>Dikembalikan</option><option>Perlu Verifikasi</option><option>Mutasi</option></select></div><div id="loanTable"></div></section>`;
   const draw=()=>{let q=$('#loanSearch').value.toLowerCase(),st=$('#loanStatus').value;let rows=D.loans.filter(x=>(!st||x.status===st)&&Object.values(x).join(' ').toLowerCase().includes(q)).map(x=>`<tr><td>${x.date}</td><td><b>${x.holder}</b><br><small>${x.position}</small></td><td>${x.assetName}</td><td>${x.assetNo||'-'}</td><td>${x.letter}</td><td>${pill(x.status,x.status==='Dipinjam'?'blue':x.status==='Dikembalikan'?'': 'amber')}</td></tr>`);$('#loanTable').innerHTML=table(['Tanggal','Pegawai','Aset','Nomor Aset','Nomor Surat','Status'],rows)};$('#loanSearch').oninput=draw;$('#loanStatus').onchange=draw;draw();
 },
 vehicles(){
   $('#content').innerHTML=pageHeader('Kendaraan','Master kendaraan operasional, kepemilikan, PIC, dan status aset')+`<section class="panel"><div class="toolbar"><input id="vehSearch" placeholder="Cari nopol, merk, lokasi, PIC..."><select id="vehStatus"><option value="">Semua status aset</option><option>AKTIF</option><option>LELANG</option></select></div><div id="vehTable"></div></section>`;
   const draw=()=>{let q=$('#vehSearch').value.toLowerCase(),st=$('#vehStatus').value;let rows=D.vehicles.filter(x=>(!st||String(x.assetStatus).toUpperCase()===st)&&Object.values(x).join(' ').toLowerCase().includes(q)).map(x=>`<tr><td><b>${x.plate||'-'}</b><br><small>${x.id}</small></td><td>${x.kind}</td><td>${x.brand} ${x.type}</td><td>${x.year||'-'}</td><td>${x.assetNo||'-'}</td><td>${x.location||x.office}</td><td>${x.pic||'-'}</td><td>${pill(x.assetStatus,String(x.assetStatus).toUpperCase()==='AKTIF'?'':'amber')}</td></tr>`);$('#vehTable').innerHTML=table(['Nopol','Jenis','Kendaraan','Tahun','Nomor Aset','Lokasi','PIC','Status'],rows)};$('#vehSearch').oninput=draw;$('#vehStatus').onchange=draw;draw();
 },
 compliance(){
   const active=activeVehicles.map(v=>({...v,taxDays:daysUntil(v.taxUntil),policyDays:daysUntil(v.policyEnd)}));
   $('#content').innerHTML=pageHeader('Pajak & Asuransi','Monitoring jatuh tempo pajak kendaraan dan masa berlaku polis')+`
   <div class="kpi-grid"><div class="kpi"><div class="label">PAJAK OVERDUE</div><div class="value">${taxBuckets.overdue}</div><div class="meta">kendaraan aktif</div></div><div class="kpi"><div class="label">PAJAK ≤ 7 HARI</div><div class="value">${taxBuckets.urgent}</div><div class="meta">prioritas proses</div></div><div class="kpi"><div class="label">POLIS EXPIRED</div><div class="value">${policyBuckets.overdue}</div><div class="meta">perlu validasi renewal</div></div><div class="kpi"><div class="label">POLIS ≤ 30 HARI</div><div class="value">${policyBuckets.urgent+policyBuckets.warning}</div><div class="meta">monitoring</div></div><div class="kpi"><div class="label">DATA POLIS KOSONG</div><div class="value">${policyBuckets.missing}</div><div class="meta">lengkapi master data</div></div></div>
   <section class="panel" style="margin-top:16px"><div class="toolbar"><input id="compSearch" placeholder="Cari nopol, merk, PIC..."><select id="compFilter"><option value="">Semua kondisi</option><option value="critical">Kritis / overdue</option><option value="30">≤ 30 hari</option></select></div><div id="compTable"></div></section>`;
   const draw=()=>{let q=$('#compSearch').value.toLowerCase(),f=$('#compFilter').value;let rows=active.filter(x=>Object.values(x).join(' ').toLowerCase().includes(q)).filter(x=>!f||(f==='critical'&&(x.taxDays<0||x.policyDays<0))||(f==='30'&&((x.taxDays!==null&&x.taxDays<=30)||(x.policyDays!==null&&x.policyDays<=30)))).sort((a,b)=>(a.taxDays??99999)-(b.taxDays??99999)).map(x=>{let tx=severity(x.taxDays),ps=severity(x.policyDays);let ptx=x.taxDays===null?pill('Kosong','amber'):pill(x.taxDays<0?`${Math.abs(x.taxDays)} hari lewat`:`${x.taxDays} hari`,tx==='overdue'?'red':tx==='urgent'||tx==='warning'?'amber':'');let ppol=x.policyDays===null?pill('Kosong','amber'):pill(x.policyDays<0?`${Math.abs(x.policyDays)} hari lewat`:`${x.policyDays} hari`,ps==='overdue'?'red':ps==='urgent'||ps==='warning'?'amber':'');return `<tr><td><b>${x.plate||'-'}</b><br><small>${x.brand} ${x.type}</small></td><td>${x.pic||'-'}</td><td>${x.taxUntil||'-'}<br>${ptx}</td><td>${x.policyEnd||'-'}<br>${ppol}</td><td>${x.policyNo||'-'}</td><td>${rupiah(x.taxValue)}</td><td>${rupiah(x.premium)}</td></tr>`});$('#compTable').innerHTML=table(['Kendaraan','PIC','Pajak','Akhir Polis','Nomor Polis','Pajak','Premi'],rows)};$('#compSearch').oninput=draw;$('#compFilter').onchange=draw;draw();
 },
 finance(){
   $('#content').innerHTML=pageHeader('Keuangan HCU','Ruang untuk anggaran, realisasi, kontrak, dan sisa budget')+`<section class="panel"><div class="finance-placeholder"><h3>Modul Keuangan — Tahap Berikutnya</h3><p>Struktur portal sudah disiapkan. Setelah file data keuangan diunggah, modul ini dapat menampilkan Anggaran vs Realisasi, sisa anggaran, tren bulanan, vendor, serta indikator utilisasi budget.</p><div class="profile-grid"><div class="profile-card"><b>Anggaran</b><span>Budget per akun/program</span></div><div class="profile-card"><b>Realisasi</b><span>Aktual per periode</span></div><div class="profile-card"><b>Forecast</b><span>Proyeksi sisa tahun</span></div></div></div></section>`;
 },
 reports(){
   $('#content').innerHTML=pageHeader('Laporan & Analytics','Ringkasan siap ekspor untuk monitoring dan bahan rapat')+`<div class="profile-grid"><div class="profile-card"><b>Rekap Pegawai</b><span>${D.employees.length} data · ${D.employees.filter(e=>String(e.status).toUpperCase()==='AKTIF').length} aktif</span><div class="progress" style="margin-top:12px"><span style="width:${Math.round(D.employees.filter(e=>String(e.status).toUpperCase()==='AKTIF').length/D.employees.length*100)}%"></span></div></div><div class="profile-card"><b>Rekap Kendaraan</b><span>${activeVehicles.length} kendaraan aktif</span><div class="progress" style="margin-top:12px"><span style="width:${Math.round(activeVehicles.length/D.vehicles.length*100)}%"></span></div></div><div class="profile-card"><b>Pinjam Pakai</b><span>${D.loans.filter(x=>x.status==='Dipinjam').length} transaksi aktif · ${D.loans.filter(x=>x.status==='Dikembalikan').length} kembali</span></div></div><section class="panel" style="margin-top:16px"><div class="panel-title"><h3>Laporan yang akan tersedia</h3><span>V1 blueprint</span></div><div class="action-list"><div class="action"><span class="sev blue"></span><div><b>Employee 360°</b><small>Pegawai, aset, kendaraan & histori</small></div><div>›</div></div><div class="action"><span class="sev blue"></span><div><b>Asset Movement</b><small>Riwayat pinjam-pakai dan pengembalian</small></div><div>›</div></div><div class="action"><span class="sev amber"></span><div><b>Compliance Calendar</b><small>Pajak, STNK dan asuransi</small></div><div>›</div></div></div></section>`;
 }
};
setPage('dashboard');
