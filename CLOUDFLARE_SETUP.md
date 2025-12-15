# دليل إعداد Cloudflare Workers + D1

هذا دليل سريع لإعداد التطبيق على Cloudflare.

## ملاحظة مهمة

⚠️ **التطبيق الحالي مبني على Express.js و better-sqlite3**، وهذه لا تعمل مباشرة على Cloudflare Workers. تم إنشاء ملفات دعم أولية لكن **التحويل الكامل لم يكتمل بعد**.

للنشر الكامل على Cloudflare ستحتاج إلى:
1. تحويل جميع routes من Express إلى Hono (لم يكتمل بعد)
2. إضافة WebSocket support باستخدام Durable Objects (اختياري)
3. تحويل static file serving

## البديل الأسهل (موصى به)

استخدم **Railway** أو **Render** - كلاهما يدعم تطبيقك الحالي مباشرة بدون تعديلات.

راجع `DEPLOYMENT.md` للتفاصيل.

## إذا أردت المتابعة مع Cloudflare

### 1. تثبيت Wrangler

```bash
npm install -g wrangler
```

### 2. تسجيل الدخول

```bash
wrangler login
```

### 3. إنشاء قاعدة بيانات D1

```bash
wrangler d1 create ordertrack-db
```

انسخ `database_id` وأضفه في `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "ordertrack-db"
database_id = "YOUR_DATABASE_ID_HERE"
```

### 4. تطبيق Migrations

```bash
# نسخ migrations إلى D1
# يمكن استخدام wrangler مباشرة أو drizzle-kit
wrangler d1 migrations apply ordertrack-db --local  # للتطوير المحلي
wrangler d1 migrations apply ordertrack-db          # للإنتاج
```

أو استخدام drizzle-kit:

```bash
# تحديث wrangler.toml أولاً بإضافة database_id
drizzle-kit push --config=drizzle.config.d1.ts
```

### 5. البناء والنشر

```bash
# بناء الـ worker
npm run build:worker

# النشر
npm run deploy:worker
# أو
wrangler deploy
```

### 6. إعداد متغيرات البيئة (اختياري)

في Cloudflare Dashboard:
- اذهب إلى Workers & Pages > Your Worker > Settings > Variables
- أضف `SESSION_SECRET` كـ Secret Variable

أو في `wrangler.toml`:

```toml
[vars]
SESSION_SECRET = "your-secret-key-here"
```

⚠️ **لا تضيف secrets في wrangler.toml مباشرة!** استخدم Secrets:

```bash
wrangler secret put SESSION_SECRET
```

## حالة الملفات

✅ **مكتمل:**
- `server/db-d1.ts` - D1 database adapter
- `server/storage-d1.ts` - Storage layer للعمل مع D1
- `wrangler.toml` - إعدادات Cloudflare Worker
- `drizzle.config.d1.ts` - إعدادات Drizzle للعمل مع D1

⚠️ **قيد العمل:**
- `src/worker.ts` - Worker الرئيسي (لم يُنشأ بعد)
- `server/routes-worker.ts` - تحويل routes من Express إلى Hono (لم يُنشأ بعد)

⚠️ **غير متوفر/يحتاج إعداد:**
- WebSocket support (يحتاج Durable Objects - لم يتم تنفيذه)
- Static file serving (يحتاج Cloudflare Pages أو R2 - للواجهة الأمامية)
- Frontend build (يحتاج نشر منفصل على Pages أو VPS)

## التوصية

للنشر السريع: استخدم **Railway** أو **Render**.

للعمل مع Cloudflare: أتم التطوير أولاً ثم راجع هذا الدليل.

