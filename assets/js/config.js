/* ============================================================
   config.js — إعدادات التشغيل — alfaprosys
   ============================================================ */
window.ALFA_CONFIG = {
  // trial  = نسخة تجريبية (ما قبل الربط)
  // prod   = عميل حقيقي
  mode: 'trial',

  // فعّلها عند ربط Supabase لتبدأ المزامنة
  syncEnabled: false,

  // تُعبَّأ لاحقًا عند الربط بقواعد البيانات
  supabase: { url: '', anonKey: '' },

  // مصدر الطلبات الأونلاين:
  //  - اترك endpoint فارغًا للوضع التجريبي (بيانات محلية).
  //  - أو ضع رابط دالة orders.js (Netlify) لسحب الطلبات من Google Sheet،
  //    أو لاحقًا اجعل remote.js يسحبها من جدول DB مخصص.
  onlineOrders: { endpoint: '', pin: '' },

  // الطباعة الحرارية عبر QZ Tray
  // ثبّت QZ Tray على جهاز الكاشير واترك أسماء الطابعات كما هي إن كانت نفس الأجهزة
  thermal: {
    printerCashier: 'RONGTA 80mm 2',              // طابعة الكاشير
    printerKitchen: 'RONGTA 80mm Series Printer', // طابعة المطبخ
    widthMm: 72,         // عرض قالب الفاتورة (72 يناسب طابعات 80مم)
    autoAfterSale: true, // طباعة تلقائية بعد كل عملية بيع (كاشير + مطبخ)
    kitchenCopy: true,   // إرسال نسخة للمطبخ تلقائياً

    // ── أمان QZ Tray ──
    // qzCert: الشهادة العامة فقط (Public Certificate) — آمن وضعه هنا
    //   ولّدها مرة واحدة بأداة QZ Tray: https://qz.io/wiki/app-certification
    //   ثم الصق محتوى public-cert.pem بين الـ backticks أدناه
    qzCert: '',   // ← ضع الشهادة العامة PEM هنا بعد التوليد

    // qzSecret: سر مشترك يُرسَل لـ Netlify Function sign.js للتحقق من المُرسِل
    //   ضع نفس القيمة في متغير بيئة Netlify: QZ_SIGN_SECRET
    //   تحذير: هذا ليس سراً حقيقياً (مرئي بالمتصفح) — هو حاجز بسيط فقط
    //   الحماية الحقيقية = المفتاح الخاص على Netlify (QZ_PRIVATE_KEY)
    qzSecret: '', // ← ضع قيمة عشوائية وضعها أيضاً في QZ_SIGN_SECRET على Netlify
  },
};

/* هوية المطعم — تُحرر من الإعدادات وتُطبق هنا على كل الشاشات والإيصالات */
try {
  const __b = JSON.parse(localStorage.getItem('alfaprosys_branding') || 'null');
  if (__b && __b.name) {
    window.ALFA_CONFIG.restaurantName = __b.name;
    window.ALFA_CONFIG.thermal.restaurantName = __b.name;
  }
  if (__b) window.ALFA_CONFIG.branding = __b;
} catch (e) {}
