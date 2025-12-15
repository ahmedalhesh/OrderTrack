# حل مشكلة عدم ظهور الجداول في D1

## المشكلة

الجداول لا تظهر في قاعدة بيانات Cloudflare D1 بعد تطبيق migrations.

## الحلول

### 1. التحقق من database_id

أولاً، تأكد من أن `database_id` موجود في `wrangler.toml`:

```bash
# إنشاء قاعدة بيانات D1 إذا لم تكن موجودة
wrangler d1 create ordertrack-db
```

انسخ `database_id` من الإخراج وأضفه في `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "ordertrack-db"
database_id = "YOUR_DATABASE_ID_HERE"  # ضع الـ ID هنا
```

### 2. تطبيق Migrations

**الطريقة الموصى بها (استخدام ملف موحد):**

```bash
wrangler d1 execute ordertrack-db --file=./migrations/apply-to-d1.sql
```

**أو استخدام script:**

```powershell
# Windows
.\scripts\setup-d1.ps1
```

```bash
# Linux/Mac
chmod +x scripts/setup-d1.sh
./scripts/setup-d1.sh
```

### 3. التحقق من الجداول

بعد تطبيق migrations، تحقق من الجداول:

```bash
# عرض جميع الجداول
wrangler d1 execute ordertrack-db --command="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
```

يجب أن ترى:
- `customers`
- `orders`
- `settings`
- `users`

### 4. إذا كانت الجداول لا تزال لا تظهر

#### أ. التحقق من الأخطاء

```bash
# عرض آخر الأخطاء
wrangler d1 execute ordertrack-db --command="SELECT name FROM sqlite_master WHERE type='table';"
```

#### ب. حذف وإعادة إنشاء (⚠️ سيمسح البيانات)

```bash
# حذف قاعدة البيانات
wrangler d1 delete ordertrack-db

# إعادة إنشاء
wrangler d1 create ordertrack-db

# تحديث wrangler.toml بـ database_id الجديد

# تطبيق migrations من جديد
wrangler d1 execute ordertrack-db --file=./migrations/apply-to-d1.sql
```

#### ج. استخدام --remote

تأكد من استخدام `--remote` إذا كنت تريد تطبيق migrations على قاعدة البيانات البعيدة:

```bash
wrangler d1 execute ordertrack-db --remote --file=./migrations/apply-to-d1.sql
```

#### د. التحقق من database_id الصحيح

```bash
# عرض معلومات قاعدة البيانات
wrangler d1 info ordertrack-db
```

### 5. مشكلة statement-breakpoint

ملفات migrations الأصلية تحتوي على `--> statement-breakpoint` التي قد تسبب مشاكل. 
استخدم ملف `migrations/apply-to-d1.sql` الموحد الذي لا يحتوي على هذه التعليقات.

## نصائح إضافية

1. **استخدم --remote دائماً للإنتاج:**
   ```bash
   wrangler d1 execute ordertrack-db --remote --file=./migrations/apply-to-d1.sql
   ```

2. **تحقق من قاعدة البيانات المحلية:**
   ```bash
   wrangler d1 execute ordertrack-db --local --command="SELECT name FROM sqlite_master WHERE type='table';"
   ```

3. **استخدم wrangler dev للاختبار:**
   ```bash
   wrangler dev
   ```

## استكشاف الأخطاء

إذا واجهت خطأ "Couldn't find a D1 DB":
- تأكد من أن `database_id` موجود في `wrangler.toml`
- تأكد من أن `database_name` يطابق الاسم الذي أنشأته
- جرب `wrangler d1 list` لرؤية قواعد البيانات المتاحة

إذا واجهت أخطاء SQL:
- تأكد من استخدام ملف `apply-to-d1.sql` الموحد
- تحقق من syntax SQL (خاصة `IF NOT EXISTS` الذي قد لا يعمل في بعض الحالات)

