/* ============================================================
   sync/queue.js — طابور العمليات المعلّقة (أساس المزامنة والأوفلاين)
   يسجّل كل تعديل على البيانات ليُدفع لاحقًا إلى Supabase عند الربط.
   ============================================================ */
window.SyncQueue = {
  KEY: 'alfaprosys_queue_v1',
  MAX: 500,

  list() {
    try { return JSON.parse(localStorage.getItem(this.KEY) || '[]'); }
    catch (e) { return []; }
  },

  push(op) {
    try {
      const q = this.list();
      q.push(op);
      // لا ندع الطابور يتضخم بلا حد
      localStorage.setItem(this.KEY, JSON.stringify(q.slice(-this.MAX)));
    } catch (e) {}
  },

  count() { return this.list().length; },

  clear() {
    try { localStorage.removeItem(this.KEY); } catch (e) {}
  },
};
