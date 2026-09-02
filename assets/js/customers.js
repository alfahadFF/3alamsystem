/* ================================================================
   customers.js — إدارة العملاء — alfaprosys
   شاشة مشتركة: تتكيف مع دور الكاشير والمدير
   أنواع: regular | contract | vip | delivery
   ================================================================ */

const DATA = window.DEMO_DATA;
let customers = JSON.parse(JSON.stringify(DATA.customers || []));

/* ── الدور ── */
const ROLE = (function () {
  const stored = sessionStorage.getItem('alfaprosys_role');
  if (stored) return stored;
  const ref = document.referrer || '';
  if (ref.includes('pos.html') || ref.includes('cashier')) return 'cashier';
  return 'manager';
})();

/* ── أدوات ── */
/* ── تصنيفات العملاء ── */
const CUST_TYPES = {
  regular:  { label: 'مباشر',   icon: '👤', color: 'muted'  },
  contract: { label: 'عقد',     icon: '📋', color: 'gold'   },
  vip:      { label: 'VIP',     icon: '⭐', color: 'blue'   },
  delivery: { label: 'توصيل',   icon: '🛵', color: 'green'  },
};
function typeInfo(t) { return CUST_TYPES[t] || CUST_TYPES.regular; }

/* ================================================================
   قائمة التنقل — حسب الدور
   ================================================================ */
const MGR_NAV = window.AlfaNav.MGR_NAV;
const CURRENT = 'customers';
const navLink = window.AlfaNav.linker(CURRENT);

let navOpen = false;
function toggleNav() {
  navOpen = !navOpen;
  document.getElementById('mgrMobileNav')?.classList.toggle('expanded', navOpen);
  document.getElementById('mgrNavScrim')?.classList.toggle('show', navOpen);
}
function closeNav() {
  navOpen = false;
  document.getElementById('mgrMobileNav')?.classList.remove('expanded');
  document.getElementById('mgrNavScrim')?.classList.remove('show');
}

/* ── شاشة الكاشير: topbar بسيط ── */
function renderCashierShell(body) {
  return `
    <div class="customers-shell">
      <header class="customers-topbar">
        <div>
          <div class="pos-brand">alfaprosys</div>
          <div class="pos-subtitle">إدارة العملاء</div>
        </div>
        <a class="back-to-pos-btn" href="pos.html">← رجوع للبيع</a>
      </header>
      <main class="customers-content">${body}</main>
    </div>`;
}

/* ── شاشة المدير: sidebar كامل ── */
function renderManagerShell(body) {
  return `
    <div class="mgr-layout">
      <nav class="mgr-sidebar" id="mgrSidebar">
        <button class="mgr-side-toggle"
          onclick="document.getElementById('mgrSidebar').classList.toggle('expanded')">☰</button>
        <div class="mgr-side-logo"><strong>α</strong><span>alfaprosys</span></div>
        <div class="mgr-side-nav">${MGR_NAV.map(n => navLink(n)).join('')}</div>
        <div class="mgr-side-spacer"></div>
        <a class="mgr-side-link danger" href="index.html" title="خروج">
          <span class="mgr-side-ic">🚪</span><span class="mgr-side-lb">خروج</span>
        </a>
      </nav>
      <div class="mgr-content-panel">
        <div id="customersInner">${body}</div>
      </div>
    </div>
    <div class="mgr-nav-scrim" id="mgrNavScrim" onclick="closeNav()"></div>
    <button class="mgr-fab" onclick="toggleNav()">☰</button>
    <nav class="mgr-mobile-nav" id="mgrMobileNav">
      <div class="mgr-mobile-nav-head">
        <strong>قائمة الإدارة</strong>
        <button onclick="closeNav()">✕</button>
      </div>
      <div class="mgr-mobile-nav-grid">
        ${MGR_NAV.map(n => navLink(n, true)).join('')}
        <a class="mgr-mobile-nav-link danger" href="index.html">
          <span>🚪</span><small>خروج</small>
        </a>
      </div>
    </nav>`;
}

/* ================================================================
   حالة الفلاتر
   ================================================================ */
let searchTerm   = '';
let filterType   = 'all';  // all | regular | contract | vip | delivery
let detailOpenId = null;   // العميل المفتوح تفاصيله على الجوال

/* ================================================================
   بناء المحتوى
   ================================================================ */
let loyaltyView = false;
function setLoyaltyView(v){ loyaltyView = v; rebuildBody(); }

function buildBody() {
  if (ROLE === 'manager' && loyaltyView) return renderLoyaltyPage();
  const totals = {
    all: customers.length,
    regular:  customers.filter(c => c.type === 'regular').length,
    contract: customers.filter(c => c.type === 'contract').length,
    vip:      customers.filter(c => c.type === 'vip').length,
    delivery: customers.filter(c => c.type === 'delivery').length,
  };

  // إجمالي الذمم
  const totalCredit  = customers.filter(c => c.type === 'contract')
    .reduce((s, c) => s + (c.credit_balance || 0), 0);
  const overLimit    = customers.filter(c =>
    c.type === 'contract' && (c.credit_balance || 0) > (c.credit_limit || Infinity)).length;

  return `
    <!-- رأس الصفحة -->
    <div class="${ROLE === 'manager' ? 'mgr-page-header' : 'cust-inner-header'}">
      <div>
        ${ROLE === 'manager'
          ? `<div class="mgr-page-brand">alfaprosys</div>
             <div class="mgr-page-title">👥 العملاء</div>`
          : `<div class="cust-page-title">👥 العملاء</div>`}
      </div>
      <div style="display:flex;gap:8px;">
        ${ROLE === 'manager' ? `
        <button class="mgr-btn sm ${loyaltyView ? 'navy' : ''}" type="button" onclick="setLoyaltyView(${loyaltyView ? 'false' : 'true'})">
          ${loyaltyView ? '↩ رجوع للعملاء' : '🎁 الولاء'}
        </button>` : ''}
        <button class="${ROLE === 'manager' ? 'mgr-btn navy sm' : 'add-customer-btn'}"
          type="button" onclick="openAddModal()">+ زبون جديد</button>
      </div>
    </div>

    <!-- ملخص الذمم (للمدير فقط) -->
    ${ROLE === 'manager' ? `
    <div class="mgr-stats-grid" style="margin-bottom:12px;">
      <div class="mgr-stat-card">
        <div class="mgr-stat-lbl">إجمالي العملاء</div>
        <div class="mgr-stat-val">${totals.all}</div>
        <div class="mgr-stat-sub">زبون مسجل</div>
      </div>
      <div class="mgr-stat-card gold">
        <div class="mgr-stat-lbl">عملاء العقود</div>
        <div class="mgr-stat-val">${totals.contract}</div>
        <div class="mgr-stat-sub">📋 عقد نشط</div>
      </div>
      <div class="mgr-stat-card red">
        <div class="mgr-stat-lbl">إجمالي الذمم</div>
        <div class="mgr-stat-val">${fmtNum(totalCredit)}</div>
        <div class="mgr-stat-sub">ل.س مستحقة</div>
      </div>
      ${overLimit > 0 ? `
      <div class="mgr-stat-card red">
        <div class="mgr-stat-lbl">تجاوز السقف</div>
        <div class="mgr-stat-val">${overLimit}</div>
        <div class="mgr-stat-sub">⚠️ عميل تجاوز حده</div>
      </div>` : `
      <div class="mgr-stat-card green">
        <div class="mgr-stat-lbl">حالة الذمم</div>
        <div class="mgr-stat-val">✅</div>
        <div class="mgr-stat-sub">لا تجاوزات</div>
      </div>`}
    </div>` : ''}

    <!-- فلتر النوع -->
    <div class="cust-type-strip">
      ${[
        { key: 'all',      label: 'الكل',    icon: '👥', count: totals.all      },
        { key: 'regular',  label: 'مباشر',   icon: '👤', count: totals.regular  },
        { key: 'contract', label: 'عقد',     icon: '📋', count: totals.contract },
        { key: 'vip',      label: 'VIP',     icon: '⭐', count: totals.vip      },
        { key: 'delivery', label: 'توصيل',   icon: '🛵', count: totals.delivery },
      ].map(f => `
        <button class="cust-type-chip ${filterType === f.key ? 'active' : ''}"
          onclick="setFilter('${f.key}')">
          ${f.icon} ${f.label} <span>${f.count}</span>
        </button>`).join('')}
    </div>

    <!-- بحث -->
    <div class="cust-search-bar">
      <span>🔍</span>
      <input id="custSearch" type="text" inputmode="search"
        placeholder="ابحث باسم الزبون أو رقم الهاتف…"
        oninput="onCustSearch(this.value)" value="${e(searchTerm)}" />
      <button id="custSearchClear" onclick="clearCustSearch()"
        style="display:${searchTerm ? '' : 'none'};">✕</button>
    </div>

    <!-- القائمة -->
    <div id="custListWrap">${renderList(filteredList())}</div>
  `;
}

/* ─── الفلتر والبحث ─── */
function filteredList() {
  let list = customers;
  if (filterType !== 'all') list = list.filter(c => c.type === filterType);
  if (searchTerm) {
    const q = searchTerm.toLowerCase();
    list = list.filter(c =>
      c.name?.toLowerCase().includes(q) ||
      c.phone?.includes(q) ||
      c.whatsapp?.includes(q) ||
      c.address?.toLowerCase().includes(q)
    );
  }
  return list;
}

function setFilter(t) {
  filterType = t;
  document.querySelectorAll('.cust-type-chip').forEach(b =>
    b.classList.toggle('active', b.textContent.trim().startsWith(
      t === 'all' ? '👥' :
      t === 'regular' ? '👤' :
      t === 'contract' ? '📋' :
      t === 'vip' ? '⭐' : '🛵'))
  );
  // إعادة رسم الفلاتر بشكل صحيح
  rebuildBody();
}
function onCustSearch(val) {
  searchTerm = val.trim().toLowerCase();
  document.getElementById('custSearchClear').style.display = searchTerm ? '' : 'none';
  document.getElementById('custListWrap').innerHTML = renderList(filteredList());
}
function clearCustSearch() {
  searchTerm = '';
  const inp = document.getElementById('custSearch');
  if (inp) inp.value = '';
  document.getElementById('custSearchClear').style.display = 'none';
  document.getElementById('custListWrap').innerHTML = renderList(filteredList());
}

/* ── القائمة الرئيسية ── */
function renderList(list) {
  if (!list.length) return `
    <div class="cust-empty">لا يوجد عملاء مطابقون</div>`;

  return `
    <div class="${ROLE === 'manager' ? 'mgr-card' : 'customers-card'}" style="padding:0;overflow:hidden;">
      ${list.map(c => renderCustomerRow(c)).join('')}
    </div>`;
}

function customerSource(c){
  if (c.source) return c.source;
  if (c.type === 'contract') return '📋 عقد';
  const ph = String(c.phone || '');
  const online = ((window.DEMO_DATA.online_orders) || []).some(o => o.customer && o.customer.phone === ph);
  return online ? '🛵 أونلاين' : '🖥️ POS';
}
function renderCustomerRow(c) {
  const ti = typeInfo(c.type);
  const isContract = c.type === 'contract';
  const overLimit  = isContract && (c.credit_balance || 0) > (c.credit_limit || Infinity);
  const creditPct  = isContract && c.credit_limit
    ? Math.min(100, Math.round((c.credit_balance / c.credit_limit) * 100))
    : 0;
  const isOpen = detailOpenId === c.id;

  return `
    <div class="cust-row ${isOpen ? 'open' : ''}" id="crow_${e(c.id)}">
      <!-- الصف الرئيسي -->
      <div class="cust-row-main" onclick="toggleDetail('${e(c.id)}')">
        <div class="cust-row-avatar ${c.type}">${ti.icon}</div>
        <div class="cust-row-info">
          <div class="cust-row-name">
            ${e(c.name)}
            <span class="cust-badge ${ti.color}">${ti.label}</span>
            ${overLimit ? `<span class="cust-badge red">⚠️ تجاوز السقف</span>` : ''}
          </div>
          <div class="cust-row-sub">
            <span dir="ltr">${e(c.phone || '—')}</span>
            <span class="cust-badge muted">${customerSource(c)}</span>
            ${isContract ? `
              <span class="cust-credit-mini ${overLimit ? 'over' : ''}">
                ذمة: ${fmtNum(c.credit_balance || 0)} / ${fmtNum(c.credit_limit || 0)} ل.س
              </span>` : ''}
          </div>
        </div>
        <div class="cust-row-chevron ${isOpen ? 'open' : ''}">›</div>
      </div>

      <!-- تفاصيل قابلة للطي -->
      <div class="cust-row-detail ${isOpen ? 'open' : ''}">
        ${renderCustomerDetail(c)}
      </div>
    </div>`;
}

function renderCustomerDetail(c) {
  const isContract = c.type === 'contract';
  const ti = typeInfo(c.type);

  let contractSection = '';
  if (isContract) {
    const balance  = c.credit_balance || 0;
    const limit    = c.credit_limit   || 0;
    const pct      = limit ? Math.min(100, Math.round(balance / limit * 100)) : 0;
    const overLimit = balance > limit && limit > 0;
    const payments = c.payments || [];
    const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0);

    contractSection = `
      <!-- ── قسم العقد والذمم ── -->
      <div class="cust-contract-block">
        <div class="cust-contract-title">📋 العقد والذمم</div>

        <!-- شريط الذمة -->
        <div class="cust-credit-bar-wrap">
          <div class="cust-credit-labels">
            <span>الذمة الحالية</span>
            <span class="${overLimit ? 'cust-credit-over' : ''}">
              ${fmtNum(balance)} / ${fmtNum(limit)} ل.س (${pct}%)
            </span>
          </div>
          <div class="cust-credit-bar">
            <div class="cust-credit-fill ${overLimit ? 'over' : pct >= 75 ? 'warn' : ''}"
              style="width:${pct}%"></div>
          </div>
          ${overLimit ? `
          <div class="cust-credit-alert">
            ⚠️ تجاوز سقف الذمة بمقدار ${fmtNum(balance - limit)} ل.س
          </div>` : ''}
        </div>

        <!-- أرقام سريعة -->
        <div class="cust-credit-grid">
          <div class="cust-credit-cell">
            <div class="cust-credit-val">${fmtNum(limit)}</div>
            <div class="cust-credit-lbl">سقف الذمة (ل.س)</div>
          </div>
          <div class="cust-credit-cell">
            <div class="cust-credit-val ${overLimit ? 'red' : ''}">${fmtNum(balance)}</div>
            <div class="cust-credit-lbl">الذمة الحالية</div>
          </div>
          <div class="cust-credit-cell">
            <div class="cust-credit-val green">${fmtNum(Math.max(0, limit - balance))}</div>
            <div class="cust-credit-lbl">المتاح للاستخدام</div>
          </div>
          <div class="cust-credit-cell">
            <div class="cust-credit-val">${fmtNum(totalPaid)}</div>
            <div class="cust-credit-lbl">إجمالي المدفوع</div>
          </div>
        </div>

        ${c.next_due_date ? `
        <div class="cust-due-row">
          📅 موعد الدفعة القادمة: <strong>${e(c.next_due_date)}</strong>
        </div>` : ''}

        <!-- جدول الدفعات -->
        <div class="cust-payments-head">
          <div class="cust-contract-title" style="margin:0;">💳 سجل الدفعات</div>
          ${ROLE === 'manager'
            ? `<button class="cust-add-payment-btn" onclick="event.stopPropagation();openAddPayment('${e(c.id)}')">+ إضافة دفعة</button>`
            : ''}
        </div>
        ${payments.length ? `
        <div class="cust-payments-list">
          ${payments.map(p => `
            <div class="cust-payment-row">
              <div class="cust-payment-info">
                <span class="cust-payment-date">📅 ${e(p.date)}</span>
                ${p.note ? `<span class="cust-payment-note">${e(p.note)}</span>` : ''}
              </div>
              <div class="cust-payment-amount">+ ${fmtNum(p.amount)} ل.س</div>
              ${ROLE === 'manager' ? `
                <button class="cust-action-btn danger sm"
                  onclick="event.stopPropagation();deletePayment('${e(c.id)}','${e(p.id)}')">🗑</button>
              ` : ''}
            </div>`).join('')}
        </div>` : `
        <div class="cust-no-payments">لا توجد دفعات مسجلة</div>`}
      </div>`;
  }

  return `
    <div class="cust-detail-inner">
      <!-- معلومات أساسية -->
      <div class="cust-detail-fields">
        <div class="cust-detail-field">
          <span>النوع</span>
          <strong><span class="cust-badge ${typeInfo(c.type).color}">${ti.icon} ${ti.label}</span></strong>
        </div>
        <div class="cust-detail-field">
          <span>رقم الهاتف</span>
          <strong dir="ltr">${e(c.phone || '—')}</strong>
        </div>
        ${c.whatsapp ? `<div class="cust-detail-field">
          <span>واتساب</span>
          <strong dir="ltr">${e(c.whatsapp)}</strong>
        </div>` : ''}
        ${c.address ? `<div class="cust-detail-field">
          <span>العنوان</span>
          <strong>${e(c.address)}</strong>
        </div>` : ''}
        ${c.notes ? `<div class="cust-detail-field full">
          <span>ملاحظات</span>
          <strong>${e(c.notes)}</strong>
        </div>` : ''}
      </div>

      ${contractSection}

      <!-- أزرار الإجراءات -->
      <div class="cust-detail-actions">
        <button class="cust-detail-btn primary" onclick="event.stopPropagation();openEditModal('${e(c.id)}')">
          ✏️ تعديل
        </button>
        ${ROLE === 'manager' ? `
        <button class="cust-detail-btn danger" onclick="event.stopPropagation();deleteCustomer('${e(c.id)}')">
          🗑 حذف
        </button>` : ''}
      </div>
    </div>`;
}

/* ================================================================
   toggle التفاصيل (accordion)
   ================================================================ */
function toggleDetail(id) {
  detailOpenId = detailOpenId === id ? null : id;
  document.getElementById('custListWrap').innerHTML = renderList(filteredList());
}

/* ================================================================
   مودال إضافة / تعديل العميل
   ================================================================ */
let editingId = null;

function openAddModal() {
  editingId = null;
  fillModal(null);
  showModal();
}
function openEditModal(id) {
  const c = customers.find(x => x.id === id);
  if (!c) return;
  editingId = id;
  fillModal(c);
  showModal();
}
function showModal() {
  document.getElementById('custModalScrim')?.classList.add('show');
  document.getElementById('custModal')?.classList.add('show');
  setTimeout(() => document.getElementById('custModalName')?.focus(), 60);
}
function closeCustomerModal() {
  document.getElementById('custModalScrim')?.classList.remove('show');
  document.getElementById('custModal')?.classList.remove('show');
}
function fillModal(c) {
  const isEdit = !!c;
  document.getElementById('custModalTitle').textContent = isEdit
    ? 'تعديل بيانات الزبون' : '+ إضافة زبون جديد';
  document.getElementById('custModalName').value       = c?.name     || '';
  document.getElementById('custModalPhone').value      = c?.phone    || '';
  document.getElementById('custModalWhatsapp').value   = c?.whatsapp || '';
  document.getElementById('custModalAddress').value    = c?.address  || '';
  document.getElementById('custModalNotes').value      = c?.notes    || '';
  document.getElementById('custModalType').value       = c?.type     || 'regular';
  onTypeChange(c?.type || 'regular', c);
}
function onTypeChange(type, c = null) {
  const contractFields = document.getElementById('custContractFields');
  if (!contractFields) return;
  contractFields.style.display = type === 'contract' ? '' : 'none';
  if (type === 'contract' && c) {
    document.getElementById('custModalCreditLimit').value   = c.credit_limit   || '';
    document.getElementById('custModalCreditBalance').value = c.credit_balance  || '';
    document.getElementById('custModalNextDue').value       = c.next_due_date   || '';
  }
}
function saveCustomer() {
  const name     = document.getElementById('custModalName').value.trim();
  const phone    = document.getElementById('custModalPhone').value.trim();
  const whatsapp = document.getElementById('custModalWhatsapp').value.trim();
  const address  = document.getElementById('custModalAddress').value.trim();
  const notes    = document.getElementById('custModalNotes').value.trim();
  const type     = document.getElementById('custModalType').value;

  if (!name || !phone) { showToast('الاسم ورقم الهاتف مطلوبان', '⚠️'); return; }

  const base = { name, phone, whatsapp, address, notes, type };

  if (type === 'contract') {
    base.credit_limit   = Number(document.getElementById('custModalCreditLimit').value)   || 0;
    base.credit_balance = Number(document.getElementById('custModalCreditBalance').value) || 0;
    base.next_due_date  = document.getElementById('custModalNextDue').value || '';
  }

  if (editingId) {
    const idx = customers.findIndex(c => c.id === editingId);
    if (idx > -1) {
      const old = customers[idx];
      customers[idx] = {
        ...old, ...base,
        payments: old.payments || [],
        contract_price_list: old.contract_price_list || '',
      };
    }
    showToast('تم تحديث بيانات الزبون', '✏️');
  } else {
    customers.unshift({ id: 'cus_' + Date.now(), ...base, payments: [] });
    showToast('تمت إضافة الزبون', '👥');
  }
  DATA.customers = customers;
  closeCustomerModal();
  rebuildBody();
}
function deleteCustomer(id) {
  if (!confirm('حذف هذا الزبون نهائياً؟')) return;
  customers = customers.filter(c => c.id !== id);
  DATA.customers = customers;
  detailOpenId = null;
  showToast('تم حذف الزبون', '🗑');
  rebuildBody();
}

/* ================================================================
   مودال إضافة دفعة
   ================================================================ */
let paymentForId = null;
function openAddPayment(custId) {
  paymentForId = custId;
  document.getElementById('payModalDate').value   = new Date().toISOString().split('T')[0];
  document.getElementById('payModalAmount').value = '';
  document.getElementById('payModalNote').value   = '';
  document.getElementById('payModalScrim')?.classList.add('show');
  document.getElementById('payModal')?.classList.add('show');
  setTimeout(() => document.getElementById('payModalAmount')?.focus(), 60);
}
function closePayModal() {
  document.getElementById('payModalScrim')?.classList.remove('show');
  document.getElementById('payModal')?.classList.remove('show');
}
function savePayment() {
  const amount = Number(document.getElementById('payModalAmount').value);
  const date   = document.getElementById('payModalDate').value;
  const note   = document.getElementById('payModalNote').value.trim();
  if (!amount || !date) { showToast('المبلغ والتاريخ مطلوبان', '⚠️'); return; }

  const idx = customers.findIndex(c => c.id === paymentForId);
  if (idx < 0) return;
  if (!customers[idx].payments) customers[idx].payments = [];
  customers[idx].payments.unshift({
    id: 'pay_' + Date.now(), date, amount, note
  });
  // اخصم من الذمة
  customers[idx].credit_balance = Math.max(0,
    (customers[idx].credit_balance || 0) - amount);
  DATA.customers = customers;
  closePayModal();
  showToast('تمت إضافة الدفعة وتحديث الذمة', '💳');
  rebuildBody();
}
function deletePayment(custId, payId) {
  if (!confirm('حذف هذه الدفعة؟')) return;
  const idx = customers.findIndex(c => c.id === custId);
  if (idx < 0) return;
  const pay = (customers[idx].payments || []).find(p => p.id === payId);
  if (pay) {
    customers[idx].payments = customers[idx].payments.filter(p => p.id !== payId);
    // أعد الذمة
    customers[idx].credit_balance = (customers[idx].credit_balance || 0) + pay.amount;
  }
  DATA.customers = customers;
  showToast('تم حذف الدفعة', '🗑');
  rebuildBody();
}

/* ================================================================
   إعادة البناء الكاملة
   ================================================================ */
function rebuildBody() {
  const body = buildBody();
  if (ROLE === 'manager') {
    document.getElementById('customersInner').innerHTML = body;
  } else {
    document.querySelector('.customers-content').innerHTML = body;
  }
}

/* ================================================================
   المودالات — HTML ثابت يُحقن مرة واحدة
   ================================================================ */
function modalsHTML() {
  return `
    <!-- مودال إضافة/تعديل العميل -->
    <div class="cust-modal-scrim" id="custModalScrim" onclick="closeCustomerModal()"></div>
    <div class="cust-modal" id="custModal" role="dialog">
      <div class="cust-modal-head">
        <span id="custModalTitle">إضافة زبون</span>
        <button onclick="closeCustomerModal()">✕</button>
      </div>
      <div class="cust-modal-body">
        <!-- النوع -->
        <label class="cust-field-label">نوع العميل
          <select id="custModalType" class="cust-field-input"
            onchange="onTypeChange(this.value)">
            <option value="regular">👤 مباشر</option>
            <option value="contract">📋 عقد</option>
            <option value="vip">⭐ VIP</option>
            <option value="delivery">🛵 توصيل</option>
          </select>
        </label>
        <!-- الحقول الأساسية -->
        <div class="cust-form-grid">
          <label class="cust-field-label">الاسم
            <input id="custModalName" class="cust-field-input" type="text"
              placeholder="اسم الزبون الكامل" />
          </label>
          <label class="cust-field-label">رقم الهاتف
            <input id="custModalPhone" class="cust-field-input" type="tel"
              inputmode="tel" placeholder="09xxxxxxxx" />
          </label>
          <label class="cust-field-label">رقم الواتساب (اختياري)
            <input id="custModalWhatsapp" class="cust-field-input" type="tel"
              inputmode="tel" placeholder="اختياري" />
          </label>
          <label class="cust-field-label">العنوان
            <input id="custModalAddress" class="cust-field-input" type="text"
              placeholder="العنوان الكامل" />
          </label>
          <label class="cust-field-label full">ملاحظات
            <input id="custModalNotes" class="cust-field-input" type="text"
              placeholder="ملاحظات إضافية (اختياري)" />
          </label>
        </div>
        <!-- حقول العقد — تظهر فقط عند اختيار "عقد" -->
        <div id="custContractFields" style="display:none;">
          <div class="cust-contract-divider">📋 بيانات العقد والذمة</div>
          <div class="cust-form-grid">
            <label class="cust-field-label">سقف الذمة (ل.س)
              <input id="custModalCreditLimit" class="cust-field-input" type="number"
                inputmode="numeric" placeholder="مثال: 2000000" />
            </label>
            <label class="cust-field-label">الذمة الحالية (ل.س)
              <input id="custModalCreditBalance" class="cust-field-input" type="number"
                inputmode="numeric" placeholder="0" />
            </label>
            <label class="cust-field-label">موعد الدفعة القادمة
              <input id="custModalNextDue" class="cust-field-input" type="date" />
            </label>
          </div>
        </div>
      </div>
      <div class="cust-modal-footer">
        <button class="mgr-btn navy" onclick="saveCustomer()">حفظ</button>
        <button class="mgr-btn outline" onclick="closeCustomerModal()">إلغاء</button>
      </div>
    </div>

    <!-- مودال إضافة دفعة -->
    <div class="cust-modal-scrim" id="payModalScrim" onclick="closePayModal()"></div>
    <div class="cust-modal" id="payModal" role="dialog">
      <div class="cust-modal-head">
        <span>💳 تسجيل دفعة</span>
        <button onclick="closePayModal()">✕</button>
      </div>
      <div class="cust-modal-body">
        <div class="cust-form-grid">
          <label class="cust-field-label full">المبلغ (ل.س)
            <input id="payModalAmount" class="cust-field-input" type="number"
              inputmode="numeric" placeholder="مثال: 500000" />
          </label>
          <label class="cust-field-label">التاريخ
            <input id="payModalDate" class="cust-field-input" type="date" />
          </label>
          <label class="cust-field-label">ملاحظة (اختياري)
            <input id="payModalNote" class="cust-field-input" type="text"
              placeholder="مثال: دفعة أول الشهر" />
          </label>
        </div>
      </div>
      <div class="cust-modal-footer">
        <button class="mgr-btn navy" onclick="savePayment()">تسجيل الدفعة</button>
        <button class="mgr-btn outline" onclick="closePayModal()">إلغاء</button>
      </div>
    </div>
  `;
}

/* ================================================================
   التهيئة
   ================================================================ */
function renderCustomers() {
  const body  = buildBody();
  const appEl = document.getElementById('customersApp');

  if (ROLE === 'manager') {
    appEl.classList.add('mgr-page-shell');
    appEl.innerHTML = renderManagerShell(body) + modalsHTML();
  } else {
    appEl.innerHTML = renderCashierShell(body) + modalsHTML();
  }
}

renderCustomers();

/* ================================================================
   🎁 الولاء — نقاط ومستويات ومكافآت (تبويب داخل شاشة العملاء)
   ================================================================ */
function renderLoyaltyPage(){
  const L = window.DEMO_DATA.loyalty;
  const rows = customers.map(cu => {
    const pts = Loyalty.points(cu);
    const earned = Loyalty.earned(cu);
    const lv = Loyalty.level(pts);
    return { cu, pts, earned, lv };
  }).sort((a, b) => b.pts - a.pts);
  const withPts = rows.filter(r => r.pts > 0);
  const totalPts = rows.reduce((s, r) => s + r.pts, 0);
  const redeems = (DEMO_DATA.loyalty_ledger || []).filter(l => l.type === 'redeem').length;

  const chip = (lbl, val, sub, cls='') =>
    `<div class="mgr-stat-card ${cls}"><div class="mgr-stat-lbl">${lbl}</div><div class="mgr-stat-val">${val}</div><div class="mgr-stat-sub">${sub}</div></div>`;

  return `
  <div class="mgr-stats-grid" style="margin-bottom:12px;">
    ${chip('عملاء بنقاط', withPts.length, `من ${customers.length} عميل`)}
    ${chip('إجمالي النقاط القائمة', fmtNum(totalPts), 'قابلة للاستبدال', 'gold')}
    ${chip('استبدالات', redeems, 'مكافآت مصروفة')}
    ${chip('أعلى عميل', withPts[0] ? withPts[0].cu.name.split(' ')[0] : '—', withPts[0] ? withPts[0].pts + ' نقطة · ' + withPts[0].lv.icon : 'لا نقاط بعد', '')}
  </div>

  <!-- إدارة المكافآت -->
  <div class="mgr-card" style="margin-bottom:12px;padding:14px;">
    <div class="mgr-card-title" style="margin-bottom:10px;">🎁 المكافآت وقاعدة النقاط</div>
    <div class="loy-settings-row">
      <label>كل <input id="loyRate" type="number" min="0.1" step="0.1" value="${L.pointsPer1000}" style="width:64px;"> نقطة لكل 1,000 ل.س مشتريات</label>
      <button class="set-btn" onclick="saveLoyRate()">حفظ القاعدة</button>
    </div>
    <div class="set-rows" id="loyRewards">
      ${(L.rewards || []).map(r => `
      <div class="set-row offer-admin-row">
        <div class="offer-admin-info">
          <strong>${r.kind === 'coupon' ? '🎟️' : '🍔'} ${e(r.title)}</strong>
          <small>${r.cost} نقطة${r.kind === 'coupon' ? ' · كوبون خصم ' + fmtNum(r.value) + ' ل.س' : r.value ? ' · ' + e(r.value) : ''}</small>
        </div>
        <button class="set-del" onclick="deleteReward('${e(r.id)}')" title="حذف">🗑️</button>
      </div>`).join('') || '<span class="set-empty">لا مكافآت — أضف أول مكافأة</span>'}
    </div>
    <div class="set-add-row" style="margin-top:8px;">
      <input id="newRwdTitle" placeholder="اسم المكافأة (مثال: عصير مجاني)">
      <input id="newRwdCost" type="number" placeholder="كلفتها بالنقاط" style="max-width:130px;">
      <select id="newRwdKind" style="max-width:170px;">
        <option value="item">🍔 صنف مجاني</option>
        <option value="coupon">🎟️ كوبون خصم (ل.س)</option>
      </select>
      <input id="newRwdValue" placeholder="التفصيل أو قيمة الكوبون" style="max-width:190px;">
      <button class="set-btn primary" onclick="addReward()">+ مكافأة</button>
    </div>
  </div>

  <!-- نقاط العملاء -->
  <div class="mgr-card" style="padding:0;overflow:hidden;">
    <div class="mgr-card-title" style="padding:14px 14px 8px;">🥇 نقاط العملاء — مرتبة تنازلياً</div>
    <div class="sh-table-wrap">
      <table class="sh-table">
        <thead><tr><th>العميل</th><th>المستوى</th><th>من المشتريات</th><th>الرصيد الحالي</th><th>إضافة / استبدال</th></tr></thead>
        <tbody>
          ${rows.map(r => `
          <tr>
            <td class="debt-client"><strong>${e(r.cu.name)}</strong><small>${e(r.cu.phone || '')}</small></td>
            <td><span class="loy-badge ${r.lv.cls}">${r.lv.icon} ${r.lv.label}</span></td>
            <td class="buy-num">${fmtNum(r.earned)}</td>
            <td class="buy-num buy-sug">${fmtNum(r.pts)}</td>
            <td>
              <div class="loy-actions">
                <input type="number" min="1" placeholder="نقاط" id="loyin_${e(r.cu.id)}" style="width:70px;">
                <button class="loy-mini" onclick="loyAddPoints('${e(r.cu.id)}')">＋</button>
                <select id="loyrwd_${e(r.cu.id)}" style="max-width:150px;">
                  ${(DEMO_DATA.loyalty.rewards || []).map(rw => `<option value="${e(rw.id)}">${e(rw.title)} (${rw.cost})</option>`).join('')}
                </select>
                <button class="loy-mini gold" onclick="loyRedeem('${e(r.cu.id)}')">🎁</button>
              </div>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>

  <!-- آخر حركات النقاط -->
  ${(DEMO_DATA.loyalty_ledger || []).length ? `
  <div class="mgr-card" style="margin-top:12px;padding:14px;">
    <div class="mgr-card-title" style="margin-bottom:8px;">📜 آخر حركات النقاط</div>
    ${(DEMO_DATA.loyalty_ledger || []).slice(0, 8).map(l => {
      const cu = customers.find(x => x.id === l.customer_id);
      const t = { manual_add: '＋ إضافة يدوية', manual_sub: '− خصم يدوي', redeem: '🎁 استبدال' }[l.type] || l.type;
      return `<div class="loy-ledger-row"><span>${t} · ${e(cu ? cu.name : l.customer_id)}${l.note ? ' — ' + e(l.note) : ''}</span><small>${e(l.at.replace('T', ' · '))} · ${l.pts} نقطة</small></div>`;
    }).join('')}
  </div>` : ''}`;
}

function saveLoyRate(){
  const v = Number(document.getElementById('loyRate').value);
  if (!(v > 0)) return showToast('أدخل قاعدة صحيحة أكبر من صفر', '⚠️');
  DEMO_DATA.loyalty.pointsPer1000 = v;
  window.AlfaAudit && AlfaAudit.log('settings', 'تعديل قاعدة النقاط', `نقطة لكل 1,000 ل.س × ${v}`, 'المدير');
  showToast('حُفظت قاعدة النقاط — تُحسب فوراً على الجدول', '🎁');
  rebuildBody();
}
function addReward(){
  const title = document.getElementById('newRwdTitle').value.trim();
  const cost = Number(document.getElementById('newRwdCost').value);
  const kind = document.getElementById('newRwdKind').value;
  let value = document.getElementById('newRwdValue').value.trim();
  if (!title || !(cost > 0)) return showToast('أدخل اسم المكافأة وكلفتها بالنقاط', '⚠️');
  if (kind === 'coupon') value = Number(value) || 0;
  DEMO_DATA.loyalty.rewards.push({ id: 'rwd_' + Date.now(), title, cost, kind, value });
  window.AlfaAudit && AlfaAudit.log('settings', 'إضافة مكافأة ولاء', `${title} بـ ${cost} نقطة`, 'المدير');
  showToast('أُضيفت المكافأة', '🎁');
  rebuildBody();
}
function deleteReward(id){
  const r = (DEMO_DATA.loyalty.rewards || []).find(x => x.id === id);
  DEMO_DATA.loyalty.rewards = (DEMO_DATA.loyalty.rewards || []).filter(x => x.id !== id);
  window.AlfaAudit && AlfaAudit.log('settings', 'حذف مكافأة ولاء', r ? r.title : id, 'المدير');
  showToast('حُذفت المكافأة', '🗑️');
  rebuildBody();
}
function loyAddPoints(cid){
  const el = document.getElementById('loyin_' + cid);
  const pts = Number(el.value);
  if (!(pts > 0)) return showToast('أدخل عدد النقاط', '⚠️');
  Loyalty.add(cid, 'manual_add', pts, 'إضافة يدوية من الإدارة');
  const cu = customers.find(x => x.id === cid);
  window.AlfaAudit && AlfaAudit.log('customers', 'إضافة نقاط ولاء', `${cu ? cu.name : cid}: +${pts} نقطة`, 'المدير');
  showToast(`أُضيفت ${pts} نقطة`, '＋');
  rebuildBody();
}
function loyRedeem(cid){
  const sel = document.getElementById('loyrwd_' + cid);
  const rwd = (DEMO_DATA.loyalty.rewards || []).find(x => x.id === (sel && sel.value));
  if (!rwd) return showToast('لا مكافآت معرّفة — أضف واحدة أولاً', '⚠️');
  const cu = customers.find(x => x.id === cid);
  const pts = Loyalty.points(cu);
  if (pts < rwd.cost) return showToast(`نقاط ${cu.name} لا تكفي: ${pts} من ${rwd.cost} المطلوبة`, '⚠️');
  Loyalty.add(cid, 'redeem', rwd.cost, `استبدال: ${rwd.title}`);
  window.AlfaAudit && AlfaAudit.log('customers', 'استبدال مكافأة ولاء', `${cu.name}: ${rwd.title} بـ ${rwd.cost} نقطة`, 'المدير');
  showToast(`استُبدلت «${rwd.title}» — أُنقصت ${rwd.cost} نقطة`, '🎁');
  rebuildBody();
}
