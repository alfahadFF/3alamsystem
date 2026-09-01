/* ================================================================
   expenditures.js — الصادرات (مصاريف + مشتريات) — alfaprosys
   ================================================================ */

const DATA = window.DEMO_DATA;

/* ── أدوات ── */
function fmtNum(n) { return Number(n || 0).toLocaleString('en-US'); }
function fmt(n)    { return `${fmtNum(n)} ل.س`; }
function e(v) {
  return String(v ?? '').replace(/[&<>'"]/g, c =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[c])
  );
}
function nowTime() {
  return new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
}
function showToast(msg, icon = '✅') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.innerHTML = `<span>${icon}</span><span>${e(msg)}</span>`;
  t.classList.add('show');
  clearTimeout(window._toast);
  window._toast = setTimeout(() => t.classList.remove('show'), 1800);
}

/* ── التنقل المشترك ── */
const MGR_NAV = window.AlfaNav.MGR_NAV;
const CURRENT = 'expenditures';
const navLink = window.AlfaNav.linker(CURRENT);


/* ================================================================
   البيانات — تخزين مؤقت في الذاكرة (لاحقاً Supabase)
   ================================================================ */
const RAW_MATERIAL_TREE = [
  { id:'veg',    name:'خضار ومخللات',       icon:'🍅', items:['بطاطا','بندورة','خيار','ثوم يابس','بصل يابس','خس بلدي','مخلل خيار','مخلل لفت'] },
  { id:'meat',   name:'لحوم ودواجن',         icon:'🥩', items:['صدر دجاج مسحب','دجاج كامل للبروستد','فخاذ دجاج','لحم عجل مفروم','لحم هبرة غنم','لية غنم'] },
  { id:'bakery', name:'مخبوزات',             icon:'🥖', items:['خبز صاج / شراك','خبز سياحي','سمون شاورما كبير','سمون صغير','خبز برغر بالسمسم','خبز تورتيلا'] },
  { id:'spices', name:'بهارات وتتبيلات',     icon:'🧂', items:['تتبيلة شاورما دجاج','خلطة بروستد','تتبيلة شاورما لحم','بهار بطاطا','ثوم بودرة','ملح'] },
  { id:'oils',   name:'زيوت وأجبان ومعلبات', icon:'🧀', items:['زيت قلي','طحينة','مايونيز سطل 10كغ','كتشب غالون','جبنة موزاريلا','جبنة شيدر صوص'] },
  { id:'pack',   name:'تغليف واستهلاكي',     icon:'📦', items:['رولات قصدير وألمنيوم','ورق لف ساندويش','علب كرتون بروستد','أكياس نايلون مطبوعة','علب ثومية'] },
];

const EMPLOYEES = DATA.demoEmployees || [
  { id:'emp1', name:'أحمد العلي',   job:'معلم شاورما أول' },
  { id:'emp2', name:'سامر قاسم',    job:'شيف بروستد'       },
  { id:'emp3', name:'محمود عثمان',  job:'كاشير مسائي'      },
  { id:'emp4', name:'أبو راتب',     job:'كابتن توصيل'      },
  { id:'emp5', name:'بلال حسن',     job:'مساعد ونظافة'     },
];

const EXP_TYPES = [
  { key:'salary',      label:'رواتب وسلف',    icon:'👤' },
  { key:'fuel',        label:'محروقات',        icon:'⛽' },
  { key:'maintenance', label:'صيانة',          icon:'🔧' },
  { key:'bills',       label:'فواتير',         icon:'📄' },
  { key:'other',       label:'أخرى',           icon:'📌' },
];

/* بيانات تجريبية */
let purchases = [
  { id:1, item:'بطاطا',                   cat:'خضار ومخللات', unit:'شوال',  packages:2, weight:60, unitCost:2833,  total:170000, time:'09:30' },
  { id:2, item:'صدر دجاج مسحب',           cat:'لحوم ودواجن',  unit:'كرتون', packages:1, weight:15, unitCost:21333, total:320000, time:'10:15' },
  { id:3, item:'خبز صاج / شراك',          cat:'مخبوزات',      unit:'ربطة',  packages:20,weight:20, unitCost:3500,  total:70000,  time:'11:00' },
];
let expenses = [
  { id:1, type:'رواتب وسلف', icon:'👤', title:'سلفة على الراتب — أحمد العلي (معلم شاورما أول)', amount:50000,  time:'11:15' },
  { id:2, type:'محروقات',    icon:'⛽', title:'مازوت للمولدة — 20 لتر',                           amount:150000, time:'12:30' },
];

/* ── حالة UI ── */
let activePanel  = null;  // null | 'purchases' | 'expenses'
let activeModal  = null;  // null | 'addPurchase' | 'addExpense'
let navOpen      = false;

/* ── temp state للنماذج ── */
let purCatIdx   = 0;
let purItemVal  = '';
let expTypeKey  = 'salary';

/* ================================================================
   البناء الرئيسي
   ================================================================ */
function renderApp() {
  document.getElementById('expApp').innerHTML = `
    <div class="mgr-layout">

      <!-- Sidebar ديسكتوب -->
      <nav class="mgr-sidebar" id="mgrSidebar">
        <button class="mgr-side-toggle" onclick="document.getElementById('mgrSidebar').classList.toggle('expanded')">☰</button>
        <div class="mgr-side-logo"><strong>α</strong><span>alfaprosys</span></div>
        <div class="mgr-side-nav">${MGR_NAV.map(n => navLink(n)).join('')}</div>
        <div class="mgr-side-spacer"></div>
        <a class="mgr-side-link danger" href="index.html" title="خروج">
          <span class="mgr-side-ic">🚪</span><span class="mgr-side-lb">خروج</span>
        </a>
      </nav>

      <!-- المحتوى -->
      <div class="mgr-content-panel">
        <div id="expContent"></div>
      </div>
    </div>

    <!-- Scrim -->
    <div class="mgr-nav-scrim" id="mgrNavScrim" onclick="closeNav()"></div>

    <!-- FAB -->
    <button class="mgr-fab" onclick="toggleNav()">☰</button>

    <!-- Mobile Nav -->
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
    </nav>

    <!-- مودال إضافة مشتريات -->
    <div class="exp-modal-scrim" id="purModalScrim" onclick="closeModal('purchase')"></div>
    <div class="exp-modal" id="purModal" role="dialog">
      <div class="exp-modal-head">
        <span>🛒 تسجيل مشتريات مواد أولية</span>
        <button onclick="closeModal('purchase')">✕</button>
      </div>
      <div class="exp-modal-body" id="purModalBody"></div>
    </div>

    <!-- مودال إضافة مصاريف -->
    <div class="exp-modal-scrim" id="expModalScrim" onclick="closeModal('expense')"></div>
    <div class="exp-modal" id="expModal" role="dialog">
      <div class="exp-modal-head">
        <span>💸 تسجيل مصروف</span>
        <button onclick="closeModal('expense')">✕</button>
      </div>
      <div class="exp-modal-body" id="expModalBody"></div>
    </div>
  `;

  renderContent();
}

/* ================================================================
   المحتوى الرئيسي
   ================================================================ */
function renderContent() {
  const purTotal = purchases.reduce((s,p) => s + p.total, 0);
  const expTotal = expenses.reduce((s,x) => s + x.amount, 0);
  const grandTotal = purTotal + expTotal;

  document.getElementById('expContent').innerHTML = `

    <!-- رأس الصفحة -->
    <div class="mgr-page-header">
      <div>
        <div class="mgr-page-brand">alfaprosys</div>
        <div class="mgr-page-title">💸 الصادرات — مصاريف ومشتريات</div>
      </div>
      <div class="exp-total-badge">${fmtNum(grandTotal)} <span>ل.س</span></div>
    </div>

    <!-- ══ اللوحتان الرئيسيتان ══ -->
    <div class="exp-panels">

      <!-- لوحة المشتريات -->
      <div class="exp-panel ${activePanel==='purchases'?'open':''}" id="purPanel">
        <div class="exp-panel-head" onclick="togglePanel('purchases')">
          <div class="exp-panel-icon-wrap purchases" style="display:none;"></div>
          <div class="exp-panel-info">
            <div class="exp-panel-label">مشتريات المواد الأولية</div>
            <div class="exp-panel-amount">${fmtNum(purTotal)} <span>ل.س</span></div>
            <div class="exp-panel-sub">${purchases.length} حركة شراء اليوم</div>
          </div>
          <div class="exp-panel-actions">
            <button class="exp-add-btn" onclick="event.stopPropagation(); openModal('purchase')">
              + إضافة
            </button>
            <span class="exp-panel-arrow ${activePanel==='purchases'?'open':''}">›</span>
          </div>
        </div>

        <!-- تفاصيل المشتريات -->
        <div class="exp-panel-body">
          ${purchases.length === 0
            ? `<div class="exp-empty">لا توجد مشتريات مسجلة</div>`
            : purchases.map((p, idx) => `
              <div class="exp-item-row">
                <div class="exp-item-main">
                  <div class="exp-item-title">${e(p.item)}</div>
                  <div class="exp-item-sub">
                    <span class="exp-item-cat">${e(p.cat)}</span>
                    <span>${p.packages} ${e(p.unit)} • ${p.weight} كغ</span>
                    <span>سعر الكغ: <strong>${fmtNum(p.unitCost)}</strong></span>
                    <span>${e(p.time)}</span>
                  </div>
                </div>
                <div class="exp-item-right">
                  <span class="exp-item-amount">${fmtNum(p.total)}</span>
                  <button class="exp-del-btn" onclick="deletePurchase(${idx})" title="حذف">✕</button>
                </div>
              </div>
            `).join('')}
          <div class="exp-panel-footer">
            <span>الإجمالي</span>
            <strong>${fmt(purTotal)}</strong>
          </div>
        </div>
      </div>

      <!-- لوحة المصاريف -->
      <div class="exp-panel ${activePanel==='expenses'?'open':''}" id="expPanel">
        <div class="exp-panel-head" onclick="togglePanel('expenses')">
          <div class="exp-panel-icon-wrap expenses">💸</div>
          <div class="exp-panel-info">
            <div class="exp-panel-label">المصاريف التشغيلية</div>
            <div class="exp-panel-amount">${fmtNum(expTotal)} <span>ل.س</span></div>
            <div class="exp-panel-sub">${expenses.length} سند مصروف اليوم</div>
          </div>
          <div class="exp-panel-actions">
            <button class="exp-add-btn expenses" onclick="event.stopPropagation(); openModal('expense')">
              + إضافة
            </button>
            <span class="exp-panel-arrow ${activePanel==='expenses'?'open':''}">›</span>
          </div>
        </div>

        <!-- تفاصيل المصاريف -->
        <div class="exp-panel-body">
          ${expenses.length === 0
            ? `<div class="exp-empty">لا توجد مصاريف مسجلة</div>`
            : expenses.map((x, idx) => `
              <div class="exp-item-row">
                <div class="exp-item-icon">${x.icon || '💸'}</div>
                <div class="exp-item-main">
                  <div class="exp-item-title">${e(x.title)}</div>
                  <div class="exp-item-sub">
                    <span class="exp-item-cat">${e(x.type)}</span>
                    <span>${e(x.time)}</span>
                  </div>
                </div>
                <div class="exp-item-right">
                  <span class="exp-item-amount expenses">${fmtNum(x.amount)}</span>
                  <button class="exp-del-btn" onclick="deleteExpense(${idx})" title="حذف">✕</button>
                </div>
              </div>
            `).join('')}
          <div class="exp-panel-footer">
            <span>الإجمالي</span>
            <strong>${fmt(expTotal)}</strong>
          </div>
        </div>
      </div>

    </div><!-- /exp-panels -->

    <!-- ══ ملخص الصادرات ══ -->
    <div class="exp-summary-card">
      <div class="exp-summary-title">📊 ملخص الصادرات اليوم</div>
      <div class="exp-summary-rows">
        <div class="exp-summary-row">
          <span>🛒 مشتريات المواد</span>
          <strong class="blue">${fmtNum(purTotal)}</strong>
        </div>
        <div class="exp-summary-row">
          <span>💸 مصاريف تشغيل</span>
          <strong class="red">${fmtNum(expTotal)}</strong>
        </div>
        <div class="exp-summary-row total-row">
          <span>إجمالي الصادرات</span>
          <strong>${fmtNum(grandTotal)}</strong>
        </div>
      </div>
    </div>
  `;
}

/* ================================================================
   toggle اللوحات
   ================================================================ */
function togglePanel(key) {
  activePanel = activePanel === key ? null : key;
  renderContent();
  if (activePanel) {
    setTimeout(() => {
      const el = document.getElementById(activePanel === 'purchases' ? 'purPanel' : 'expPanel');
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }
}

/* ================================================================
   حذف
   ================================================================ */
function deletePurchase(idx) {
  if (!confirm(`حذف: ${purchases[idx]?.item}؟`)) return;
  purchases.splice(idx, 1);
  renderContent();
  showToast('تم حذف حركة الشراء', '🗑️');
}
function deleteExpense(idx) {
  if (!confirm(`حذف: ${expenses[idx]?.title}؟`)) return;
  expenses.splice(idx, 1);
  renderContent();
  showToast('تم حذف المصروف', '🗑️');
}

/* ================================================================
   فتح / إغلاق المودال
   ================================================================ */
function openModal(type) {
  if (type === 'purchase') {
    buildPurchaseForm();
    document.getElementById('purModalScrim').classList.add('show');
    document.getElementById('purModal').classList.add('show');
  } else {
    buildExpenseForm();
    document.getElementById('expModalScrim').classList.add('show');
    document.getElementById('expModal').classList.add('show');
  }
}
function closeModal(type) {
  if (type === 'purchase') {
    document.getElementById('purModalScrim').classList.remove('show');
    document.getElementById('purModal').classList.remove('show');
  } else {
    document.getElementById('expModalScrim').classList.remove('show');
    document.getElementById('expModal').classList.remove('show');
  }
}

/* ================================================================
   نموذج المشتريات
   ================================================================ */
function buildPurchaseForm() {
  const cat = RAW_MATERIAL_TREE[purCatIdx];
  document.getElementById('purModalBody').innerHTML = `

    <!-- 1. التصنيف -->
    <div class="mgr-form-group">
      <label>التصنيف الرئيسي</label>
      <select id="purCatSel" onchange="onPurCatChange(this.value)">
        ${RAW_MATERIAL_TREE.map((c,i) => `
          <option value="${i}" ${i===purCatIdx?'selected':''}>${c.icon} ${e(c.name)}</option>
        `).join('')}
        <option value="new">➕ تصنيف جديد...</option>
      </select>
    </div>
    <div class="mgr-form-group" id="purNewCatRow" style="display:none;">
      <label>اسم التصنيف الجديد</label>
      <input type="text" id="purNewCatInput" placeholder="مثال: ألبان ومنتجات">
    </div>

    <!-- 2. المادة -->
    <div class="mgr-form-group">
      <label>اسم المادة</label>
      <select id="purItemSel" onchange="onPurItemChange(this.value)">
        ${cat.items.map(it => `<option value="${e(it)}">${e(it)}</option>`).join('')}
        <option value="new">➕ مادة جديدة...</option>
      </select>
    </div>
    <div class="mgr-form-group" id="purNewItemRow" style="display:none;">
      <label>اسم المادة الجديدة</label>
      <input type="text" id="purNewItemInput" placeholder="مثال: بطاطا سبونتا">
    </div>

    <!-- 3. العبوة والكمية -->
    <div class="mgr-form-row2">
      <div class="mgr-form-group">
        <label>نوع العبوة</label>
        <select id="purUnitSel" onchange="calcUnitCost()">
          ${['كيلو','شوال','صندوق','كيس','كرتون','ربطة','تنكة','عدد'].map(u =>
            `<option value="${u}">${u}</option>`).join('')}
        </select>
      </div>
      <div class="mgr-form-group">
        <label>عدد العبوات</label>
        <input type="number" id="purPkgCount" value="1" min="1" inputmode="numeric"
          oninput="calcUnitCost()">
      </div>
    </div>

    <!-- 4. الوزن والمبلغ -->
    <div class="mgr-form-row2">
      <div class="mgr-form-group">
        <label>الوزن الصافي الإجمالي (كغ)</label>
        <input type="number" id="purWeight" placeholder="مثال: 50"
          inputmode="decimal" step="any" oninput="calcUnitCost()">
      </div>
      <div class="mgr-form-group">
        <label>المبلغ الإجمالي المدفوع (ل.س)</label>
        <input type="number" id="purTotalPrice" placeholder="0"
          inputmode="numeric" oninput="calcUnitCost()">
      </div>
    </div>

    <!-- حساب سعر الوحدة -->
    <div class="pur-unit-cost-box" id="purUnitCostBox">
      <div class="pur-unit-cost-label">سعر التكلفة للوحدة</div>
      <div class="pur-unit-cost-val" id="purUnitCostVal">— ل.س</div>
      <div class="pur-unit-cost-formula" id="purUnitCostFormula">أدخل الوزن والمبلغ للاحتساب</div>
    </div>

    <button class="mgr-btn navy block" onclick="submitPurchase()" style="width:100%;margin-top:4px;">
      ✅ ترحيل إلى كشف المشتريات
    </button>
  `;
}

function onPurCatChange(val) {
  const newCatRow  = document.getElementById('purNewCatRow');
  const itemSel    = document.getElementById('purItemSel');
  if (val === 'new') {
    newCatRow.style.display = 'block';
    itemSel.innerHTML = `<option value="new">➕ مادة جديدة...</option>`;
    document.getElementById('purNewItemRow').style.display = 'block';
  } else {
    newCatRow.style.display = 'none';
    purCatIdx = parseInt(val);
    const cat = RAW_MATERIAL_TREE[purCatIdx];
    itemSel.innerHTML = cat.items.map(it => `<option value="${e(it)}">${e(it)}</option>`).join('')
      + `<option value="new">➕ مادة جديدة...</option>`;
    document.getElementById('purNewItemRow').style.display = 'none';
  }
}

function onPurItemChange(val) {
  document.getElementById('purNewItemRow').style.display = val === 'new' ? 'block' : 'none';
}

function calcUnitCost() {
  const total    = parseFloat(document.getElementById('purTotalPrice')?.value) || 0;
  const weight   = parseFloat(document.getElementById('purWeight')?.value) || 0;
  const packages = parseFloat(document.getElementById('purPkgCount')?.value) || 1;
  const unit     = document.getElementById('purUnitSel')?.value || 'كغ';
  const valEl    = document.getElementById('purUnitCostVal');
  const frmEl    = document.getElementById('purUnitCostFormula');
  if (!valEl) return;
  if (total > 0 && weight > 0) {
    const rate = Math.round(total / weight);
    valEl.textContent  = `${fmtNum(rate)} ل.س / كغ`;
    frmEl.textContent  = `${fmtNum(total)} ÷ ${weight} كغ = ${fmtNum(rate)} ل.س للكيلو`;
  } else if (total > 0) {
    const rate = Math.round(total / packages);
    valEl.textContent  = `${fmtNum(rate)} ل.س / ${unit}`;
    frmEl.textContent  = `${fmtNum(total)} ÷ ${packages} ${unit} = ${fmtNum(rate)} للعبوة`;
  } else {
    valEl.textContent  = '— ل.س';
    frmEl.textContent  = 'أدخل الوزن والمبلغ للاحتساب';
  }
}

function submitPurchase() {
  const catVal  = document.getElementById('purCatSel').value;
  const itemVal = document.getElementById('purItemSel').value;
  const total   = parseFloat(document.getElementById('purTotalPrice').value);
  const weight  = parseFloat(document.getElementById('purWeight').value) || 0;
  const pkgs    = parseFloat(document.getElementById('purPkgCount').value) || 1;
  const unit    = document.getElementById('purUnitSel').value;

  let cat  = catVal  === 'new' ? document.getElementById('purNewCatInput').value.trim()  : RAW_MATERIAL_TREE[parseInt(catVal)]?.name || '';
  let item = itemVal === 'new' ? document.getElementById('purNewItemInput').value.trim() : itemVal;

  if (!item) { showToast('أدخل اسم المادة', '⚠️'); return; }
  if (!total || total <= 0) { showToast('أدخل المبلغ الإجمالي', '⚠️'); return; }

  const unitCost = weight > 0 ? Math.round(total / weight) : Math.round(total / pkgs);

  purchases.unshift({
    id: Date.now(), item, cat, unit, packages: pkgs,
    weight: weight || pkgs, unitCost, total,
    time: nowTime()
  });

  closeModal('purchase');
  activePanel = 'purchases';
  renderContent();
  showToast(`تم تسجيل شراء: ${item}`, '✅');
}

/* ================================================================
   نموذج المصاريف
   ================================================================ */
function buildExpenseForm() {
  document.getElementById('expModalBody').innerHTML = `

    <!-- نوع المصروف -->
    <div class="exp-type-grid">
      ${EXP_TYPES.map(t => `
        <button class="exp-type-btn ${expTypeKey===t.key?'active':''}"
          onclick="setExpType('${t.key}')">
          <span>${t.icon}</span>
          <small>${e(t.label)}</small>
        </button>
      `).join('')}
    </div>

    <!-- الحقول الديناميكية -->
    <div id="expDynamicFields"></div>

    <!-- المبلغ -->
    <div class="mgr-form-group">
      <label>المبلغ المدفوع (ل.س)</label>
      <input type="number" id="expAmount" placeholder="0" inputmode="numeric">
    </div>

    <button class="mgr-btn primary block" onclick="submitExpense()" style="width:100%;">
      ✅ قيد المصروف في الصندوق
    </button>
  `;

  renderExpDynamic();
}

function setExpType(key) {
  expTypeKey = key;
  // تحديث أزرار النوع فقط بدون إعادة بناء كامل
  document.querySelectorAll('.exp-type-btn').forEach(b => {
    const isActive = b.querySelector('small')?.textContent === EXP_TYPES.find(t=>t.key===key)?.label;
    b.classList.toggle('active', EXP_TYPES.findIndex(t=>t.key===key) === [...document.querySelectorAll('.exp-type-btn')].indexOf(b));
  });
  // أسهل: نعيد render الحقول الديناميكية فقط
  document.querySelectorAll('.exp-type-btn').forEach((b,i) => {
    b.classList.toggle('active', EXP_TYPES[i]?.key === key);
  });
  renderExpDynamic();
}

function renderExpDynamic() {
  const box = document.getElementById('expDynamicFields');
  if (!box) return;
  switch (expTypeKey) {
    case 'salary':
      box.innerHTML = `
        <div class="mgr-form-group">
          <label>الموظف المستلم</label>
          <select id="expEmpSel" onchange="updateEmpJob(this.value)">
            ${EMPLOYEES.map(emp => `<option value="${emp.id}">${e(emp.name)}</option>`).join('')}
          </select>
        </div>
        <div class="mgr-form-group">
          <label>الوظيفة</label>
          <input type="text" id="expEmpJob" value="${e(EMPLOYEES[0]?.job||'')}"
            readonly style="background:var(--card-subtle);color:var(--fahad-navy);font-weight:700;">
        </div>
        <div class="mgr-form-group">
          <label>نوع السند</label>
          <select id="expSalaryKind">
            <option>سلفة على الراتب</option>
            <option>راتب أسبوعي / شهري</option>
            <option>مكافأة إنجاز</option>
          </select>
        </div>`;
      break;
    case 'fuel':
      box.innerHTML = `
        <div class="mgr-form-group">
          <label>بند المحروقات</label>
          <select id="expFuelSel">
            <option>مازوت للمولدة</option>
            <option>جرة غاز للقلايات</option>
            <option>بنزين دراجات التوصيل</option>
          </select>
        </div>`;
      break;
    case 'maintenance':
      box.innerHTML = `
        <div class="mgr-form-group">
          <label>الجهاز / بيان الصيانة</label>
          <input type="text" id="expMaintInput" placeholder="مثال: إصلاح قلاية الدجاج">
        </div>`;
      break;
    case 'bills':
      box.innerHTML = `
        <div class="mgr-form-group">
          <label>نوع الفاتورة</label>
          <select id="expBillSel">
            <option>فاتورة الكهرباء</option>
            <option>فاتورة المياه</option>
            <option>اشتراك إنترنت</option>
            <option>إيجار</option>
          </select>
        </div>`;
      break;
    default:
      box.innerHTML = `
        <div class="mgr-form-group">
          <label>بيان المصروف</label>
          <input type="text" id="expOtherInput" placeholder="اكتب تفاصيل المصروف">
        </div>`;
  }
}

function updateEmpJob(empId) {
  const emp = EMPLOYEES.find(e => e.id === empId);
  if (emp) document.getElementById('expEmpJob').value = emp.job;
}

function submitExpense() {
  const amount = parseFloat(document.getElementById('expAmount')?.value);
  if (!amount || amount <= 0) { showToast('أدخل المبلغ', '⚠️'); return; }

  const typeObj = EXP_TYPES.find(t => t.key === expTypeKey);
  let title = '';

  switch (expTypeKey) {
    case 'salary': {
      const empId = document.getElementById('expEmpSel')?.value;
      const emp   = EMPLOYEES.find(e => e.id === empId);
      const kind  = document.getElementById('expSalaryKind')?.value || 'سلفة';
      title = `${kind} — ${emp?.name || ''} (${emp?.job || ''})`;
      break;
    }
    case 'fuel':        title = document.getElementById('expFuelSel')?.value || 'محروقات'; break;
    case 'maintenance': title = document.getElementById('expMaintInput')?.value || 'صيانة معدات'; break;
    case 'bills':       title = document.getElementById('expBillSel')?.value || 'فاتورة'; break;
    default:            title = document.getElementById('expOtherInput')?.value || 'مصروف عام';
  }

  expenses.unshift({
    id: Date.now(),
    type: typeObj?.label || 'أخرى',
    icon: typeObj?.icon || '💸',
    title, amount,
    time: nowTime()
  });

  closeModal('expense');
  activePanel = 'expenses';
  renderContent();
  showToast(`تم تسجيل: ${title}`, '✅');
}

/* ================================================================
   nav
   ================================================================ */
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

/* ── تشغيل ── */
renderApp();
