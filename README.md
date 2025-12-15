# OrderTrack - نظام إدارة وتتبع الطلبيات

نظام شامل لإدارة وتتبع الطلبيات مع واجهة عملاء متقدمة ولوحة تحكم إدارية.

## المميزات

- ✅ **لوحة تحكم إدارية** كاملة لإدارة الطلبيات والعملاء
- ✅ **واجهة عملاء** لتتبع الطلبيات وحالة الطلبات
- ✅ **تتبع متقدم** لحالة الطلبيات مع شريط تقدم تفاعلي
- ✅ **إشعارات المتصفح** لتحديثات الطلبيات
- ✅ **نظام إعدادات** لإدارة بيانات الشركة وترقيم الطلبيات
- ✅ **WebSocket** للتحديثات الفورية
- ✅ **واجهة مستخدم حديثة** مع دعم RTL

## التقنيات المستخدمة

- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Backend:** Express.js + TypeScript
- **Database:** SQLite (better-sqlite3)
- **ORM:** Drizzle ORM
- **Authentication:** JWT
- **Real-time:** WebSocket (ws)
- **Build:** esbuild + Vite

## البدء السريع

### التثبيت

```bash
# استنساخ المستودع
git clone https://github.com/ahmedalhesh/OrderTrack.git
cd OrderTrack

# تثبيت التبعيات
npm install

# إعداد المتغيرات البيئية
cp .env.example .env
# عدّل ملف .env حسب الحاجة

# بناء قاعدة البيانات
npm run db:push

# تشغيل في وضع التطوير
npm run dev
```

### البناء للإنتاج

```bash
npm run build
npm start
```

## التوثيق الكامل

راجع [DEPLOYMENT.md](./DEPLOYMENT.md) للحصول على دليل مفصل للنشر والتكوين.

## النشر

### باستخدام PM2

```bash
npm run build
pm2 start ecosystem.config.js
```

### باستخدام Docker

```bash
docker-compose up -d
```

## البنية

```
├── client/          # كود الواجهة الأمامية (React)
├── server/          # كود الخادم (Express)
├── shared/          # الكود المشترك (Schemas)
├── migrations/      # Migrations قاعدة البيانات
├── data/            # قاعدة البيانات (SQLite)
└── dist/            # ملفات البناء
```

## المتغيرات البيئية

| المتغير | الوصف | الافتراضي |
|---------|-------|-----------|
| `PORT` | منفذ السيرفر | `5005` |
| `DATABASE_URL` | مسار قاعدة البيانات | `./data/database.sqlite` |
| `SESSION_SECRET` | مفتاح JWT السري | يجب تعيينه |
| `NODE_ENV` | بيئة التشغيل | `production` |

## المساهمات

نرحب بالمساهمات! يرجى فتح Pull Request أو Issue.

## الترخيص

MIT

## المطور

تم التطوير بواسطة [washq.ly](http://washq.ly/)
