/* ================================================================
   cashier_session.js — الوردية والصندوق — alfaprosys
   + الوردية العمياء (27): عند الإغلاق يُدخل الكاشير الموجود فعلياً
     في الدرج دون رؤية المتوقع — والفرق يظهر بعد الإغلاق فقط.
   ================================================================ */
const session = window.DEMO_DATA.cashierSession || {};
function now(){ return new Date().toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'}); }
function goPOS(){ location.href='pos.html'; }
/* ── المتوقع بالدرج: افتتاح الصندوق + مبيعات اليوم النقدية − مصروفات اليوم ── */
function expectedCash(){
  const today = businessDay();
  const invs = (window.DEMO_DATA.invoices||[]).filter(i =>
    (i.date||'') === today && i.status !== 'cancelled' && (i.pay_type||'cash') === 'cash');
  const cashSales = invs.reduce((s,i)=>s+(i.total||0),0);
  const exps = (window.DEMO_DATA.expenditures||[]).filter(x => (x.date||'')===today)
    .reduce((s,x)=>s+(x.amount||0),0);
  return { base:(session.opening_cash||0), cashSales, exps, expected:(session.opening_cash||0)+cashSales-exps };
}

/* ── نافذة الإغلاق الأعمى ── */
let blindOpen = false;
let closeResult = null;
function openBlindClose(){ blindOpen = true; render(); }
function cancelBlindClose(){ blindOpen = false; render(); }
function confirmBlindClose(){
  const counted = Number(document.getElementById('blindCounted')?.value || 0);
  if (!document.getElementById('blindCounted')?.value.trim())
    return showToast('أدخل الموجود فعلياً في الدرج أولاً', '⚠️');
  const exp = expectedCash();
  const diff = counted - exp.expected;
  closeResult = { at: now(), counted, expected: exp.expected, diff,
    cashSales: exp.cashSales, exps: exp.exps, base: exp.base };
  session.last_close = closeResult;
  session.shift_open = false;
  session.cashbox_open = false;   /* إغلاق الوردية يغلق الصندوق معه */
  blindOpen = false;
  render();
  showToast('أُغلقت الوردية — النتيجة أمامك الآن', '🕘');
}

function toggleShift(){
  if (session.shift_open) return openBlindClose();   /* الإغلاق أعمى دائماً */
  session.shift_open = true; session.shift_opened_at = now(); render();
  showToast('تم فتح الوردية','🕘');
}
function toggleCashbox(){
  const v = Number(document.getElementById('openingCash')?.value||0);
  if(!session.cashbox_open) session.opening_cash = v;
  session.cashbox_open = !session.cashbox_open;
  session.cashbox_opened_at = session.cashbox_open ? now() : '';
  render();
  showToast(session.cashbox_open?'تم فتح الصندوق':'تم إغلاق الصندوق','💵');
}
function dismissCloseResult(){ closeResult = null; render(); }

function render(){
 document.getElementById('sessionApp').innerHTML=`
  <div class="simple-shell">
   <header class="simple-topbar"><div><div class="pos-brand">alfaprosys</div><div class="pos-subtitle">الوردية والصندوق</div></div><button class="back-to-pos-btn" onclick="goPOS()">رجوع للبيع</button></header>
   <main class="simple-content session-grid">
    <section class="simple-card session-card">
      <div class="session-icon">🕘</div><h1>الوردية</h1>
      <div class="session-status ${session.shift_open?'open':'closed'}">${session.shift_open?'مفتوحة':'مغلقة'}</div>
      <p>${session.shift_open ? 'بدأت عند: '+e(session.shift_opened_at) : (session.last_close ? 'آخر إغلاق: '+e(session.last_close.at) : 'لم يتم فتح وردية بعد')}</p>
      <button class="${session.shift_open?'session-danger':'session-primary'}" onclick="toggleShift()">${session.shift_open?'🔒 إغلاق الوردية (عمياء)':'فتح الوردية'}</button>
      <p class="blind-hint">${session.shift_open ? 'ستُدخل الموجود فعلياً دون رؤية المتوقع — الفرق يظهر بعد الإغلاق' : ''}</p>
    </section>
    <section class="simple-card session-card">
      <div class="session-icon">💵</div><h1>الصندوق</h1>
      <div class="session-status ${session.cashbox_open?'open':'closed'}">${session.cashbox_open?'مفتوح':'مغلق'}</div>
      <label class="cash-input-label"><span>مبلغ افتتاح الصندوق</span><input id="openingCash" type="number" inputmode="numeric" value="${session.opening_cash||''}" placeholder="0"></label>
      <button class="${session.cashbox_open?'session-danger':'session-primary'}" onclick="toggleCashbox()">${session.cashbox_open?'إغلاق الصندوق':'فتح الصندوق'}</button>
    </section>
    <section class="simple-card session-summary">
      <h1>ملخص سريع</h1>
      <div><span>الكاشير</span><strong>${e(session.cashier_name)}</strong></div>
      <div><span>افتتاح الصندوق</span><strong>${fmtNum(session.opening_cash)} ل.س</strong></div>
      <div><span>الحالة</span><strong>${session.shift_open && session.cashbox_open ? 'جاهز للبيع' : 'غير مكتمل'}</strong></div>
      ${session.last_close ? `<div><span>آخر جرد (عمياء)</span><strong>${fmtNum(session.last_close.counted)} ل.س ${session.last_close.diff===0?'✓':(session.last_close.diff>0?'(زيادة +':'(نقص −')+fmtNum(Math.abs(session.last_close.diff))+')'}</strong></div>` : ''}
    </section>
   </main>

   ${blindOpen ? `
   <div class="blind-scrim"></div>
   <div class="blind-modal">
     <div class="blind-icon">🔒</div>
     <div class="blind-title">إغلاق الوردية — جرد أعمى</div>
     <p class="blind-sub">أحصِ ما في الدرج فعلياً وأدخله — النظام لا يريك المتوقع الآن، والفرق يظهر بعد الإغلاق</p>
     <label class="blind-field">
       <span>الموجود فعلياً في الدرج (ل.س)</span>
       <input id="blindCounted" type="number" inputmode="numeric" placeholder="0" autofocus>
     </label>
     <div class="blind-actions">
       <button class="blind-cancel" onclick="cancelBlindClose()">رجوع</button>
       <button class="blind-confirm" onclick="confirmBlindClose()">تأكيد الإغلاق</button>
     </div>
   </div>` : ''}

   ${closeResult ? `
   <div class="blind-scrim"></div>
   <div class="blind-modal blind-result">
     <div class="blind-icon">${closeResult.diff===0?'✅':(closeResult.diff>0?'📈':'🔴')}</div>
     <div class="blind-title">نتيجة الجرد — ${closeResult.diff===0?'مطابق تماماً':(closeResult.diff>0?'زيادة في الدرج':'نقص في الدرج')}</div>
     <div class="blind-rows">
       <div><span>المتوقع (افتتاح ${fmtNum(closeResult.base)} + نقدي ${fmtNum(closeResult.cashSales)} − مصروفات ${fmtNum(closeResult.exps)})</span><b>${fmtNum(closeResult.expected)} ل.س</b></div>
       <div><span>الموجود فعلياً</span><b>${fmtNum(closeResult.counted)} ل.س</b></div>
       <div class="${closeResult.diff<0?'blind-neg':closeResult.diff>0?'blind-pos':''}">
         <span>الفرق</span><b>${closeResult.diff>0?'+':''}${fmtNum(closeResult.diff)} ل.س</b></div>
     </div>
     <div class="blind-actions">
       <button class="blind-confirm" onclick="dismissCloseResult()">تم</button>
     </div>
   </div>` : ''}
  </div>`;
}
render();
