/* ================================================================
   menu_admin.js — المنيو والأسعار — alfaprosys
   ================================================================ */

const DATA = window.DEMO_DATA;

/* ── أدوات ── */
function fmtNum(n) { return Number(n || 0).toLocaleString('en-US'); }
function e(v) {
  return String(v ?? '').replace(/[&<>'"]/g, c =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[c])
  );
}
function showToast(msg, icon = '✅') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.innerHTML = `<span>${icon}</span><span>${e(msg)}</span>`;
  t.classList.add('show');
  clearTimeout(window._toast);
  window._toast = setTimeout(() => t.classList.remove('show'), 2000);
}
function bySort(a, b) { return (a.sort_order || 0) - (b.sort_order || 0); }
function uniq(arr) { return [...new Set(arr.filter(Boolean))]; }

/* ── التنقل المشترك ── */
const MGR_NAV = window.AlfaNav.MGR_NAV;
const CURRENT = 'menu_admin';
const navLink = window.AlfaNav.linker(CURRENT);


/* ================================================================
   البيانات — نسخة قابلة للتعديل في الذاكرة
   ================================================================ */
let categories = JSON.parse(JSON.stringify(DATA.categories || []));
let items      = JSON.parse(JSON.stringify(DATA.items      || []));

/* ── حالة UI ── */
let navOpen       = false;
let activeCatId   = null;   // null = عرض كل التصنيفات
let menuView      = 'cats'; // 'cats' | 'items'
let searchTerm    = '';

// مودال التعديل
let editModal     = null;   // null | 'item' | 'cat' | 'addItem' | 'addCat'
let editingItemId = null;
let editingCatId  = null;

/* ================================================================
   البناء الرئيسي
   ================================================================ */
function renderApp() {
  document.getElementById('menuApp').innerHTML = `
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
        <div id="menuContent"></div>
      </div>
    </div>

    <!-- Scrim nav -->
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
    </nav>

    <!-- مودال التعديل/الإضافة -->
    <div class="menu-modal-scrim" id="menuModalScrim" onclick="closeEditModal()"></div>
    <div class="menu-modal" id="menuModal" role="dialog">
      <div class="menu-modal-head" id="menuModalHead"></div>
      <div class="menu-modal-body" id="menuModalBody"></div>
    </div>
  `;

  renderContent();
}

/* ================================================================
   المحتوى الرئيسي
   ================================================================ */
function renderContent() {
  const totalActive   = items.filter(i => i.is_available !== false).length;
  const totalInactive = items.filter(i => i.is_available === false).length;

  document.getElementById('menuContent').innerHTML = `

    <!-- رأس الصفحة -->
    <div class="mgr-page-header">
      <div>
        <div class="mgr-page-brand">alfaprosys</div>
        <div class="mgr-page-title">🍔 المنيو والأسعار</div>
      </div>
      <div class="menu-header-actions">
        <button class="mgr-btn outline sm" onclick="openAddCat()">+ تصنيف</button>
        <button class="mgr-btn navy sm"    onclick="openAddItem()">+ صنف</button>
      </div>
    </div>

    <!-- إحصائيات سريعة -->
    <div class="mgr-stats-grid" style="margin-bottom:12px;">
      <div class="mgr-stat-card">
        <div class="mgr-stat-lbl">التصنيفات</div>
        <div class="mgr-stat-val">${categories.length}</div>
        <div class="mgr-stat-sub">تصنيف رئيسي</div>
      </div>
      <div class="mgr-stat-card">
        <div class="mgr-stat-lbl">إجمالي الأصناف</div>
        <div class="mgr-stat-val">${items.length}</div>
        <div class="mgr-stat-sub">صنف في المنيو</div>
      </div>
      <div class="mgr-stat-card green">
        <div class="mgr-stat-lbl">متوفر</div>
        <div class="mgr-stat-val">${totalActive}</div>
        <div class="mgr-stat-sub">صنف</div>
      </div>
      <div class="mgr-stat-card red">
        <div class="mgr-stat-lbl">غير متوفر</div>
        <div class="mgr-stat-val">${totalInactive}</div>
        <div class="mgr-stat-sub">صنف</div>
      </div>
    </div>

    <!-- شريط البحث -->
    <div class="menu-search-bar">
      <span class="menu-search-icon">🔍</span>
      <input type="text" id="menuSearch" placeholder="ابحث عن صنف أو تصنيف..."
        value="${e(searchTerm)}" oninput="onSearch(this.value)">
      ${searchTerm ? `<button class="menu-search-clear" onclick="clearSearch()">✕</button>` : ''}
    </div>

    ${searchTerm.trim()
      ? renderSearchResults()
      : renderCategoriesAndItems()}
  `;
}

/* ================================================================
   نتائج البحث
   ================================================================ */
function renderSearchResults() {
  const q = searchTerm.trim().toLowerCase();
  const found = items.filter(i =>
    i.name.toLowerCase().includes(q) ||
    i.category_name?.toLowerCase().includes(q) ||
    i.family?.toLowerCase().includes(q) ||
    i.variant?.toLowerCase().includes(q)
  ).sort(bySort);

  return `
    <div class="menu-search-count">${found.length} نتيجة لـ "${e(searchTerm)}"</div>
    <div class="mgr-card" style="padding:0;overflow:hidden;">
      ${found.length === 0
        ? `<div class="mgr-empty"><div class="mgr-empty-icon">🔍</div>لا توجد نتائج</div>`
        : found.map(item => renderItemRow(item)).join('')}
    </div>
  `;
}

/* ================================================================
   التصنيفات والأصناف
   ================================================================ */
function renderCategoriesAndItems() {
  return `
    <!-- شريط التصنيفات -->
    <div class="menu-cat-strip">
      <button class="menu-cat-chip ${activeCatId === null ? 'active' : ''}"
        onclick="selectCat(null)">
        الكل <span>${items.length}</span>
      </button>
      ${categories.sort(bySort).map(cat => {
        const cnt = items.filter(i => i.category_id === cat.id).length;
        return `
          <button class="menu-cat-chip ${activeCatId === cat.id ? 'active' : ''}"
            onclick="selectCat('${e(cat.id)}')">
            ${cat.icon || ''} ${e(cat.name)} <span>${cnt}</span>
          </button>`;
      }).join('')}
    </div>

    ${activeCatId === null ? renderAllCats() : renderCatItems(activeCatId)}
  `;
}

/* ── عرض كل التصنيفات مجمّعة ── */
function renderAllCats() {
  return categories.sort(bySort).map(cat => {
    const catItems = items.filter(i => i.category_id === cat.id).sort(bySort);
    const families = uniq(catItems.map(i => i.family));
    const activeCount   = catItems.filter(i => i.is_available !== false).length;
    const inactiveCount = catItems.filter(i => i.is_available === false).length;

    return `
      <div class="menu-cat-section">
        <div class="menu-cat-header">
          <div class="menu-cat-header-info">
            <span class="menu-cat-icon">${cat.icon || '📦'}</span>
            <div>
              <div class="menu-cat-name">${e(cat.name)}</div>
              <div class="menu-cat-meta">
                ${catItems.length} صنف
                ${activeCount ? `<span class="mgr-badge green">${activeCount} متوفر</span>` : ''}
                ${inactiveCount ? `<span class="mgr-badge red">${inactiveCount} غير متوفر</span>` : ''}
              </div>
            </div>
          </div>
          <button class="menu-edit-cat-btn" onclick="openEditCat('${e(cat.id)}')">✏️ تعديل</button>
        </div>

        <div class="mgr-card" style="padding:0;overflow:hidden;margin-bottom:0;">
          ${catItems.length === 0
            ? `<div class="mgr-empty" style="padding:16px;">لا توجد أصناف في هذا التصنيف</div>`
            : catItems.map(item => renderItemRow(item)).join('')}
        </div>
      </div>
    `;
  }).join('');
}

/* ── عرض أصناف تصنيف محدد ── */
function renderCatItems(catId) {
  const cat      = categories.find(c => c.id === catId);
  const catItems = items.filter(i => i.category_id === catId).sort(bySort);
  const families = uniq(catItems.map(i => i.family));

  return `
    <div class="menu-cat-section">
      <div class="menu-cat-header">
        <div class="menu-cat-header-info">
          <span class="menu-cat-icon">${cat?.icon || '📦'}</span>
          <div>
            <div class="menu-cat-name">${e(cat?.name || '')}</div>
            <div class="menu-cat-meta">${catItems.length} صنف</div>
          </div>
        </div>
        <button class="menu-edit-cat-btn" onclick="openEditCat('${e(catId)}')">✏️ تعديل التصنيف</button>
      </div>

      <!-- تصفية بالعائلة -->
      ${families.length > 1 ? `
        <div class="menu-family-strip">
          ${families.map(f => `
            <button class="menu-family-chip" onclick="filterFamily('${e(f)}')">
              ${e(f)}
            </button>`).join('')}
        </div>` : ''}

      <div class="mgr-card" style="padding:0;overflow:hidden;">
        ${catItems.length === 0
          ? `<div class="mgr-empty">لا توجد أصناف</div>`
          : catItems.map(item => renderItemRow(item)).join('')}
      </div>
    </div>
  `;
}

/* ── صف الصنف الواحد ── */
function renderItemRow(item) {
  const available = item.is_available !== false;
  return `
    <div class="menu-item-row ${available ? '' : 'unavailable'}">
      <div class="menu-item-main">
        <div class="menu-item-name">${e(item.name)}</div>
        <div class="menu-item-meta">
          ${item.family ? `<span class="menu-item-family">${e(item.family)}</span>` : ''}
          ${item.variant_clean ? `<span class="menu-item-variant">${e(item.variant_clean)}</span>` : ''}
          ${item.contract_price ? `<span class="mgr-badge gold">عقد: ${fmtNum(item.contract_price)}</span>` : ''}
        </div>
      </div>
      <div class="menu-item-right">
        ${(() => {
          const r = ((window.DEMO_DATA.discount_settings || {}).items || []).find(x => x.item_id === item.id);
          if (!r) return `<div class="menu-item-price">${fmtNum(item.price)}<span>ل.س</span></div>`;
          const net = Math.round((item.price || 0) * (1 - r.pct / 100));
          return `<div class="menu-item-price"><s>${fmtNum(item.price)}</s> <b>${fmtNum(net)}</b><span>ل.س</span><i class="menu-disc-tag">−${fmtNum(r.pct)}%</i></div>`;
        })()}
        <button class="menu-avail-btn ${available ? 'avail' : 'unavail'}"
          onclick="toggleAvailability('${e(item.id)}')">
          ${available ? '✅' : '🚫'}
        </button>
        <button class="menu-item-edit-btn" onclick="openEditItem('${e(item.id)}')">✏️</button>
      </div>
    </div>
  `;
}

/* ================================================================
   تبديل التوفر
   ================================================================ */
function toggleAvailability(id) {
  const item = items.find(i => i.id === id);
  if (!item) return;
  item.is_available = item.is_available === false ? true : false;
  // تحديث DATA أيضاً
  const orig = DATA.items.find(i => i.id === id);
  if (orig) orig.is_available = item.is_available;
  renderContent();
  showToast(
    `${item.name}: ${item.is_available ? 'أصبح متوفراً' : 'أصبح غير متوفر'}`,
    item.is_available ? '✅' : '🚫'
  );
}

/* ================================================================
   مودال تعديل صنف
   ================================================================ */
function openEditItem(id) {
  editingItemId = id;
  const item = items.find(i => i.id === id);
  if (!item) return;

  document.getElementById('menuModalHead').innerHTML = `
    <span>✏️ تعديل صنف</span>
    <button onclick="closeEditModal()">✕</button>
  `;
  document.getElementById('menuModalBody').innerHTML = `

    <!-- اسم الصنف -->
    <div class="mgr-form-group">
      <label>اسم الصنف الكامل</label>
      <input type="text" id="editItemName" value="${e(item.name)}">
    </div>

    <!-- التصنيف الرئيسي -->
    <div class="mgr-form-group">
      <label>التصنيف الرئيسي</label>
      <select id="editItemCat">
        ${categories.map(c => `
          <option value="${e(c.id)}" ${c.id === item.category_id ? 'selected' : ''}>
            ${c.icon || ''} ${e(c.name)}
          </option>`).join('')}
      </select>
    </div>

    <!-- العائلة / التصنيف الفرعي -->
    <div class="mgr-form-group">
      <label>التصنيف الفرعي (العائلة)</label>
      <input type="text" id="editItemFamily" value="${e(item.family || '')}">
    </div>

    <!-- الصيغة / المتغير -->
    <div class="mgr-form-row2">
      <div class="mgr-form-group">
        <label>الصيغة / المتغير</label>
        <input type="text" id="editItemVariant" value="${e(item.variant_clean || item.variant || '')}">
      </div>
      <div class="mgr-form-group">
        <label>الترتيب</label>
        <input type="number" id="editItemSort" value="${item.sort_order || 0}" inputmode="numeric">
      </div>
    </div>

    <!-- الأسعار -->
    <div class="menu-prices-section">
      <div class="menu-prices-title">💰 الأسعار</div>
      <div class="mgr-form-row2">
        <div class="mgr-form-group">
          <label>سعر البيع العادي (ل.س)</label>
          <input type="number" id="editItemPrice" value="${item.price || 0}" inputmode="numeric">
        </div>
        <div class="mgr-form-group">
          <label>سعر العقد الخاص (ل.س)</label>
          <input type="number" id="editItemContract" value="${item.contract_price || ''}"
            inputmode="numeric" placeholder="اتركه فارغاً إن لم يكن">
        </div>
      </div>
      <div class="mgr-form-group">
        <label>تكلفة الصنف التقديرية (ل.س)</label>
        <input type="number" id="editItemCost" value="${item.cost_manual || 0}" inputmode="numeric">
      </div>
    </div>

    <!-- الحالة -->
    <div class="menu-avail-toggle-row">
      <span>حالة الصنف</span>
      <label class="menu-toggle-label">
        <input type="checkbox" id="editItemAvail" ${item.is_available !== false ? 'checked' : ''}>
        <span class="menu-toggle-track"></span>
        <span class="menu-toggle-text" id="editItemAvailText">
          ${item.is_available !== false ? 'متوفر' : 'غير متوفر'}
        </span>
      </label>
    </div>

    <!-- أزرار -->
    <div class="menu-modal-footer">
      <button class="mgr-btn danger sm" onclick="deleteItem('${e(item.id)}')">🗑️ حذف</button>
      <div style="display:flex;gap:8px;">
        <button class="mgr-btn outline sm" onclick="closeEditModal()">إلغاء</button>
        <button class="mgr-btn navy sm" onclick="saveItem('${e(item.id)}')">💾 حفظ</button>
      </div>
    </div>
  `;

  document.getElementById('editItemAvail').addEventListener('change', function() {
    document.getElementById('editItemAvailText').textContent = this.checked ? 'متوفر' : 'غير متوفر';
  });

  openModalEl();
}

function saveItem(id) {
  const item = items.find(i => i.id === id);
  if (!item) return;

  item.name          = document.getElementById('editItemName').value.trim()    || item.name;
  item.category_id   = document.getElementById('editItemCat').value;
  item.category_name = categories.find(c => c.id === item.category_id)?.name  || item.category_name;
  item.family        = document.getElementById('editItemFamily').value.trim()  || item.family;
  item.variant_clean = document.getElementById('editItemVariant').value.trim();
  item.sort_order    = parseInt(document.getElementById('editItemSort').value) || item.sort_order;
  item.price         = parseInt(document.getElementById('editItemPrice').value) || item.price;
  item.cost_manual   = parseInt(document.getElementById('editItemCost').value)  || 0;
  item.is_available  = document.getElementById('editItemAvail').checked;
  const contract     = document.getElementById('editItemContract').value.trim();
  item.contract_price = contract ? parseInt(contract) : null;

  // تحديث DATA الأصلية
  const orig = DATA.items.find(i => i.id === id);
  if (orig) Object.assign(orig, item);

  closeEditModal();
  renderContent();
  showToast(`تم حفظ: ${item.name}`, '✅');
}

function deleteItem(id) {
  const item = items.find(i => i.id === id);
  if (!confirm(`حذف الصنف: ${item?.name}؟`)) return;
  items = items.filter(i => i.id !== id);
  DATA.items = DATA.items.filter(i => i.id !== id);
  closeEditModal();
  renderContent();
  showToast('تم حذف الصنف', '🗑️');
}

/* ================================================================
   مودال إضافة صنف جديد
   ================================================================ */
function openAddItem() {
  document.getElementById('menuModalHead').innerHTML = `
    <span>➕ إضافة صنف جديد</span>
    <button onclick="closeEditModal()">✕</button>
  `;
  document.getElementById('menuModalBody').innerHTML = `

    <div class="mgr-form-group">
      <label>اسم الصنف الكامل</label>
      <input type="text" id="newItemName" placeholder="مثال: شاورما عربي صحن سندويشتين">
    </div>

    <div class="mgr-form-group">
      <label>التصنيف الرئيسي</label>
      <select id="newItemCat">
        ${categories.map(c => `
          <option value="${e(c.id)}">${c.icon || ''} ${e(c.name)}</option>`).join('')}
        <option value="__new__">➕ تصنيف جديد...</option>
      </select>
    </div>
    <div class="mgr-form-group" id="newCatNameRow" style="display:none;">
      <label>اسم التصنيف الجديد</label>
      <input type="text" id="newCatNameInput" placeholder="مثال: وجبات خاصة">
    </div>

    <div class="mgr-form-row2">
      <div class="mgr-form-group">
        <label>التصنيف الفرعي</label>
        <input type="text" id="newItemFamily" placeholder="مثال: شاورما عربي">
      </div>
      <div class="mgr-form-group">
        <label>الصيغة / المتغير</label>
        <input type="text" id="newItemVariant" placeholder="مثال: صحن سندويشتين">
      </div>
    </div>

    <div class="menu-prices-section">
      <div class="menu-prices-title">💰 الأسعار</div>
      <div class="mgr-form-row2">
        <div class="mgr-form-group">
          <label>سعر البيع (ل.س)</label>
          <input type="number" id="newItemPrice" placeholder="0" inputmode="numeric">
        </div>
        <div class="mgr-form-group">
          <label>سعر العقد (ل.س)</label>
          <input type="number" id="newItemContract" placeholder="اختياري" inputmode="numeric">
        </div>
      </div>
      <div class="mgr-form-group">
        <label>تكلفة تقديرية (ل.س)</label>
        <input type="number" id="newItemCost" placeholder="0" inputmode="numeric">
      </div>
    </div>

    <div class="menu-modal-footer">
      <button class="mgr-btn outline sm" onclick="closeEditModal()">إلغاء</button>
      <button class="mgr-btn navy sm" onclick="saveNewItem()">✅ إضافة الصنف</button>
    </div>
  `;

  document.getElementById('newItemCat').addEventListener('change', function() {
    document.getElementById('newCatNameRow').style.display =
      this.value === '__new__' ? 'block' : 'none';
  });

  openModalEl();
  setTimeout(() => document.getElementById('newItemName')?.focus(), 100);
}

function saveNewItem() {
  const name     = document.getElementById('newItemName').value.trim();
  const price    = parseInt(document.getElementById('newItemPrice').value) || 0;
  const catSel   = document.getElementById('newItemCat').value;
  const family   = document.getElementById('newItemFamily').value.trim();
  const variant  = document.getElementById('newItemVariant').value.trim();
  const cost     = parseInt(document.getElementById('newItemCost').value)     || 0;
  const contract = document.getElementById('newItemContract').value.trim();

  if (!name)  { showToast('أدخل اسم الصنف', '⚠️'); return; }
  if (!price) { showToast('أدخل سعر البيع', '⚠️'); return; }

  let catId   = catSel;
  let catName = categories.find(c => c.id === catSel)?.name || '';

  // تصنيف جديد
  if (catSel === '__new__') {
    const newCatName = document.getElementById('newCatNameInput').value.trim();
    if (!newCatName) { showToast('أدخل اسم التصنيف الجديد', '⚠️'); return; }
    catId   = 'cat_' + Date.now();
    catName = newCatName;
    const newCat = { id: catId, name: catName, icon: '📦', sort_order: categories.length + 1, is_active: true };
    categories.push(newCat);
    DATA.categories = categories;
  }

  const newItem = {
    id:             'item_' + Date.now(),
    category_id:    catId,
    category_name:  catName,
    family:         family || catName,
    option_name:    family || catName,
    variant:        variant,
    variant_clean:  variant,
    name:           name,
    price:          price,
    is_available:   true,
    sort_order:     items.filter(i => i.category_id === catId).length + 1,
    cost_mode:      'manual',
    cost_manual:    cost,
    contract_price: contract ? parseInt(contract) : null,
    order_count:    0,
    is_pinned_popular: false,
    image_url:      null
  };

  items.push(newItem);
  DATA.items = items;

  closeEditModal();
  activeCatId = catId;
  renderContent();
  showToast(`تمت إضافة: ${name}`, '✅');
}

/* ================================================================
   مودال تعديل تصنيف
   ================================================================ */
function openEditCat(id) {
  editingCatId = id;
  const cat = categories.find(c => c.id === id);
  if (!cat) return;

  document.getElementById('menuModalHead').innerHTML = `
    <span>✏️ تعديل التصنيف</span>
    <button onclick="closeEditModal()">✕</button>
  `;
  document.getElementById('menuModalBody').innerHTML = `

    <div class="mgr-form-row2">
      <div class="mgr-form-group">
        <label>اسم التصنيف</label>
        <input type="text" id="editCatName" value="${e(cat.name)}">
      </div>
      <div class="mgr-form-group">
        <label>الأيقونة (إيموجي)</label>
        <input type="text" id="editCatIcon" value="${e(cat.icon || '')}" placeholder="🍔">
      </div>
    </div>

    <div class="mgr-form-group">
      <label>الترتيب</label>
      <input type="number" id="editCatSort" value="${cat.sort_order || 0}" inputmode="numeric">
    </div>

    <div class="menu-avail-toggle-row">
      <span>حالة التصنيف</span>
      <label class="menu-toggle-label">
        <input type="checkbox" id="editCatActive" ${cat.is_active !== false ? 'checked' : ''}>
        <span class="menu-toggle-track"></span>
        <span class="menu-toggle-text">${cat.is_active !== false ? 'نشط' : 'موقوف'}</span>
      </label>
    </div>

    <!-- عرض الأصناف المرتبطة -->
    <div class="menu-cat-items-count">
      <span>عدد الأصناف في هذا التصنيف</span>
      <strong>${items.filter(i => i.category_id === id).length} صنف</strong>
    </div>

    <div class="menu-modal-footer">
      <button class="mgr-btn danger sm" onclick="deleteCat('${e(id)}')">🗑️ حذف التصنيف</button>
      <div style="display:flex;gap:8px;">
        <button class="mgr-btn outline sm" onclick="closeEditModal()">إلغاء</button>
        <button class="mgr-btn navy sm" onclick="saveCat('${e(id)}')">💾 حفظ</button>
      </div>
    </div>
  `;

  openModalEl();
}

function saveCat(id) {
  const cat = categories.find(c => c.id === id);
  if (!cat) return;
  cat.name       = document.getElementById('editCatName').value.trim() || cat.name;
  cat.icon       = document.getElementById('editCatIcon').value.trim();
  cat.sort_order = parseInt(document.getElementById('editCatSort').value) || cat.sort_order;
  cat.is_active  = document.getElementById('editCatActive').checked;
  // تحديث category_name في الأصناف المرتبطة
  items.filter(i => i.category_id === id).forEach(i => i.category_name = cat.name);
  const orig = DATA.categories.find(c => c.id === id);
  if (orig) Object.assign(orig, cat);
  closeEditModal();
  renderContent();
  showToast(`تم حفظ التصنيف: ${cat.name}`, '✅');
}

function deleteCat(id) {
  const cnt = items.filter(i => i.category_id === id).length;
  const cat = categories.find(c => c.id === id);
  if (cnt > 0) {
    if (!confirm(`التصنيف "${cat?.name}" يحتوي ${cnt} صنف — هل تريد حذفهم جميعاً؟`)) return;
    items = items.filter(i => i.category_id !== id);
    DATA.items = DATA.items.filter(i => i.category_id !== id);
  } else {
    if (!confirm(`حذف التصنيف: ${cat?.name}؟`)) return;
  }
  categories = categories.filter(c => c.id !== id);
  DATA.categories = DATA.categories.filter(c => c.id !== id);
  if (activeCatId === id) activeCatId = null;
  closeEditModal();
  renderContent();
  showToast('تم حذف التصنيف', '🗑️');
}

/* ── إضافة تصنيف سريع ── */
function openAddCat() {
  document.getElementById('menuModalHead').innerHTML = `
    <span>➕ إضافة تصنيف جديد</span>
    <button onclick="closeEditModal()">✕</button>
  `;
  document.getElementById('menuModalBody').innerHTML = `
    <div class="mgr-form-row2">
      <div class="mgr-form-group">
        <label>اسم التصنيف</label>
        <input type="text" id="newCatName" placeholder="مثال: المأكولات البحرية">
      </div>
      <div class="mgr-form-group">
        <label>الأيقونة</label>
        <input type="text" id="newCatIcon" placeholder="🦐" value="📦">
      </div>
    </div>
    <div class="menu-modal-footer">
      <button class="mgr-btn outline sm" onclick="closeEditModal()">إلغاء</button>
      <button class="mgr-btn navy sm" onclick="saveNewCat()">✅ إضافة</button>
    </div>
  `;
  openModalEl();
  setTimeout(() => document.getElementById('newCatName')?.focus(), 100);
}

function saveNewCat() {
  const name = document.getElementById('newCatName').value.trim();
  const icon = document.getElementById('newCatIcon').value.trim() || '📦';
  if (!name) { showToast('أدخل اسم التصنيف', '⚠️'); return; }
  const newCat = {
    id: 'cat_' + Date.now(),
    name, icon,
    sort_order: categories.length + 1,
    is_active: true
  };
  categories.push(newCat);
  DATA.categories = categories;
  closeEditModal();
  renderContent();
  showToast(`تمت إضافة التصنيف: ${name}`, '✅');
}

/* ================================================================
   مودال — فتح / إغلاق
   ================================================================ */
function openModalEl() {
  document.getElementById('menuModalScrim').classList.add('show');
  document.getElementById('menuModal').classList.add('show');
}
function closeEditModal() {
  document.getElementById('menuModalScrim').classList.remove('show');
  document.getElementById('menuModal').classList.remove('show');
  editingItemId = null;
  editingCatId  = null;
}

/* ================================================================
   بحث / تصفية
   ================================================================ */
function onSearch(val) {
  searchTerm = val;
  renderContent();
}
function clearSearch() {
  searchTerm = '';
  renderContent();
}
function selectCat(id) {
  activeCatId = id;
  searchTerm  = '';
  renderContent();
}
function filterFamily(family) {
  searchTerm = family;
  renderContent();
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
