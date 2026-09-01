/* ============================================================
   sync/storage.js — التخزين المحلي (أساس العمل دون اتصال)
   يقرأ/يكتب نسخة البيانات في localStorage بأمان (try/catch).
   ============================================================ */
window.SyncStorage = {
  KEY: 'alfaprosys_data_v1',

  load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  },

  save(data) {
    try {
      localStorage.setItem(this.KEY, JSON.stringify(data));
      return true;
    } catch (e) { return false; }
  },

  clear() {
    try { localStorage.removeItem(this.KEY); } catch (e) {}
  },

  has() {
    try { return localStorage.getItem(this.KEY) !== null; } catch (e) { return false; }
  },
};
