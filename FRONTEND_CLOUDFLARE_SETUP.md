# إعداد الواجهة الأمامية للعمل مع Cloudflare

تم تحديث الواجهة الأمامية لدعم العمل مع Cloudflare Workers.

## الإعداد

### 1. متغير البيئة

أنشئ ملف `.env` في مجلد `client/`:

```env
# للتطوير المحلي (مع proxy)
VITE_API_URL=/api

# للعمل مع Cloudflare Workers
VITE_API_URL=https://your-worker-name.workers.dev/api
```

### 2. التطوير المحلي

إذا كنت تستخدم Vite proxy (في `vite.config.ts`):

```env
VITE_API_URL=/api
```

### 3. الإنتاج (Cloudflare Workers)

حدد URL الـ Worker:

```env
VITE_API_URL=https://ordertrack.workers.dev/api
```

## البناء

```bash
cd client
npm run build
```

الملفات المبنية ستكون في `dist/` ويمكن نشرها على:
- Cloudflare Pages
- VPS عادي
- أي static hosting service

## النشر على Cloudflare Pages

### الطريقة 1: من سطر الأوامر

```bash
# بناء الواجهة الأمامية (من المجلد الجذر)
npm run build

# نشر على Cloudflare Pages
# الملفات المبنية تكون في dist/public
wrangler pages deploy dist/public --project-name=ordertrack-frontend
```

**ملاحظة:** البناء الحالي يستخدم `npm run build` من المجلد الجذر ويضع الملفات في `dist/public`.

### الطريقة 2: من GitHub

1. اذهب إلى Cloudflare Dashboard > Pages
2. Create a project > Connect to Git
3. اختر مستودع GitHub
4. Build settings:
   - **Build command:** `npm install && npm run build` ⚠️ **مهم: من المجلد الجذر**
   - **Build output directory:** `dist/public` ⚠️ **مهم: هذا هو المجلد الصحيح**
   - **Root directory:** (اتركه فارغاً أو `./`)
5. Environment variables:
   - `VITE_API_URL`: `https://your-worker.workers.dev/api`

**⚠️ تحذير:** تأكد من أن Build command هو `npm install && npm run build` (من الجذر) وليس `cd client && npm install && npm run build`، لأن `npm run build` يبني كل شيء من الجذر.

## تحديث API URL بعد النشر

بعد نشر الواجهة الأمامية على Pages، حدّث `VITE_API_URL` في Environment Variables في Cloudflare Pages dashboard.

## الملفات المحدثة

- ✅ `client/src/lib/api.ts` - جديد: API configuration helper
- ✅ `client/src/lib/queryClient.ts` - محدث: يستخدم `getApiUrl`
- ✅ `client/src/pages/CustomerLogin.tsx` - محدث: يستخدم `getApiUrl`
- ✅ `client/src/pages/AdminLogin.tsx` - محدث: يستخدم `getApiUrl`
- ⚠️ باقي الملفات - تحتاج تحديث يدوي (أو استخدم `getApiUrl` في fetch calls)

## ملاحظات

- جميع استدعاءات API التي تستخدم `queryClient` (React Query) تعمل تلقائياً
- استدعاءات `fetch` المباشرة تحتاج إلى استيراد `getApiUrl` واستخدامها
- مثال:

```typescript
import { getApiUrl } from "@/lib/api";

const response = await fetch(getApiUrl("/api/customer/login"), {
  method: "POST",
  // ...
});
```

