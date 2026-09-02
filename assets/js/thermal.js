/* ================================================================
   thermal.js — الطباعة الحرارية عبر QZ Tray — alfaprosys
   نفس آلية نظام الطلبات الأونلاين: شهادة موقّعة + طباعة صامتة
   على طابعتين (كاشير + مطبخ)، مع بديل حوار الطباعة عند غياب QZ.
   الأسماء والعرض قابلة للتعديل من config.js ← thermal
   ================================================================ */
(function () {
  if (window.ThermalPrint) return;

  const CFG = () => (window.ALFA_CONFIG && window.ALFA_CONFIG.thermal) || {};
  const PRINTER_CASHIER = () => CFG().printerCashier || 'RONGTA 80mm 2';
  const PRINTER_KITCHEN = () => CFG().printerKitchen || 'RONGTA 80mm Series Printer';
  const WIDTH = () => Number(CFG().widthMm) || 72;
  const RESTAURANT = () => CFG().restaurantName || 'alfaprosys';

  /* ── الشهادة العامة فقط — تُوضع في config.js أو متغير بيئة
     المفتاح الخاص لا يُوضع هنا أبداً — التوقيع يتم سيرفرياً
     عبر netlify/functions/sign.js ── */
  const CERT = () => (window.ALFA_CONFIG && window.ALFA_CONFIG.thermal && window.ALFA_CONFIG.thermal.qzCert) || '';

  let state = 'idle'; // idle | connecting | connected | offline
  const handlers = [];
  function setState(s) { state = s; handlers.forEach(h => { try { h(s); } catch (e) {} }); }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const el = document.createElement('script');
      el.src = src;
      el.onload = resolve;
      el.onerror = () => reject(new Error('تحميل مكتبة فشل: ' + src));
      document.head.appendChild(el);
    });
  }

  /* التوقيع سيرفرياً عبر Netlify Function — المفتاح الخاص لا يغادر السيرفر */
  async function serverSign(toSign) {
    const secret = window.ALFA_CONFIG && window.ALFA_CONFIG.thermal && window.ALFA_CONFIG.thermal.qzSecret;
    const headers = { 'Content-Type': 'application/json' };
    if (secret) headers['x-qz-secret'] = secret;
    const res = await fetch('/.netlify/functions/sign', {
      method: 'POST',
      headers,
      body: JSON.stringify({ request: toSign }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error('sign failed: ' + (err.error || res.status));
    }
    const { signature } = await res.json();
    return signature;
  }

  function setupSecurity() {
    const cert = CERT();
    if (!cert) {
      console.warn('[ThermalPrint] qzCert غير مضبوط في config.js — أضف الشهادة العامة لـ ALFA_CONFIG.thermal.qzCert');
    }
    qz.security.setCertificatePromise(resolve => resolve(cert));
    qz.security.setSignatureAlgorithm('SHA512');
    /* التوقيع يُرسَل لـ Netlify Function ولا يتم محلياً أبداً */
    qz.security.setSignaturePromise(toSign => (resolve, reject) => {
      serverSign(toSign).then(resolve).catch(reject);
    });
  }

  async function connect() {
    if (state === 'connected' && window.qz && qz.websocket.isActive()) return true;
    try {
      setState('connecting');
      if (!window.qz) {
        // jsrsasign لم تعد مطلوبة (التوقيع سيرفري) — نحمّل qz-tray فقط
        await loadScript('https://cdn.jsdelivr.net/npm/qz-tray@2.2.6/qz-tray.min.js');
      }
      setupSecurity();
      if (!qz.websocket.isActive()) await qz.websocket.connect({ retries: 3, delay: 2 });
      setState('connected');
      return true;
    } catch (err) {
      setState('offline');
      return false;
    }
  }

  function isActive() { return state === 'connected' && window.qz && qz.websocket.isActive(); }

  function esc(v) { return String(v ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch])); }
  function fmtN(n) { return Number(n || 0).toLocaleString('en-US'); }

  function typeLabel(inv) {
    if (inv.is_online || inv.source_order_id) return 'طلب أونلاين';
    return ({ table: 'طلب طاولة', takeaway: 'سفري', delivery: 'توصيل', contract: 'عقد' })[inv.type] || 'طلب';
  }
  function payLabel(inv) {
    return ({ cash: 'نقداً', wallet: 'محفظة', partial: 'دفع جزئي', deferred: 'آجل' })[inv.pay_type] || (inv.pay_type || '');
  }

  /* قالب الإيصال — عرض قابل للضبط (72مم افتراضياً) */
  function receiptHtml(inv, opts = {}) {
    const w = WIDTH();
    const kitchen = !!opts.kitchen;
    const no = window.invoiceNo ? window.invoiceNo(inv) : String(inv.no != null ? inv.no : (inv.id || ''));
    const items = inv.items || [];
    const sub = items.reduce((s, x) => s + (Number(x.price) || 0) * (Number(x.qty) || 0), 0);
    const disc = Number(inv.discount) || 0;
    const total = Number(inv.total != null ? inv.total : Math.max(0, sub - disc));
    const showTurn = ['takeaway', 'delivery'].includes(inv.type) || inv.queue_no;

    const rows = items.filter(it => !(kitchen && it.offer_disc)).map(it => kitchen
      ? `<tr><td style="border:1px solid #000;padding:3px 2px;text-align:right;font-weight:bold;font-size:11px;">${it.is_free ? '🎁 ' : ''}${esc(it.name)}</td><td style="border:1px solid #000;padding:3px 2px;text-align:center;font-weight:900;font-size:12px;">${Number(it.qty) || 1}</td><td style="border:1px solid #000;padding:3px 2px;text-align:center;font-size:9.5px;word-wrap:break-word;">${esc(it.note || '')}</td></tr>`
      : `<tr><td style="border:1px solid #000;padding:3px 2px;text-align:right;font-weight:bold;font-size:10px;">${it.offer_id ? '🎟️ ' : ''}${esc(it.name)}</td><td style="border:1px solid #000;padding:3px 2px;text-align:center;font-size:10px;">${Number(it.qty) || 1}</td><td style="border:1px solid #000;padding:3px 2px;text-align:center;font-size:10px;">${fmtN(it.price)}</td><td style="border:1px solid #000;padding:3px 2px;text-align:center;font-weight:bold;font-size:10px;">${fmtN((Number(it.price) || 0) * (Number(it.qty) || 1))}</td></tr>`
    ).join('');

    return `
      <div style="width:${w}mm;max-width:${w}mm;min-width:${w}mm;margin:0;padding:0 1.5mm;font-family:Tahoma,Arial,sans-serif;color:#000;direction:rtl;text-align:right;box-sizing:border-box;line-height:1.25;background:#fff;">
        <div style="text-align:center;border-bottom:1px dashed #000;padding-bottom:4px;margin-bottom:4px;">
          <div style="font-size:15px;font-weight:900;margin:1px 0;">${esc(RESTAURANT())}</div>
          ${(window.ALFA_CONFIG && ALFA_CONFIG.branding && ALFA_CONFIG.branding.address) ? `<div style="font-size:10px;font-weight:bold;">${esc(ALFA_CONFIG.branding.address)}</div>` : ''}
          ${(window.ALFA_CONFIG && ALFA_CONFIG.branding && ALFA_CONFIG.branding.phone) ? `<div style="font-size:10px;font-weight:bold;">هاتف: ${esc(ALFA_CONFIG.branding.phone)}</div>` : ''}
          ${kitchen ? `<div style="font-size:12px;font-weight:900;">🍳 نسخة المطبخ</div>` : ''}
          <div style="font-size:11px;font-weight:bold;background:#eee;padding:1px;border-radius:3px;margin-top:2px;">${esc(typeLabel(inv))}${inv.type === 'table' && inv.table_label ? ' — ' + esc((inv.hall || '') + ' ' + inv.table_label) : ''}</div>
        </div>

        <div style="border:2px solid #000;border-radius:6px;padding:4px 2px;margin:5px 0;text-align:center;background:#fafafa;">
          <div style="font-size:11px;font-weight:bold;color:#222;">${kitchen ? 'رقم الطلب' : 'رقم الفاتورة'}${showTurn ? ' · الدور' : ''}</div>
          <div style="font-size:24px;font-weight:900;letter-spacing:2px;line-height:1.1;margin-top:1px;">${esc(no)}</div>
        </div>

        <div style="display:flex;justify-content:space-between;font-size:10.5px;font-weight:bold;border-bottom:1px dashed #000;padding-bottom:4px;margin-bottom:4px;">
          <span>التاريخ:</span><span style="direction:ltr;">${esc(inv.date || '')} ${esc(inv.time || '')}</span>
        </div>

        ${(inv.customer_name || inv.phone) ? `
        <div style="border-bottom:1px dashed #000;padding-bottom:5px;margin-bottom:4px;font-size:12px;line-height:1.45;">
          ${inv.customer_name ? `<div style="display:flex;justify-content:space-between;"><span style="font-weight:bold;min-width:55px;">الزبون:</span><strong>${esc(inv.customer_name)}</strong></div>` : ''}
          ${inv.phone ? `<div style="display:flex;justify-content:space-between;"><span style="font-weight:bold;min-width:55px;">الهاتف:</span><strong style="direction:ltr;">${esc(inv.phone)}</strong></div>` : ''}
        </div>` : ''}

        <table style="width:100%;border-collapse:collapse;border:1px solid #000;margin:4px 0;table-layout:fixed;">
          <thead><tr style="background-color:#eee;">
            ${kitchen
              ? '<th style="border:1px solid #000;padding:3px 1px;width:52%;font-size:9.5px;">الصنف</th><th style="border:1px solid #000;padding:3px 1px;width:14%;font-size:9.5px;">كمية</th><th style="border:1px solid #000;padding:3px 1px;width:34%;font-size:9.5px;">ملاحظات</th>'
              : '<th style="border:1px solid #000;padding:3px 1px;width:46%;font-size:9.5px;">الصنف</th><th style="border:1px solid #000;padding:3px 1px;width:12%;font-size:9.5px;">كمية</th><th style="border:1px solid #000;padding:3px 1px;width:20%;font-size:9.5px;">السعر</th><th style="border:1px solid #000;padding:3px 1px;width:22%;font-size:9.5px;">إجمالي</th>'}
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>

        ${kitchen ? '' : `
        <table style="width:100%;border-collapse:collapse;border:1px solid #000;margin-bottom:4px;font-size:11px;font-weight:bold;">
          <tr><td style="border:1px solid #000;padding:2px 4px;text-align:right;">المجموع</td><td style="border:1px solid #000;padding:2px 4px;text-align:center;">${fmtN(sub)}</td></tr>
          ${disc ? `<tr><td style="border:1px solid #000;padding:2px 4px;text-align:right;">الخصم</td><td style="border:1px solid #000;padding:2px 4px;text-align:center;">${fmtN(disc)}-</td></tr>` : ''}
          <tr style="background:#eee;"><td style="border:1px solid #000;padding:3px 4px;text-align:right;font-size:12px;">الإجمالي النهائي</td><td style="border:1px solid #000;padding:3px 4px;text-align:center;font-size:13px;font-weight:900;">${fmtN(total)} ل.س</td></tr>
          ${payLabel(inv) ? `<tr><td style="border:1px solid #000;padding:2px 4px;text-align:right;">الدفع</td><td style="border:1px solid #000;padding:2px 4px;text-align:center;">${esc(payLabel(inv))}</td></tr>` : ''}
        </table>`}

        <div style="text-align:center;font-size:11.5px;font-weight:bold;margin-top:3px;padding-bottom:4mm;">شكراً لزيارتكم 🌟</div>
      </div>`;
  }

  function ensureContainer() {
    let c = document.getElementById('printable-receipt');
    if (!c) { c = document.createElement('div'); c.id = 'printable-receipt'; document.body.appendChild(c); }
    return c;
  }
  function fallbackPrint(html) {
    ensureContainer().innerHTML = html;
    setTimeout(() => window.print(), 80);
  }

  /* الطباعة: صامتة عبر QZ إن كانت متصلة، وإلا حوار طباعة المتصفح */
  async function print(inv, opts = {}) {
    const html = receiptHtml(inv, opts);
    if (isActive()) {
      try {
        const printOptions = { size: { width: WIDTH() }, units: 'mm', margins: 0, rasterize: false, colorType: 'monochrome' };
        const data = [{ type: 'pixel', format: 'html', flavor: 'plain', data: html }];
        const config = qz.configs.create(opts.kitchen ? PRINTER_KITCHEN() : PRINTER_CASHIER(), printOptions);
        await qz.print(config, data);
        return 'qz';
      } catch (err) { console.error('QZ print failed:', err); }
    }
    fallbackPrint(html);
    return 'dialog';
  }

  /* بعد كل عملية بيع: إيصال كاشير + نسخة مطبخ (حسب config.js) */
  async function afterSale(inv) {
    try {
      await connect();
      await print(inv, {});
      if (CFG().kitchenCopy !== false) await print(inv, { kitchen: true });
    } catch (e) { fallbackPrint(receiptHtml(inv, {})); }
  }

  window.ThermalPrint = {
    connect,
    print,
    afterSale,
    receiptHtml,
    isActive,
    onStatus(fn) { if (typeof fn === 'function') handlers.push(fn); },
    state: () => state,
    printers: () => ({ cashier: PRINTER_CASHIER(), kitchen: PRINTER_KITCHEN(), widthMm: WIDTH() }),
  };
})();
