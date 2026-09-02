/* ================================================================
   kitchen.js — شاشة المطبخ KDS (مرتبطة بنقطة البيع)
   تعرض الطلبات الحيّة (open) بحالات: جديد → قيد التحضير → جاهز.
   ================================================================ */
const DATA = window.DEMO_DATA;
const tickets = () => (DATA.invoices||[]).filter(i => i.status==='open' && ['new','cooking','ready'].includes(i.kitchen_status||'new'));

function elapsedMin(inv){
  const t = inv.created_at ? new Date(inv.created_at) : null;
  if(!t || isNaN(t)) return 0;
  return Math.max(0, Math.round((Date.now()-t.getTime())/60000));
}
function typeLabel(inv){
  const m={table:'طاولة',takeaway:'سفري',delivery:'توصيل',contract:'عقد'}[inv.type]||inv.type||'';
  return inv.hall||inv.table_label||inv.customer_name||m;
}

function setKitchen(id, st){
  const inv=(DATA.invoices||[]).find(i=>i.id===id); if(!inv) return;
  inv.kitchen_status = st;
  if(st==='done'){ inv.status='printed'; }
  DATA.invoices = (DATA.invoices||[]).slice();
  render();
}

function render(){
  const list = tickets().sort((a,b)=> (a.created_at||'').localeCompare(b.created_at||''));
  const grid = document.getElementById('kdsGrid');
  const cnt  = document.getElementById('kdsCount');
  if(cnt) cnt.textContent = list.length;
  if(!list.length){ grid.innerHTML = `<div class="mgr-empty"><div class="mgr-empty-icon">🍳</div>لا طلبات قيد التحضير حالياً</div>`; return; }
  grid.innerHTML = list.map(inv=>{
    const st = inv.kitchen_status||'new';
    const min = elapsedMin(inv);
    const late = min>=10;
    return `
    <div class="kds-card ${st}">
      <div class="kds-card-top">
        <span class="kds-id">${e(inv.id)}</span>
        ${inv.queue_no?`<span class="kds-meta">دور ${window.padNo?padNo(inv.queue_no):inv.queue_no}</span>`:''}
        <span class="kds-timer ${late?'late':''}">⏱ ${min} د</span>
      </div>
      <div class="kds-meta">${e(typeLabel(inv))} · ${e(inv.time||'')}</div>
      <div class="kds-items">
        ${(inv.items||[]).filter(it=>!it.offer_disc).map(it=>`<div>${it.qty}× ${e(it.name)} ${it.note?`<span class="kds-note">📝 ${e(it.note)}</span>`:''}</div>`).join('')}
      </div>
      ${st==='new'     ? `<button class="kds-act start" onclick="setKitchen('${e(inv.id)}','cooking')">▶ بدء التحضير</button>`:''}
      ${st==='cooking' ? `<button class="kds-act ready" onclick="setKitchen('${e(inv.id)}','ready')">✅ جاهز</button>`:''}
      ${st==='ready'   ? `<button class="kds-act done" onclick="setKitchen('${e(inv.id)}','done')">🛵 تسليم/إرسال</button>`:''}
    </div>`;
  }).join('');
}

render();
setInterval(render, 5000);
if (window.Notify) Notify.init();
