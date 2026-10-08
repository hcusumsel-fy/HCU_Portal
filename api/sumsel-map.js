/**
 * HCU V8.03 — proxy batas administratif 17 kabupaten/kota Sumatera Selatan.
 * Prioritas BIG (Badan Informasi Geospasial); fallback publik hanya bila BIG tidak tersedia.
 * Tidak mengirim, membaca, atau menyimpan data pegawai.
 */
const REGION_NAMES = new Set([
  'banyuasin','empat lawang','lahat','lubuk linggau','muara enim',
  'musi banyuasin','musi rawas','musi rawas utara','ogan ilir',
  'ogan komering ilir','ogan komering ulu','ogan komering ulu selatan',
  'ogan komering ulu timur','pagar alam','palembang',
  'penukal abab lematang ilir','prabumulih'
]);
const normalize = x => {
  let s=String(x||'').toLowerCase().replace(/^kabupaten\s+|^kota\s+|^kab\.?\s+/,'').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
  if(s==='lubuklinggau')s='lubuk linggau';
  if(s==='pagaralam')s='pagar alam';
  if(s==='pali')s='penukal abab lematang ilir';
  return s;
};
function nameOf(f){let p=f.properties||{};return normalize(p.WADMKK||p.wadmkk||p.name||p.NAMOBJ||p.namobj||p.NAME);}
function collectionFrom(input){const c=input?.type==='FeatureCollection'?input:input?.geojson;if(!Array.isArray(c?.features))throw new Error('Format GeoJSON tidak valid');return c;}
function filtered(c,fromBIG){
 const feats=collectionFrom(c).features.filter(f=>{
  const name=nameOf(f),p=f.properties||{};
  if(!REGION_NAMES.has(name))return false;
  if(fromBIG)return true;
  return String(p.code||p.kode||'').startsWith('16.') || String(p.wadmpr||p.WADMPR||'').toLowerCase().includes('sumatera selatan');
 });
 if(new Set(feats.map(nameOf)).size<15)throw new Error('Cakupan wilayah kurang dari 15 kabupaten/kota');
 return {type:'FeatureCollection',features:feats.map(f=>({type:'Feature',properties:{name:nameOf(f)},geometry:f.geometry}))};
}
async function fetchJson(url,timeoutMs=10000){
 const c=new AbortController(),timer=setTimeout(()=>c.abort(),timeoutMs);
 try{
  const r=await fetch(url,{headers:{'Accept':'application/geo+json, application/json'},signal:c.signal});
  if(!r.ok)throw new Error(`HTTP ${r.status}`);
  return await r.json();
 }finally{clearTimeout(timer);}
}
const sources=[
 {name:'BIG – BATAS_KABKOTA_AR',endpoint:'https://geoservices.big.go.id/rbi/rest/services/BATASWILAYAH/BATAS_KABKOTA_AR/MapServer/0/query',field:'WADMPR'},
 {name:'BIG – DISIGT BatasWilayah',endpoint:'https://geoservices.big.go.id/gis/rest/services/DISIGT/BatasWilayah/FeatureServer/0/query',field:'wadmpr'}
];
async function loadBIG(source){
 const query=new URLSearchParams({f:'geojson',where:`${source.field} LIKE '%SUMATERA SELATAN%'`,outFields:'*',returnGeometry:'true',outSR:'4326',geometryPrecision:'4',maxAllowableOffset:'0.003'});
 const url=`${source.endpoint}?${query.toString()}`;
 const raw=await fetchJson(url,5300);
 if(raw.error)throw new Error(raw.error.message||'ArcGIS service error');
 return filtered(raw,true);
}
module.exports=async function handler(req,res){
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}
 const errors=[];
 try{
  // Uji kedua layanan BIG secara paralel agar halaman tidak harus menunggu
  // timeout dari satu endpoint sebelum mencoba endpoint berikutnya.
  const winner=await Promise.any(sources.map(async source=>({geojson:await loadBIG(source),source:source.name})));
  res.setHeader('Cache-Control','public, s-maxage=21600, stale-while-revalidate=86400');
  return res.status(200).json({geojson:winner.geojson,source:winner.source,official:true});
 }catch(e){errors.push('Layanan BIG tidak tersedia');}
 const fallbacks=['https://raw.githubusercontent.com/AlfianAliM/Indonesia-GeoJSON/master/kab_kota.geojson','https://cdn.jsdelivr.net/gh/AlfianAliM/Indonesia-GeoJSON@master/kab_kota.geojson'];
 try{
  const geojson=await Promise.any(fallbacks.map(async uri=>filtered(await fetchJson(uri,4000),false)));
  res.setHeader('Cache-Control','public, s-maxage=3600, stale-while-revalidate=7200');
  return res.status(200).json({geojson,source:'Indonesia GeoJSON (cadangan)',official:false});
 }catch(e){errors.push('Semua sumber cadangan gagal');}
 console.error('HCU Sumsel map sources unavailable:',errors.join(' | '));
 res.setHeader('Cache-Control','no-store');
 return res.status(503).json({error:'Batas administratif sementara tidak tersedia. Pin tetap dapat digunakan.'});
};
