// push.js — إرسال إشعارات Web Push للهاتف (يُفعَّل عند النشر والربط)
// يعمل بعد وضع مفتاحَي VAPID في متغيرات بيئة Netlify:
//   VAPID_PUBLIC  / VAPID_PRIVATE  / VAPID_SUBJECT (mailto:admin@example.com)
// ويثبَّت web-push:  npm i web-push   (ثم: npx web-push generate-vapid-keys)
// الاشتراكات تُجلب من جدول push_subscriptions في Supabase عند الربط.
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  /* تحقق من السر المشترك — يُفعَّل بوضع PUSH_SHARED_SECRET في متغيرات Netlify
     يُرسَل من الكود الأمامي كـ header: x-push-secret */
  const expected = process.env.PUSH_SHARED_SECRET;
  if (expected && event.headers['x-push-secret'] !== expected) {
    return { statusCode: 401, body: JSON.stringify({ error: 'unauthorized' }) };
  }

  let payload;
  try { payload = JSON.parse(event.body || '{}'); } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'bad json' }) };
  }
  const { title = '🔔 alfaprosys', body = '', url = 'dashboard.html', subscriptions = [] } = payload;

  // قبل الربط: لا اشتراكات خادمية — استجابة صريحة بدل الفشل الصامت
  if (!process.env.VAPID_PRIVATE || !subscriptions.length) {
    return {
      statusCode: 200,
      body: JSON.stringify({ sent: 0, note: 'push not configured yet or no subscriptions' }),
    };
  }

  const webpush = require('web-push');
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
    process.env.VAPID_PUBLIC,
    process.env.VAPID_PRIVATE
  );

  const results = await Promise.allSettled(subscriptions.map((sub) =>
    webpush.sendNotification(sub, JSON.stringify({ title, body, url }))
  ));

  return {
    statusCode: 200,
    body: JSON.stringify({
      sent: results.filter((r) => r.status === 'fulfilled').length,
      failed: results.filter((r) => r.status === 'rejected').length,
    }),
  };
};
