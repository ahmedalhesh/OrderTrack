# دليل النشر على Cloudflare

## نظرة عامة

يمكن نشر التطبيق على Cloudflare باستخدام:
- **Cloudflare Workers** لتشغيل API
- **Cloudflare Pages** للواجهة الأمامية (اختياري)
- **Cloudflare D1** لقاعدة البيانات SQLite

⚠️ **ملاحظة مهمة**: التطبيق الحالي مبني على Express.js و better-sqlite3، والتي لا تعمل مباشرة على Cloudflare Workers. ستحتاج إلى إعادة هيكلة جزئية.

## الخيارات المتاحة

### الخيار 1: استخدام Cloudflare Workers + D1 (موصى به)

**المميزات:**
- ✅ سريع جداً (edge computing)
- ✅ مجاني في الخطة الأساسية (100,000 طلب/يوم)
- ✅ D1 قاعدة بيانات SQLite مجانية حتى 5GB
- ✅ WebSocket مدعوم

**العيوب:**
- ⚠️ يحتاج إعادة كتابة للكود (استبدال Express بـ Hono أو Worktop)
- ⚠️ استبدال better-sqlite3 بـ Drizzle ORM مع D1 adapter
- ⚠️ بعض مكتبات Node.js قد لا تعمل

### الخيار 2: استخدام Cloudflare Pages + Worker (هجين)

**المميزات:**
- ✅ Pages للواجهة الأمامية (React)
- ✅ Worker للـ API
- ✅ D1 للقاعدة البيانات

**العيوب:**
- ⚠️ نفس التعديلات المطلوبة في الخيار 1

### الخيار 3: النشر التقليدي + Cloudflare CDN/Proxy

**المميزات:**
- ✅ لا يحتاج تعديلات على الكود
- ✅ استضافة على VPS عادي
- ✅ Cloudflare كـ CDN و DDoS protection

**العيوب:**
- ⚠️ تحتاج VPS (غير مجاني)

## الخطوات للنشر على Cloudflare Workers + D1

### 1. إعداد Cloudflare D1 Database

```bash
# تثبيت Wrangler (CLI لـ Cloudflare)
npm install -g wrangler

# تسجيل الدخول
wrangler login

# إنشاء قاعدة بيانات D1
wrangler d1 create ordertrack-db
```

سيتم إنشاء قاعدة بيانات وإعطاؤك `database_id`.

### 2. تحديث الكود للعمل مع Cloudflare Workers

#### أ. تثبيت المكتبات المطلوبة

```bash
npm install hono @cloudflare/workers-types drizzle-orm
npm install -D @drizzle-team/drizzle-kit drizzle-kit-cf
```

#### ب. إنشاء `wrangler.toml`

```toml
name = "ordertrack"
main = "src/worker.ts"
compatibility_date = "2024-01-01"
node_compat = true

[[d1_databases]]
binding = "DB"
database_name = "ordertrack-db"
database_id = "YOUR_DATABASE_ID"

[env.production.vars]
NODE_ENV = "production"
```

#### ج. تعديل `server/db.ts` للعمل مع D1

```typescript
// server/db-d1.ts
import { drizzle } from "drizzle-orm/d1";
import * as schema from "@shared/schema";

export function createD1Database(env: { DB: D1Database }) {
  return drizzle(env.DB, { schema });
}
```

#### د. إنشاء Worker بدلاً من Express

```typescript
// src/worker.ts
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createD1Database } from "./db-d1";

type Env = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use("*", cors());

// Routes
app.get("/api/health", (c) => {
  return c.json({ status: "ok" });
});

// ... باقي الـ routes

export default app;
```

### 3. تحديث Drizzle للعمل مع D1

```bash
# تحديث drizzle.config.ts
npm install -D drizzle-kit-cf
```

```typescript
// drizzle.config.ts
import type { Config } from "drizzle-kit";

export default {
  schema: "./shared/schema.ts",
  out: "./migrations",
  dialect: "sqlite",
  driver: "d1",
  dbCredentials: {
    wranglerConfigPath: "./wrangler.toml",
    dbName: "ordertrack-db",
  },
} satisfies Config;
```

### 4. تطبيق Migrations على D1

```bash
# تطبيق migrations
wrangler d1 migrations apply ordertrack-db
```

### 5. النشر

```bash
# البناء
npm run build

# النشر
wrangler deploy
```

## التكلفة

### Cloudflare Workers (Free Tier)
- 100,000 طلب/يوم مجاناً
- بعدها: $5/مليون طلب

### Cloudflare D1 (Free Tier)
- 5GB storage مجاناً
- بعدها: $0.001/GB read, $0.001/GB write

### Cloudflare Pages
- مجاني تماماً للاستخدام الشخصي

## بدائل أسهل للنشر

إذا كنت تريد حل سريع بدون تعديلات كبيرة:

### 1. Railway.app
- ✅ يدعم Node.js مباشرة
- ✅ قاعدة بيانات SQLite مضمنة
- ✅ مجاني $5/شهر

### 2. Render.com
- ✅ يدعم Node.js
- ✅ قاعدة بيانات مجانية
- ✅ مجاني للاستخدام الشخصي

### 3. Fly.io
- ✅ يدعم Node.js
- ✅ قاعدة بيانات SQLite
- ✅ مجاني حتى 3 VMs

### 4. VPS تقليدي + Cloudflare Proxy
- DigitalOcean, Linode, أو Vultr
- $5-10/شهر
- Cloudflare مجاني كـ CDN

## توصية

**للنشر السريع بدون تعديلات:**
استخدم **Railway** أو **Render** - كلاهما يدعم تطبيقك الحالي مباشرة.

**للاستفادة من Cloudflare Edge Network:**
ستحتاج إلى إعادة هيكلة الكود للعمل مع Workers + D1.

هل تريد المساعدة في:
1. إعداد النشر على Railway/Render (أسهل)؟
2. إعادة هيكلة الكود للعمل مع Cloudflare Workers + D1 (أكثر تعقيداً)؟

