/* ================================================================
   invoices.js — شاشة الفواتير الموحّدة — alfaprosys
   تجمع: الفواتير المفتوحة + المعلقة + المنتهية + الملغية
   مع إمكانية التعديل الكاملة من نفس الشاشة
   ================================================================ */

const DATA    = window.DEMO_DATA;
let invoices  = DATA.invoices || [];

/* ── حالة الشاشة ── */
let selectedId       = '';        // الفاتورة المختارة
let filterStatus     = 'active';  // active | open | pending | printed | cancelled | ''
let searchQuery      = '';
let addMode          = false;
let activeCategoryId = null;
let activeFamily     = null;
let pendingItemId    = null;
let editLogs         = [];

/* ── نافذة الإلغاء ── */
let cancelModalOpen   = false;
let cancelReason      = '';
let cancelReasonCustom= '';

/* ── نافذة التعليق ── */
let pendingModalOpen  = false;
let pendingReason     = '';

/* ── أدوات ── */
function goPOS(){ location.href = 'pos.html'; }
function bySort(a,b){ return (a.sort_order||0)-(b.sort_order||0); }
function uniq(arr){ return [...new Set(arr.filter(Boolean))]; }
function nowTime(){ return new Date().toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'}); }
function selectedInvoice(){ return invoices.find(i => i.id === selectedId); }
function recalc(inv){ inv.total=(inv.items||[]).reduce((s,x)=>s+Number(x.total||0),0); }

/* 🛵 فواتير الأونلاين: قراءة فقط + حذف فقط (الطلب 13) */
function isOnlineInv(inv){
  if (!inv) return false;
  if (inv.source === 'online' || inv.online_order_id) return true;
  return ((window.DEMO_DATA && DEMO_DATA.online_orders) || []).some(o => o.invoice_id === inv.id);
}
function invToast(msg){
  let t = document.getElementById('invToast');
  if (!t) { t = document.createElement('div'); t.id = 'invToast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._tm); t._tm = setTimeout(() => t.classList.remove('show'), 2300);
}
function deleteOnlineInvoice(){
  const inv = selectedInvoice();
  if (!inv || !isOnlineInv(inv)) return;
  if (!confirm(`حذف فاتورة الأونلاين ${invNoLabel(inv)} نهائياً؟\nلا يمكن التراجع عن الحذف.`)) return;
  const ord = (DATA.online_orders || []).find(o => o.invoice_id === inv.id);
  if (ord) ord.invoice_id = null;
  invoices = invoices.filter(i => i.id !== inv.id);
  DATA.invoices = invoices;
  selectedId = ''; addMode = false;
  render();
  window.AlfaAudit && AlfaAudit.log('online', 'حذف فاتورة أونلاين نهائياً', `${inv.id} (${fmtNum(inv.total)} ل.س)`, 'مستخدم الفواتير');
  invToast('🗑️ حُذفت فاتورة الأونلاين نهائياً');
}

/* ── حالات الفاتورة ── */
const STATUS = {
  open:      { label:'مفتوحة',  icon:'🟢', cls:'st-open'      },
  pending:   { label:'معلقة',   icon:'⏸️', cls:'st-pending'   },
  printed:   { label:'منتهية',  icon:'✅', cls:'st-printed'   },
  cancelled: { label:'ملغية',   icon:'🔴', cls:'st-cancelled' },
};
function stInfo(s){ return STATUS[s] || { label:s||'—', icon:'⚪', cls:'st-unknown' }; }
function stBadge(s){
  const st = stInfo(s);
  return `<span class="inv-badge ${st.cls}">${st.icon} ${st.label}</span>`;
}

/* ── فلترة الفواتير ── */
function filteredInvoices(){
  let list = [...invoices];

  /* فلتر الحالة */
  if(filterStatus === 'active'){
    list = list.filter(i => i.status === 'open' || i.status === 'pending');
  } else if(filterStatus){
    list = list.filter(i => i.status === filterStatus);
  }

  /* فلتر البحث */
  if(searchQuery.trim()){
    const q = searchQuery.trim().toLowerCase();
    list = list.filter(i =>
      `${invNoLabel(i)} ${i.customer_name||''} ${i.phone||''} ${i.hall||''} ${i.type||''} ${i.status||''}`
      .toLowerCase().includes(q));
  }

  return list;
}

/* ── القائمة ── */
function catItems(){ if(!activeCategoryId) return []; return DATA.items.filter(i=>i.category_id===activeCategoryId&&i.is_available!==false).sort(bySort); }
function families(){ return uniq(catItems().map(i=>i.family)); }
function finalItems(){ if(!activeCategoryId||!activeFamily) return []; return catItems().filter(i=>i.family===activeFamily).sort(bySort); }
function itemTitle(item){
  const v = item.variant_clean || String(item.variant||'').replace(/ - |-/g,' ').trim();
  if(item.option_name && item.option_name!==item.family) return `${item.option_name} ${v}`.trim();
  return v || item.name;
}
function famLabel(f){ return f==='شاورما'&&activeCategoryId==='cat_shawarma'?'وجبات وسندويشات':f; }

/* ================================================================
   الرسم الرئيسي
   ================================================================ */
function render(){
  const list = filteredInvoices();
  const inv  = selectedInvoice();
  const counts = {
    active:    invoices.filter(i=>i.status==='open'||i.status==='pending').length,
    open:      invoices.filter(i=>i.status==='open').length,
    pending:   invoices.filter(i=>i.status==='pending').length,
    printed:   invoices.filter(i=>i.status==='printed').length,
    cancelled: invoices.filter(i=>i.status==='cancelled').length,
  };

  document.getElementById('invoicesApp').innerHTML = `
    <div class="inv-shell">

      <!-- Topbar -->
      <header class="inv-topbar">
        <button class="inv-back-btn" onclick="goPOS()">‹ البيع</button>
        <div class="inv-topbar-title">
          <span>🧾</span>
          <span>الفواتير</span>
          ${selectedId && inv ? stBadge(inv.status) : ''}
        </div>
        ${selectedId ? `
          <button class="inv-topbar-list-btn" onclick="clearSelection()">📋 القائمة</button>
        ` : `<div></div>`}
      </header>

      <!-- محتوى -->
      <div class="inv-body ${selectedId ? 'inv-body-detail' : 'inv-body-list'}">

        <!-- ════ عرض القائمة ════ -->
        ${!selectedId ? `

          <!-- فلاتر الحالة -->
          <div class="inv-filters">
            ${[
              { key:'active',    label:`نشطة`,      icon:'⚡', count: counts.active    },
              { key:'open',      label:`مفتوحة`,    icon:'🟢', count: counts.open      },
              { key:'pending',   label:`معلقة`,     icon:'⏸️', count: counts.pending   },
              { key:'printed',   label:`منتهية`,    icon:'✅', count: counts.printed   },
              { key:'cancelled', label:`ملغية`,     icon:'🔴', count: counts.cancelled },
              { key:'',          label:`الكل`,      icon:'🗂️', count: invoices.length  },
            ].map(f => `
              <button class="inv-filter-btn ${filterStatus===f.key?'active':''}"
                onclick="setFilter('${f.key}')">
                ${f.icon} ${f.label}
                <span class="inv-filter-count">${f.count}</span>
              </button>`).join('')}
          </div>

          <!-- شريط البحث -->
          <div class="inv-search-bar">
            <input type="search" dir="rtl"
              class="inv-search-input"
              placeholder="رقم فاتورة / اسم عميل / صالة..."
              value="${e(searchQuery)}"
              oninput="searchQuery=this.value; render()">
            ${searchQuery ? `<button class="inv-search-clear" onclick="searchQuery=''; render()">×</button>` : ''}
          </div>

          <!-- قائمة الفواتير -->
          <div class="inv-list">
            ${list.length ? list.map(renderInvRow).join('') : `
              <div class="inv-empty">
                <span>📭</span>
                <p>لا توجد فواتير في هذه الفئة</p>
              </div>`}
          </div>

        ` : `

          <!-- ════ عرض التفاصيل ════ -->
          ${inv ? renderDetail(inv) : `<div class="inv-empty"><span>⚠️</span><p>الفاتورة غير موجودة</p></div>`}

        `}

      </div>

      <!-- مودالات -->
      ${renderQtyModal()}
      ${cancelModalOpen ? renderCancelModal() : ''}
      ${pendingModalOpen ? renderPendingModal() : ''}

    </div>`;
}

/* ── صف الفاتورة في القائمة ── */
function renderInvRow(inv){
  const typeLabel = { table:'طاولة', takeaway:'سفري', delivery:'توصيل', contract:'عقد' }[inv.type] || inv.type || '—';
  return `
    <button class="inv-row" onclick="selectInv('${e(inv.id)}')">
      <div class="inv-row-start">
        <div class="inv-row-id">${e(invNoLabel(inv))}</div>
        <div class="inv-row-sub">
          ${e(inv.hall || inv.customer_name || typeLabel)}
          ${inv.time ? `· ${e(inv.time)}` : ''}
        </div>
      </div>
      <div class="inv-row-end">
        ${isOnlineInv(inv) ? '<span class="inv-online-badge">🛵 أونلاين</span>' : ''}
        ${stBadge(inv.status)}
        <div class="inv-row-total">${fmtNum(inv.total)} <small>ل.س</small></div>
      </div>
    </button>`;
}

/* ================================================================
   صفحة تفاصيل الفاتورة
   ================================================================ */
function renderDetail(inv){
  recalc(inv);
  const online     = isOnlineInv(inv);
  const canEdit    = !online && (inv.status === 'open' || inv.status === 'pending');
  const isPending  = inv.status === 'pending';
  const isOpen     = inv.status === 'open';
  const typeLabel  = { table:'طاولة', takeaway:'سفري', delivery:'توصيل', contract:'عقد' }[inv.type] || inv.type || '—';

  return `
    <!-- رأس التفاصيل -->
    <div class="inv-detail-head">
      <div class="inv-detail-meta">
        <div class="inv-detail-id">🧾 ${e(invNoLabel(inv))} ${online ? '<span class="inv-online-badge">🛵 أونلاين</span>' : ''}</div>
        <div class="inv-detail-info">
          ${e(inv.hall || inv.customer_name || typeLabel)}
          ${inv.time ? `· ${e(inv.time)}` : ''}
          ${inv.cashier ? `· ${e(inv.cashier)}` : ''}
        </div>
      </div>
      ${stBadge(inv.status)}
    </div>

    <!-- ملاحظة الحالة -->
    ${isPending && inv.pending_reason ? `
      <div class="inv-status-note inv-note-pending">⏸️ <strong>معلقة:</strong> ${e(inv.pending_reason)}</div>` : ''}
    ${inv.status==='cancelled' && inv.cancel_reason ? `
      <div class="inv-status-note inv-note-cancelled">🔴 <strong>سبب الإلغاء:</strong> ${e(inv.cancel_reason)}</div>` : ''}
    ${online ? `
      <div class="inv-status-note inv-note-online">🛵 <strong>فاتورة من طلب أونلاين</strong> — قراءة فقط: لا تعديل ولا إلغاء، ويمكن حذفها نهائياً فحسب</div>` : ''}

    <!-- شريط الإجراءات -->
    <div class="inv-act-bar">
      ${online ? `
        <button class="inv-act" onclick="printEditNotice('${e(invNoLabel(inv))}')">🖨️ طباعة</button>
        <button class="inv-act inv-act-del-btn" onclick="deleteOnlineInvoice()">🗑️ حذف نهائي</button>` : `
        ${canEdit ? `
          <button class="inv-act ${addMode?'inv-act-active':''}" onclick="toggleAddMode()">
            ${addMode ? '✖ إغلاق' : '➕ إضافة'}
          </button>
          <button class="inv-act" onclick="printEditNotice('${e(invNoLabel(inv))}')">🖨️ طباعة</button>
        ` : ''}
        ${isOpen ? `
          <button class="inv-act inv-act-pending-btn" onclick="openPendingModal()">⏸️ تعليق</button>` : ''}
        ${isPending ? `
          <button class="inv-act inv-act-reopen-btn" onclick="reopenInvoice()">🟢 فتح</button>` : ''}
        ${canEdit ? `
          <button class="inv-act inv-act-cancel-btn" onclick="openCancelModal()">🔴 إلغاء</button>` : ''}`}
    </div>

    <!-- أصناف الفاتورة -->
    <div class="inv-items-list">
      ${(inv.items||[]).map((it,idx) => `
        <div class="inv-item ${!canEdit?'inv-item-locked':''}">
          <div class="inv-item-main">
            <div class="inv-item-name">${e(it.name)}</div>
            <div class="inv-item-qty">× ${fmtNum(it.qty)}</div>
            <div class="inv-item-total">${fmtNum(it.total)}</div>
          </div>
          ${canEdit ? `
            <div class="inv-item-actions">
              <button onclick="decreaseItem(${idx})">− 1</button>
              <button onclick="replaceItem(${idx})">استبدال</button>
              <button class="danger" onclick="removeItem(${idx})">حذف</button>
            </div>` : ''}
          ${it.note ? `<div class="inv-item-note">📝 ${e(it.note)}</div>` : ''}
        </div>`).join('') || `<div class="inv-empty-items">لا توجد أصناف</div>`}
    </div>

    <!-- الإجمالي -->
    <div class="inv-total-bar">
      <span>إجمالي الفاتورة</span>
      <strong>${fmtNum(inv.total)} ل.س</strong>
    </div>

    <!-- لوحة الإضافة -->
    ${addMode && canEdit ? renderAddPanel() : ''}

    <!-- سجل التعديلات -->
    ${editLogs.filter(l=>l.invoice_id===inv.id).length ? `
      <div class="inv-log">
        <div class="inv-log-title">📋 سجل التعديلات</div>
        ${editLogs.filter(l=>l.invoice_id===inv.id).slice().reverse().map(l => `
          <div class="inv-log-row">
            <span>${e(l.text)}</span>
            <small>${e(l.time)}</small>
          </div>`).join('')}
      </div>` : ''}
  `;
}

/* ================================================================
   لوحة إضافة الأصناف
   ================================================================ */
function renderAddPanel(){
  const cats  = DATA.categories.filter(c=>c.is_active);
  const fams  = activeCategoryId ? families() : [];
  const items = finalItems();

  if(!activeCategoryId) return `
    <div class="inv-add-panel">
      <div class="inv-add-title">➕ اختر التصنيف</div>
      <div class="inv-add-grid">
        ${cats.map(c=>`<button onclick="selCat('${e(c.id)}')"><span>${c.icon}</span>${e(c.name)}</button>`).join('')}
      </div>
    </div>`;

  if(!activeFamily) return `
    <div class="inv-add-panel">
      <div class="inv-add-nav"><button onclick="resetPicker()">‹ التصنيفات</button></div>
      <div class="inv-add-grid">
        ${fams.map(f=>`<button onclick="selFam('${e(f)}')">${e(famLabel(f))}</button>`).join('')}
      </div>
    </div>`;

  return `
    <div class="inv-add-panel">
      <div class="inv-add-nav"><button onclick="activeFamily=null; render()">‹ رجوع</button></div>
      <div class="inv-add-grid items">
        ${items.map(i=>`<button onclick="openQty('${e(i.id)}')">
          <span class="add-item-name">${e(itemTitle(i))}</span>
          <span class="add-item-price">${fmtNum(i.price)}</span>
        </button>`).join('')}
      </div>
    </div>`;
}

/* ================================================================
   نافذة الكمية
   ================================================================ */
function renderQtyModal(){
  if(!pendingItemId) return '';
  const item = DATA.items.find(i=>i.id===pendingItemId);
  if(!item) return '';
  return `
    <div class="inv-scrim" onclick="closeQty()"></div>
    <div class="inv-modal">
      <div class="inv-modal-head">
        <div><strong>${e(itemTitle(item))}</strong><span>${fmtNum(item.price)} ل.س</span></div>
        <button onclick="closeQty()">✕</button>
      </div>
      <div class="inv-qty-grid">
        ${Array.from({length:20},(_,i)=>i+1).map(n=>`<button onclick="addItem(${n})">${n}</button>`).join('')}
      </div>
      <div class="inv-qty-custom">
        <input id="qtyInput" type="number" inputmode="numeric" placeholder="كمية أخرى...">
        <button onclick="addCustomQty()">إضافة</button>
      </div>
    </div>`;
}

/* ================================================================
   نافذة الإلغاء
   ================================================================ */
const CANCEL_REASONS = ['طلب العميل الإلغاء','خطأ في الطلب','انتهى المخزون','تأخر في التحضير','مشكلة في الدفع'];

function renderCancelModal(){
  return `
    <div class="inv-scrim" onclick="closeCancelModal()"></div>
    <div class="inv-modal inv-modal-action">
      <div class="inv-modal-head danger-head">
        <strong>🔴 إلغاء الفاتورة</strong>
        <button onclick="closeCancelModal()">✕</button>
      </div>
      <div class="inv-modal-body">
        <p class="inv-modal-hint">اختر سبب الإلغاء أو أدخله يدوياً</p>
        <div class="inv-reasons-grid">
          ${CANCEL_REASONS.map(r=>`
            <button class="inv-reason-btn ${cancelReason===r?'selected':''}"
              onclick="selectCancelReason('${e(r)}')">${e(r)}</button>`).join('')}
        </div>
        <input type="text" class="inv-reason-input"
          placeholder="أو اكتب سبباً آخر..."
          value="${e(cancelReasonCustom)}"
          oninput="cancelReasonCustom=this.value; cancelReason=this.value;">
      </div>
      <div class="inv-modal-foot">
        <button class="inv-modal-btn secondary" onclick="closeCancelModal()">تراجع</button>
        <button class="inv-modal-btn danger" onclick="confirmCancel()"
          ${(!cancelReason&&!cancelReasonCustom)?'disabled':''}>تأكيد الإلغاء</button>
      </div>
    </div>`;
}

/* ================================================================
   نافذة التعليق
   ================================================================ */
const PENDING_REASONS = ['العميل يفكر في الطلب','انتظار موافقة','العميل خرج مؤقتاً','طلب تأجيل التحضير'];

function renderPendingModal(){
  return `
    <div class="inv-scrim" onclick="closePendingModal()"></div>
    <div class="inv-modal inv-modal-action">
      <div class="inv-modal-head pending-head">
        <strong>⏸️ تعليق الفاتورة</strong>
        <button onclick="closePendingModal()">✕</button>
      </div>
      <div class="inv-modal-body">
        <p class="inv-modal-hint">ما سبب التعليق؟ (اختياري)</p>
        <div class="inv-reasons-grid">
          ${PENDING_REASONS.map(r=>`
            <button class="inv-reason-btn ${pendingReason===r?'selected':''}"
              onclick="pendingReason='${e(r)}'; render()">${e(r)}</button>`).join('')}
        </div>
        <input type="text" class="inv-reason-input"
          placeholder="أو اكتب سبباً..."
          value="${e(pendingReason)}"
          oninput="pendingReason=this.value;">
      </div>
      <div class="inv-modal-foot">
        <button class="inv-modal-btn secondary" onclick="closePendingModal()">تراجع</button>
        <button class="inv-modal-btn pending" onclick="confirmPending()">⏸️ تعليق</button>
      </div>
    </div>`;
}

/* ================================================================
   منطق الإجراءات
   ================================================================ */
function setFilter(s)    { filterStatus=s; searchQuery=''; render(); }
function selectInv(id)   { selectedId=id; addMode=false; activeCategoryId=null; activeFamily=null; render(); }
function clearSelection(){ selectedId=''; addMode=false; activeCategoryId=null; activeFamily=null; render(); }
function toggleAddMode() { addMode=!addMode; activeCategoryId=null; activeFamily=null; render(); }
function selCat(id)      { activeCategoryId=id; activeFamily=null; const fs=families(); if(fs.length===1) activeFamily=fs[0]; render(); }
function selFam(f)       { activeFamily=f; render(); }
function resetPicker()   { activeCategoryId=null; activeFamily=null; render(); }
function openQty(id)     { pendingItemId=id; render(); }
function closeQty()      { pendingItemId=null; render(); }
function addCustomQty()  { const q=Number(document.getElementById('qtyInput')?.value||0); if(q>0) addItem(q); }

function addItem(qty){
  const inv  = selectedInvoice();
  const item = DATA.items.find(i=>i.id===pendingItemId);
  if(!inv||!item) return;
  const title = itemTitle(item);
  const name  = item.option_name&&item.option_name!==item.family ? title : `${item.family} ${title}`.trim();
  inv.items.push({ name, qty, total:item.price*qty, note:'', added_now:true });
  recalc(inv);
  editLogs.push({ invoice_id:inv.id, text:`➕ إضافة ${qty}× ${title}`, time:nowTime() });
  window.AlfaAudit && AlfaAudit.log('invoices', 'إضافة صنف لفاتورة', `${inv.id}: +${qty}× ${title}`, 'مستخدم الفواتير');
  pendingItemId=null; render();
}

function decreaseItem(idx){
  const inv=selectedInvoice(); if(!inv) return;
  const it=inv.items[idx]; if(!it) return;
  const oldQty=Number(it.qty||0);
  if(oldQty<=1) return removeItem(idx);
  const unit=Number(it.total||0)/oldQty;
  it.qty=oldQty-1; it.total=Math.round(unit*it.qty);
  recalc(inv);
  editLogs.push({ invoice_id:inv.id, text:`➖ إنقاص 1 من ${it.name}`, time:nowTime() });
  window.AlfaAudit && AlfaAudit.log('invoices', 'إنقاص كمية', `${inv.id}: −1 من ${it.name}`, 'مستخدم الفواتير');
  render();
}

function removeItem(idx){
  const inv=selectedInvoice(); if(!inv) return;
  const it=inv.items[idx];
  if(!confirm(`حذف الصنف من الفاتورة؟\n${it?.name||''}`)) return;
  inv.items.splice(idx,1); recalc(inv);
  editLogs.push({ invoice_id:inv.id, text:`🗑️ حذف ${it?.name||'صنف'}`, time:nowTime() });
  window.AlfaAudit && AlfaAudit.log('invoices', 'حذف صنف من فاتورة', `${inv.id}: ${it?.name||'صنف'}`, 'مستخدم الفواتير');
  render();
}

function replaceItem(idx){
  const inv=selectedInvoice(); if(!inv) return;
  const it=inv.items[idx]; if(!it) return;
  if(!confirm(`استبدال الصنف؟\nسيُحذف: ${it.name}\nثم اختر البديل.`)) return;
  inv.items.splice(idx,1); recalc(inv);
  editLogs.push({ invoice_id:inv.id, text:`↔️ استبدال ${it.name}`, time:nowTime() });
  window.AlfaAudit && AlfaAudit.log('invoices', 'استبدال صنف', `${inv.id}: ${it.name}`, 'مستخدم الفواتير');
  addMode=true; activeCategoryId=null; activeFamily=null; render();
}

/* ── إلغاء ── */
function openCancelModal()  { cancelModalOpen=true; cancelReason=''; cancelReasonCustom=''; render(); }
function closeCancelModal() { cancelModalOpen=false; render(); }
function selectCancelReason(r){ cancelReason=r; cancelReasonCustom=''; render(); }
function confirmCancel(){
  const inv=selectedInvoice(); if(!inv) return;
  const reason=cancelReasonCustom.trim()||cancelReason;
  if(!reason) return;
  inv.status='cancelled'; inv.cancel_reason=reason;
  window.AlfaAudit && AlfaAudit.log('invoices', 'إلغاء فاتورة', `${inv.id} (${fmtNum(inv.total)} ل.س) — السبب: ${reason}`, 'مستخدم الفواتير');
  editLogs.push({ invoice_id:inv.id, text:`🔴 إلغاء: ${reason}`, time:nowTime() });
  cancelModalOpen=false; render();
}

/* ── تعليق ── */
function openPendingModal()  { pendingModalOpen=true; pendingReason=''; render(); }
function closePendingModal() { pendingModalOpen=false; render(); }
function confirmPending(){
  const inv=selectedInvoice(); if(!inv) return;
  inv.status='pending'; inv.pending_reason=pendingReason||'تعليق';
  editLogs.push({ invoice_id:inv.id, text:`⏸️ تعليق: ${inv.pending_reason}`, time:nowTime() });
  pendingModalOpen=false; render();
}
function reopenInvoice(){
  const inv=selectedInvoice(); if(!inv) return;
  inv.status='open'; inv.pending_reason='';
  editLogs.push({ invoice_id:inv.id, text:'🟢 إعادة فتح', time:nowTime() });
  window.AlfaAudit && AlfaAudit.log('invoices', 'إعادة فتح فاتورة', inv.id, 'مستخدم الفواتير');
  render();
}

function printEditNotice(id){ alert(`طباعة إشعار تعديل: ${id}`); }

render();
