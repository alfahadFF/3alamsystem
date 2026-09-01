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

  /* شهادة العرض والمفتاح (زوج عرض QZ Tray) */
  const CERT = `-----BEGIN CERTIFICATE-----
MIIECzCCAvOgAwIBAgIGAaA/veRqMA0GCSqGSIb3DQEBCwUAMIGIMQswCQYDVQQGEwJS
EWJVUZELMAkGA1UECAwCTlkxEjAQBgNVBAcMCUNhbmFzdG90YTEbMBkGA1UECgwS
UVogSW5kdXN0cmllcywgTExDMRswGQYDVQQLDBJRWiBJbmR1c3RyaWVzLCBMTEMx
HDAaBgkqhkiG9w0BCQEWDXN1cHBvcnRAcXouaW8xGjAYBgNVBAMMEVFaIFRyYXkg
RGVtb3BDZXJ0MB4XDTI2MDgyNTIwMjEzOVoXDTQ2MDgyNTIwMjEzOVowgaIxCzAJ
BgNVBAYTA1VTMQswCQYDVQQIDAJOWTESMBAGA1UEBwwJQ2FuYXN0b3RhMRswGQYD
VQQKDBJRWiBJbmR1c3RyaWVzLCBMTEMxGzAZBgNVBAsMElFaIEluZHVzdHJpZXMs
IExMQzEcMBoGCSqGSIb3DQEJARYNc3VwcG9ydEBxei5pbzEaMBgGA1UEAwwRUVog
VHJheSBEZW1vIENlcnQwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDV
LyMbpsKa1C4GDxQ7eBq71Wgx1TvYCTjHEpkooNQ2N4xiYTUV3lojsQvZgHjOq7bA
sNG7pV6qgj3DG9kC4sVf3CBOWNlZhoR/RyQp91gXbx68++VfetLji1r4yYDayNGz
/Td1DHqRa7q46PSIg1fVmKNX6OXn92FK0BW0t0GUMZrJW61cjSJNblPbsbTwCrvJ
6lAfWezdcUx18t5kGSjhO3NQCG07d+FPjjgfN7MnwsSl8U2Y1LMyGv7WAhO+Gnxs
Dme216axbT1J8sBmUD1D4XGv10bOni65+w+LJ8zvN9E5v2ThPyuzkJrW3uNHMs3F
zJ60y8ZIqf5PpcRmyWe5AgMBAAGjRTBDMBIGA1UdEwEB/wQIMAYBAf8CAQEwDgYD
VR0PAQH/BAQDAgEGMB0GA1UdDgQWBBTTXOXckf+in8rarOpOdGxI1Lyu1zANBgkq
hkiG9w0BAQsFAAOCAQEAiEvnSf8RP1bBR+tCi6oWvEi0s0MfnCteaquFhg2I8zw6
Kn0FDF2CRJjdxm6tmoyYWU45zejm3XIDLR1zHqW8A5R6rY2yLx4HMV6c1dJasDKFq
gFEH5BbnxRgpU515T86GCjbXQinPyaSRauEFrDtyFG/dhsayA3veuUnY9vd07NbC
xkWIVtd8pW41EhkUkPz5nik4cihu5TgtMsKAZPWVPBQk4MjBej3IShoj116cxHpn
lO4clEmZTBAPZpVoD+65TpUfPdUhRQPfo+SNjKDMWTww5g8CNoXTsXPkYU9M554t
ZB7PTzwXB0Wnc+mALJ1VeYD0vQpiF37R5wW7B64+SA==
-----END CERTIFICATE-----`;
  const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDVLyMbpsKa1C4G
DxQ7eBq71Wgx1TvYCTjHEpkooNQ2N4xiYTUV3lojsQvZgHjOq7bAsNG7pV6qgj3D
G9kC4sVf3CBOWNlZhoR/RyQp91gXbx68++VfetLji1r4yYDayNGz/Td1DHqRa7q4
6PSIg1fVmKNX6OXn92FK0BW0t0GUMZrJW61cjSJNblPbsbTwCrvJ6lAfWezdcUx1
8t5kGSjhO3NQCG07d+FPjjgfN7MnwsSl8U2Y1LMyGv7WAhO+GnxsDme216axbT1J
8sBmUD1D4XGv10bOni65+w+LJ8zvN9E5v2ThPyuzkJrW3uNHMs3FzJ60y8ZIqf5P
pcRmyWe5AgMBAAECggEAQMhjv1XkQkwwVjgD2nSLjzPxR194oZRf1CMDNVtOuAsW
VpkapCwfMURUiOiBDbDnxtmUypsc2WzdrupJ/pYCC7jdemGGny2BGxp3O2aga3Kh
oSVdFTBCYNJq0TqOtS2cIdK1PpUNtB5MLj/gg1iSzv5k+OR15RFoV+83AWVFA06p
+QgO672zSOWI0iOdxB3G1Q+fDefE+DBhUp38sFLdeL3wC5dx5j8sMTjk4zS1rUQ2
RQceIUTG9lwYpa8RnLsERKOCmG07pI4sN8V1VFTL6z54xH6yHe1S8CojTj1IJ3XS
jjKmZZAikajtONW9wvByHLBhyv3Rcbrw/GxPaB+qHwKBgQDyipwf48sJ23fJFNOD
GbkBK6N35gREEVwWmdSf0RNxNa5NJczOnNS2xojKG05bfDa0U+NQ8mV1Rvw2Gn8/0
71OB12mcNXJp/fh0nUySrpOS6tgCFmCSd82SJcLJZ85FL9TDGeATpX0cIjiQTVF8
5JZnRH2juTo/7rE2gN2KC/2sAwKBgQDHA37wMxLLXVjdLEB5LjIn1hruzV36Sa2m
zNM6M0vSgvmhzPWJLn2foHBBAf1a+Gu+6BDFOZN1PJ6FqdmOscEeRj7hToL8zhE1
iN+SYEfzla9VYInyJ3Q12ppE6X3JHsOVm9E/Plz/n+bG5QLfzf/mBklTifttBxtd
WZ/ItyU2kwKBgQCZswMLJnTvk1HOiLcc/mEB/+CAq7AKX6VyTg36uuSM314fzNCF
7cw/xfSWQg7y3RzRDhqayGmd0hglVwL+1ILwvb3sOtB1oK8hX01WLvFwCgjHEd0z
FF6effV5YqiRsCT5W1lotdeZy4ni0EySg91YJcwkw83JE/8TVgiOYdjodwKBgQDb
t0gUBTYE4yEW4ORULSUxxQBfvN3Rj6WM4dGW3R8WHxdq/90NuFgD4/NSP4USGMd
hQmEj3oXjlVT6Evx9Ex4VwsFI17xcF554k89ZVqcldrhallUj2dC2DYF6L0Ow7bDp
07tdHYg36/Gy4U1PNV3dROIw1QwnhqTRoIRPv9ZM1QKBgCbkTSKeHaJrXVQT4PUq
xd3isKk54sy8IMwdc7E1ZrZ3PSspbk2hveka+r8b6fUsWDL/KwnD7YKnDz0Yjk9P
6a0BcLvEy61TBdJSm/c2R29eAg5Dt0dKaybeoAs+93fnyriJlsqFyd3tE0E2fKWw
ke8AX3+c3G5ou2OQWtBs+IVU
-----END PRIVATE KEY-----`;

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

  function setupSecurity() {
    qz.security.setCertificatePromise(resolve => resolve(CERT));
    qz.security.setSignatureAlgorithm('SHA512');
    qz.security.setSignaturePromise(toSign => (resolve, reject) => {
      try {
        const pk = KEYUTIL.getKey(PRIVATE_KEY);
        const sig = new KJUR.crypto.Signature({ alg: 'SHA512withRSA' });
        sig.init(pk);
        sig.updateString(toSign);
        resolve(stob64(hextorstr(sig.sign())));
      } catch (err) { reject(err); }
    });
  }

  async function connect() {
    if (state === 'connected' && window.qz && qz.websocket.isActive()) return true;
    try {
      setState('connecting');
      if (!window.qz) {
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jsrsasign/10.9.0/jsrsasign-all-min.js');
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
