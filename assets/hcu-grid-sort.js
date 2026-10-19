/* HCU-Portal V9.07.5 — Universal grid sorting.
 * Purely client-side: reorder displayed <tr> nodes only; never edit Fy_Database,
 * source arrays, action handlers, or existing search/filter values.
 */
(function () {
  'use strict';
  if (window.HCUGridSort && window.HCUGridSort.version === '9.07.7') return;

  const collator = new Intl.Collator('id-ID', { numeric: true, sensitivity: 'base' });
  const excluded = /^(aksi|action|tindakan|operasi|tools?|pilihan)$/i;
  const memory = new Map();
  let pendingFrame = false;

  const style = document.createElement('style');
  style.id = 'hcu-grid-sort-style-v9077';
  style.textContent = `
    table.hcu-grid-sort thead th.hcu-sortable {cursor:pointer;user-select:none;-webkit-user-select:none;position:sticky;top:0;z-index:3;padding-right:23px!important;transition:background-color .15s ease;}
    table.hcu-grid-sort thead th.hcu-sortable::after {content:'↕';position:absolute;right:7px;top:50%;transform:translateY(-50%);font-size:12px;font-weight:700;color:#7d90a8;opacity:.78;pointer-events:none;}
    table.hcu-grid-sort thead th.hcu-sortable:hover {background:#e9f2fe!important;color:#123e76;}
    table.hcu-grid-sort thead th.hcu-sortable:focus-visible {outline:2px solid #2175c2;outline-offset:-2px;}
    table.hcu-grid-sort thead th.hcu-sortable[aria-sort="ascending"], table.hcu-grid-sort thead th.hcu-sortable[aria-sort="descending"] {background:#e5f1ff!important;color:#12477c;}
    table.hcu-grid-sort thead th.hcu-sortable[aria-sort="ascending"]::after {content:'▲';color:#1667b8;opacity:1;}
    table.hcu-grid-sort thead th.hcu-sortable[aria-sort="descending"]::after {content:'▼';color:#1667b8;opacity:1;}
  `;
  (document.head || document.documentElement).appendChild(style);

  function pageScope(table) {
    const dialog = table.closest('.modal[id], [role="dialog"][id]');
    if (dialog) return `modal:${dialog.id}`;
    const page = document.querySelector('#nav button.active[data-page]');
    if (table.closest('#content')) return `page:${page ? page.dataset.page : 'content'}`;
    return 'global';
  }

  function headerText(th) {
    return (th.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function tableKey(table, heads) {
    // One key per logical grid, even when page rendering replaces its table node.
    const bodyId = table.tBodies[0] && table.tBodies[0].id;
    if (bodyId) return `${pageScope(table)}|body:${bodyId}`;
    const titles = heads.map(headerText).join('|').toLocaleLowerCase('id-ID');
    const peers = Array.from(table.closest('#content, .modal, body')?.querySelectorAll('table') || []);
    const matches = peers.filter(t =>
      Array.from(t.tHead?.rows?.[0]?.cells || []).map(headerText).join('|').toLocaleLowerCase('id-ID') === titles
    );
    return `${pageScope(table)}|heads:${titles}|index:${Math.max(0, matches.indexOf(table))}`;
  }

  function allCells(row) {
    return Array.from(row.cells || []);
  }

  function canSort(table, index) {
    const head = table.tHead?.rows?.[0];
    const th = head?.cells?.[index];
    if (!th || th.colSpan !== 1 || th.rowSpan !== 1 || th.querySelector('button,input,select,textarea,a')) return false;
    const txt = headerText(th);
    return !!txt && !excluded.test(txt);
  }

  function decorate(table) {
    if (!table || !table.tHead || !table.tBodies.length || !table.tHead.rows.length) return;
    const heads = allCells(table.tHead.rows[0]);
    if (!heads.length) return;
    table.classList.add('hcu-grid-sort');
    table.dataset.hcuSortKey = tableKey(table, heads);
    // Baca preferensi default pada grid; sorting manual pengguna tetap lebih tinggi prioritasnya.
    if (!memory.has(table.dataset.hcuSortKey) && table.hasAttribute('data-hcu-default-sort-column')) {
      const column = Number(table.dataset.hcuDefaultSortColumn);
      if (Number.isInteger(column) && canSort(table,column)) {
        const direction = table.dataset.hcuDefaultSortDirection === 'desc' ? -1 : 1;
        memory.set(table.dataset.hcuSortKey,{column,direction});
      }
    }
    const state = memory.get(table.dataset.hcuSortKey);
    for (let i = 0; i < heads.length; i++) {
      const th = heads[i];
      if (!canSort(table, i)) {
        th.classList.remove('hcu-sortable');
        th.removeAttribute('data-hcu-sort-col');
        th.removeAttribute('aria-sort');
        continue;
      }
      th.classList.add('hcu-sortable');
      th.dataset.hcuSortCol = String(i);
      th.tabIndex = 0;
      const name = headerText(th);
      if (!th.hasAttribute('title')) th.title = `Urutkan kolom ${name} (klik untuk naik/turun)`;
      if (state && state.column === i) {
        th.setAttribute('aria-sort', state.direction === 1 ? 'ascending' : 'descending');
        th.setAttribute('aria-label', `${name}, diurutkan ${state.direction === 1 ? 'naik' : 'turun'}. Tekan Enter untuk membalik urutan.`);
      } else {
        th.setAttribute('aria-sort', 'none');
        th.setAttribute('aria-label', `${name}, belum diurutkan. Tekan Enter untuk mengurutkan naik.`);
      }
    }
  }

  function normalize(v) {
    return String(v ?? '').replace(/\s+/g, ' ').trim();
  }

  function readCell(row, index) {
    const cell = allCells(row)[index];
    if (!cell || cell.colSpan !== 1) return '';
    const explicit = cell.getAttribute('data-sort-value');
    if (explicit !== null) return normalize(explicit);
    // On edit-capable rows, sort actual input values rather than button captions.
    const editor = cell.querySelector('input:not([type="hidden"]),select,textarea');
    if (editor) return normalize(editor.value);
    return normalize(cell.textContent);
  }

  function parseDate(raw) {
    const str = normalize(raw);
    let m = str.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?:\s+(\d{1,2})[:.](\d{2}))?$/);
    if (m) {
      const day=+m[1],month=+m[2],year=+m[3];
      if (day>0 && day<=31 && month>0 && month<=12 && year>=1900) {
        const d = new Date(year,month-1,day,+m[4]||0,+m[5]||0);
        if (d.getFullYear()===year && d.getMonth()===month-1 && d.getDate()===day) return d.getTime();
      }
    }
    m = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{1,2}):(\d{2})(?::\d{2})?)?/);
    if (m) {
      const d = new Date(+m[1],+m[2]-1,+m[3],+m[4]||0,+m[5]||0);
      if (d.getFullYear()===+m[1] && d.getMonth()===+m[2]-1 && d.getDate()===+m[3]) return d.getTime();
    }
    const months = ['januari','februari','maret','april','mei','juni','juli','agustus','september','oktober','november','desember'];
    m = str.toLocaleLowerCase('id-ID').match(/^(?:(\d{1,2})\s+)?([a-z]+)\s+(\d{4})$/);
    if (m) {
      const month = months.findIndex((name) => name===m[2] || name.slice(0,3)===m[2].slice(0,3));
      if (month !== -1) return new Date(+m[3],month,+(m[1]||1)).getTime();
    }
    return null;
  }

  function parseNumber(raw) {
    let v = normalize(raw).replace(/\u00a0/g,' ');
    if (!v) return null;
    const duration = v.match(/^(\d+)\s*tahun(?:\s*(\d+)\s*bulan)?$/i);
    if (duration) return (+duration[1])*12+(+duration[2]||0);
    const month = v.match(/^(\d+)\s*bulan$/i);
    if (month) return +month[1];
    // Date strings and alphanumeric IDs must never be interpreted as numbers.
    if (/\d+[/-]\d+[/-]\d+/.test(v) || /[A-Za-z]+-\d/.test(v)) return null;
    v = v.replace(/^Rp\.?\s*/i,'').replace(/\s*%$/,'');
    let factor = 1;
    const suffix = v.match(/\s*(triliun|miliar|milyar|juta|ribu|jt|rb|m|b|k)\s*$/i);
    if (suffix) {
      const unit = suffix[1].toLowerCase();
      factor = ({triliun:1e12,miliar:1e9,milyar:1e9,m:1e9,b:1e9,juta:1e6,jt:1e6,ribu:1e3,rb:1e3,k:1e3})[unit] || 1;
      v = v.slice(0,suffix.index).trim();
    }
    if (!/^[+-]?\d[\d.,\s]*$/.test(v)) {
      const days = v.match(/(?:lewat\s*)?([+-]?\d+)\s*hari$/i);
      return days ? +days[1] : null;
    }
    v=v.replace(/\s/g,'');
    const comma=v.lastIndexOf(','), dot=v.lastIndexOf('.');
    if (comma !== -1 && dot !== -1) {
      const decimal = comma>dot ? ',' : '.';
      v = decimal===',' ? v.replace(/\./g,'').replace(',','.') : v.replace(/,/g,'');
    } else if (comma !== -1) {
      if (/^[+-]?\d{1,3}(?:,\d{3})+$/.test(v)) v=v.replace(/,/g,'');
      else v=v.replace(',','.');
    } else if (dot !== -1) {
      if (/^[+-]?\d{1,3}(?:\.\d{3})+$/.test(v)) v=v.replace(/\./g,'');
    }
    const number=Number(v);
    return Number.isFinite(number) ? number*factor : null;
  }

  function asValue(raw, columnLabel) {
    const v = normalize(raw);
    if (!v || /^(?:—|-|–|n\/a|belum ada|belum tercatat|kosong)$/i.test(v)) return {kind:'empty',value:''};
    const isDateCol=/(tgl|tanggal|periode|waktu|s\.d\.|masa laku|polis s\.d|spk|awal polis|akhir polis)/i.test(columnLabel||'');
    if (isDateCol) {
      const date = parseDate(v);
      if (date !== null) return {kind:'number',value:date};
    }
    const num=parseNumber(v);
    if (num !== null) return {kind:'number',value:num};
    // Dates with no explicit date heading still sort chronologically.
    const date=parseDate(v);
    if (date !== null) return {kind:'number',value:date};
    return {kind:'text',value:v};
  }

  function eligibleRows(tbody) {
    const rows=Array.from(tbody.rows);
    // Riwayat Pinjam memiliki baris placeholder 'Tidak ada hasil' (colspan 8).
    // Sort hanya transaksi; baris notifikasi dan tombol aksi tetap utuh.
    if (tbody.id === 'a9074LoanHistoryBody') return rows.filter(r=>r.hasAttribute('data-a9074-loan-id'));
    // Subtotal, merged cells, and empty-state placeholders should not be split.
    if (rows.some(r=>Array.from(r.cells).some(c=>c.colSpan>1 || c.rowSpan>1))) return [];
    return rows;
  }

  function sortTable(table, force) {
    const key=table.dataset.hcuSortKey;
    const state=memory.get(key);
    if (!state || !canSort(table,state.column)) return;
    const tbody=table.tBodies[0];
    if (!tbody) return;
    const rows=eligibleRows(tbody);
    if (rows.length<2) return;
    const label=headerText(table.tHead.rows[0].cells[state.column]);
    const decorated=rows.map((row,index)=>({row,index,parsed:asValue(readCell(row,state.column),label)}));
    decorated.sort((a,b)=>{
      const x=a.parsed, y=b.parsed;
      if (x.kind==='empty' && y.kind!=='empty') return 1;
      if (y.kind==='empty' && x.kind!=='empty') return -1;
      if (x.kind==='empty' && y.kind==='empty') return a.index-b.index;
      let result;
      if (x.kind==='number' && y.kind==='number') result=x.value-y.value;
      else result=collator.compare(String(x.value),String(y.value));
      return result ? Math.sign(result)*state.direction : a.index-b.index;
    });
    const changed=decorated.some((x,i)=>x.row!==rows[i]);
    if (changed || force) {
      // For subsequent filter refreshes, only modify DOM if the sort has changed.
      if (changed) tbody.append(...decorated.map(x=>x.row));
    }
  }

  function setSort(table,column) {
    decorate(table);
    if (!canSort(table,column)) return;
    const key=table.dataset.hcuSortKey;
    const last=memory.get(key);
    const direction=(last && last.column===column && last.direction===1) ? -1 : 1;
    memory.set(key,{column,direction});
    decorate(table);
    sortTable(table,true);
  }

  function handleSortEvent(event) {
    const th=event.target && event.target.closest ? event.target.closest('th.hcu-sortable') : null;
    if (!th || (event.type==='keydown' && !['Enter',' '].includes(event.key))) return;
    const table=th.closest('table');
    if (!table || !document.documentElement.contains(table)) return;
    if (event.target.closest('button,a,input,select,textarea')) return;
    if (event.type==='keydown') event.preventDefault();
    const index=Number(th.dataset.hcuSortCol);
    if (Number.isInteger(index)) setSort(table,index);
  }

  function reconcile() {
    pendingFrame=false;
    document.querySelectorAll('table:has(thead th):has(tbody)').forEach(table=>{
      decorate(table);
      if (memory.has(table.dataset.hcuSortKey)) sortTable(table,false);
    });
  }

  function scheduleReconcile() {
    if (!pendingFrame) {
      pendingFrame=true;
      window.requestAnimationFrame(reconcile);
    }
  }

  document.addEventListener('click',handleSortEvent);
  document.addEventListener('keydown',handleSortEvent);
  const observer=new MutationObserver(records=>{
    for(const r of records) {
      if (!r.addedNodes.length && !r.removedNodes.length) continue;
      if (r.target.closest?.('table') || Array.from(r.addedNodes).some(n=>
        n.nodeType===1 && (n.matches?.('table, .panel, .table-wrap, #content, tbody, tr, td, th, thead') || n.querySelector?.('table'))
      )) {scheduleReconcile();break;}
    }
  });
  const activate=()=>{observer.observe(document.body,{childList:true,subtree:true});scheduleReconcile();};
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',activate,{once:true});
  else activate();
  window.HCUGridSort={version:'9.07.7',sort:setSort,refresh:scheduleReconcile};
})();
