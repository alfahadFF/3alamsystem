const DATA = window.DEMO_DATA;
const ROLES = DATA.roles;
let currentRole = null;

function renderLogin() {
  const grid = document.getElementById('roleGrid');
  grid.innerHTML = Object.keys(ROLES).map(key => {
    const role = ROLES[key];
    return `
      <button class="role-card" type="button" onclick="login('${key}')" aria-label="الدخول كـ ${escapeHtml(role.label)}">
        <div class="role-icon">${role.icon}</div>
        <div class="role-title">${escapeHtml(role.label)}</div>
        <div class="role-desc">${escapeHtml(role.desc)}</div>
      </button>
    `;
  }).join('');
}

function login(roleKey) {
  currentRole = roleKey;
  // احفظ الدور في الجلسة ليعرفه أي شاشة مشتركة (كالعملاء)
  sessionStorage.setItem('alfaprosys_role', roleKey);

  // الكاشير → شاشة البيع
  if (roleKey === 'cashier') {
    showToast('جاري فتح شاشة البيع', '🧾');
    setTimeout(() => { window.location.href = 'pos.html'; }, 350);
    return;
  }

  // المدير → لوحة الإدارة
  if (roleKey === 'manager') {
    showToast(`تم الدخول كـ ${ROLES[roleKey].label}`, ROLES[roleKey].icon);
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 350);
    return;
  }

  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('appShell').style.display = 'block';
  renderManagerWelcome();
  showToast(`تم الدخول كـ ${ROLES[roleKey].label}`, ROLES[roleKey].icon);
}

function logout() {
  currentRole = null;
  document.getElementById('appShell').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
  showToast('تم تسجيل الخروج بنجاح', '🚪');
}

function renderManagerWelcome() {
  document.getElementById('appShell').innerHTML = `
    <div class="app-placeholder">
      <div class="placeholder-card">
        <div class="placeholder-icon">👑</div>
        <h2>مرحبًا، المدير العام</h2>
        <p>شاشة الدخول جاهزة. شاشة البيع أصبحت الآن في ملف مستقل باسم pos.html.</p>
        <button class="logout-btn" type="button" onclick="logout()">🚪 خروج</button>
      </div>
    </div>
  `;
}

renderLogin();
