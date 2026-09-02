/* ================================================================
   utils.js — الدوال المساعدة المشتركة — alfaprosys
   يُحمَّل في كل صفحة بعد config.js وقبل ملف الصفحة.
   ================================================================ */

/* ── تعقيم HTML (حماية XSS) ── */
window.e = window.escapeHtml = function(v) {
  return String(v ?? '').replace(/[&<>'"]/g, c =>
    ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[c]));
};

/* ── تنسيق الأرقام ── */
window.fmtNum = function(n) {
  return Number(n || 0).toLocaleString('en-US');
};
window.fmt = function(n) {
  return fmtNum(n) + ' ل.س';
};

/* ── Toast إشعار ── */
window.showToast = function(msg, icon) {
  icon = icon || '✅';
  const t = document.getElementById('toast');
  if (!t) return;
  t.innerHTML = '<span>' + icon + '</span><span>' + e(msg) + '</span>';
  t.classList.add('show');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(function() { t.classList.remove('show'); }, 2200);
};

/* ── مرجع البيانات ── */
Object.defineProperty(window, 'DATA', {
  get: function() { return window.DEMO_DATA; },
  configurable: true,
});
