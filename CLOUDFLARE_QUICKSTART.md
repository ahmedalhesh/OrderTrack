# دليل سريع للنشر على Cloudflare

## الخطوات السريعة

### 1. تثبيت المتطلبات

```bash
npm install
npm install -g wrangler
```

### 2. تسجيل الدخول في Cloudflare

```bash
wrangler login
```

### 3. إنشاء قاعدة بيانات D1

```bash
wrangler d1 create ordertrack-db
```

انسخ `database_id` من الإخراج وأضفه في `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "ordertrack-db"
database_id = "YOUR_DATABASE_ID_HERE"  # ضع الـ ID هنا
```

### 4. تطبيق Migrations

**الطريقة الموصى بها (الأسهل):**

```bash
# استخدام ملف migration موحد
wrangler d1 execute ordertrack-db --file=./migrations/apply-to-d1.sql
```

**أو تطبيق migrations منفصلة:**

```bash
# تطبيق migrations بالتسلسل
wrangler d1 execute ordertrack-db --file=./migrations/0000_acoustic_metal_master.sql
wrangler d1 execute ordertrack-db --file=./migrations/0001_watery_shadowcat.sql
wrangler d1 execute ordertrack-db --file=./migrations/0002_familiar_johnny_storm.sql
wrangler d1 execute ordertrack-db --file=./migrations/0003_cultured_mastermind.sql
```

**التحقق من الجداول:**

```bash
# عرض جميع الجداول
wrangler d1 execute ordertrack-db --command="SELECT name FROM sqlite_master WHERE type='table';"

# أو عرض محتوى جدول معين
wrangler d1 execute ordertrack-db --command="SELECT * FROM users LIMIT 5;"
```

### 5. إعداد Secrets

```bash
wrangler secret put SESSION_SECRET
# أدخل مفتاح سري قوي عندما يُطلب منك
```

### 6. بناء والنشر

```bash
npm run build:worker
npm run deploy:worker
```

أو مباشرة:

```bash
wrangler deploy
```

### 7. إنشاء حساب المدير الأولي

```bash
curl -X POST https://YOUR_WORKER_URL.workers.dev/api/auth/setup
```

## نشر الواجهة الأمامية

الواجهة الأمامية (React) تحتاج نشر منفصل. خيارات:

### الخيار 1: Cloudflare Pages (موصى به)

```bash
# بناء الواجهة الأمامية
npm run build

# نشر على Cloudflare Pages
wrangler pages deploy dist/public
```

أو ربط مستودع GitHub:
1. اذهب إلى Cloudflare Dashboard > Pages
2. Create a project > Connect to Git
3. اختر مستودعك
4. Build command: `npm run build`
5. Build output directory: `dist/public`

### الخيار 2: VPS منفصل

استخدم VPS عادي لنشر الواجهة الأمامية، ثم حدّث API URLs في `.env` لتشير إلى Worker URL.

## تحديث API URLs في الواجهة الأمامية

في ملف `client/src/lib/queryClient.ts`، تأكد من أن API base URL يشير إلى Worker URL:

```typescript
const API_BASE = import.meta.env.VITE_API_URL || "https://YOUR_WORKER.workers.dev";
```

## ملاحظات مهمة

1. **WebSocket**: لا يعمل على Workers مباشرة. يحتاج Durable Objects أو استخدام polling بدلاً منه.

2. **Static Files**: يجب نشر الواجهة الأمامية على Pages أو VPS منفصل.

3. **Database**: D1 مجاني حتى 5GB - كافٍ للاستخدام الشخصي/الصغير.

4. **Costs**: 
   - Workers: 100K requests/day مجاناً
   - D1: 5GB مجاناً
   - Pages: مجاني تماماً

## استكشاف الأخطاء

```bash
# عرض السجلات
wrangler tail

# اختبار محلي
wrangler dev

# فحص قاعدة البيانات
wrangler d1 execute ordertrack-db --command="SELECT * FROM settings"
```

