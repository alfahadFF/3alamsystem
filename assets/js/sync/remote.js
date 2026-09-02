/* ============================================================
   sync/remote.js — الدفع إلى الخادم (يُفعَّل عند ربط Supabase)
   حاليًا وضع "ما قبل الربط": لا يرسل شيئًا، لكنه جاهز.
   عند الربط: نفّذ دفعة عمليات SyncQueue إلى Supabase هنا.
   ============================================================ */
window.SyncRemote = {
  async flush() {
    const cfg = window.ALFA_CONFIG || {};
    // قبل الربط: لا مزامنة
    if (!cfg.syncEnabled || !cfg.supabase || !cfg.supabase.url) {
      return { sent: 0, skipped: true, reason: 'sync-disabled' };
    }

    // ── عند الربط: فعّل هذا المسار ──
    // const ops = window.SyncQueue.list();
    // for (const op of ops) {
    //   await fetch(cfg.supabase.url + '/rest/v1/' + op.table, { ... });
    // }
    // window.SyncQueue.clear();
    // return { sent: ops.length, skipped: false };

    return { sent: 0, skipped: false };
  },
};
