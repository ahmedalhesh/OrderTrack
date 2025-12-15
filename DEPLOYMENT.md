# دليل النشر - OrderTrack

## المتطلبات الأساسية

- Node.js 20 أو أحدث
- npm أو yarn
- Git

## الإعداد الأولي

### 1. استنساخ المستودع

```bash
git clone https://github.com/ahmedalhesh/OrderTrack.git
cd OrderTrack
```

### 2. تثبيت التبعيات

```bash
npm install
```

### 3. إعداد المتغيرات البيئية

انسخ ملف `.env.example` إلى `.env` وعدّل القيم:

```bash
cp .env.example .env
```

عدّل ملف `.env`:

```env
PORT=5005
DATABASE_URL=./data/database.sqlite
SESSION_SECRET=your-strong-secret-key-here
NODE_ENV=production
```

**⚠️ مهم:** غيّر `SESSION_SECRET` إلى مفتاح قوي وعشوائي في الإنتاج!

### 4. بناء قاعدة البيانات

```bash
npm run db:push
```

### 5. إنشاء حساب المدير الأولي (اختياري)

يمكنك إنشاء حساب المدير الافتراضي عبر API:

```bash
curl -X POST http://localhost:5005/api/auth/setup
```

أو تسجيل الدخول مباشرة إذا كان الحساب موجوداً (افتراضي: admin/admin123)

## البناء

### بناء التطبيق للإنتاج

```bash
npm run build
```

هذا الأمر سيقوم بـ:
- بناء ملفات العميل (Client) إلى `dist/public`
- تجميع ملفات السيرفر (Server) إلى `dist/index.cjs`

## التشغيل

### الوضع التطويري

```bash
npm run dev
```

### الوضع الإنتاجي

```bash
npm start
```

التطبيق سيعمل على المنفذ المحدد في متغير البيئة `PORT` (افتراضي: 5005)

## النشر باستخدام PM2

### تثبيت PM2

```bash
npm install -g pm2
```

### تشغيل التطبيق باستخدام PM2

```bash
# بناء التطبيق أولاً
npm run build

# تشغيل باستخدام PM2
pm2 start ecosystem.config.js

# حفظ إعدادات PM2
pm2 save

# تفعيل بدء تلقائي عند إعادة تشغيل النظام
pm2 startup
```

### أوامر PM2 المفيدة

```bash
# عرض حالة التطبيق
pm2 status

# عرض السجلات
pm2 logs ordertrack

# إعادة تشغيل
pm2 restart ordertrack

# إيقاف
pm2 stop ordertrack

# حذف من PM2
pm2 delete ordertrack
```

## النشر باستخدام Docker

### بناء الصورة

```bash
docker build -t ordertrack .
```

### تشغيل الحاوية

```bash
docker run -d \
  --name ordertrack \
  -p 5005:5005 \
  -v $(pwd)/data:/app/data \
  -e SESSION_SECRET=your-strong-secret-key \
  ordertrack
```

### استخدام Docker Compose

```bash
# إنشاء ملف .env مع SESSION_SECRET
echo "SESSION_SECRET=your-strong-secret-key" > .env

# تشغيل التطبيق
docker-compose up -d

# عرض السجلات
docker-compose logs -f

# إيقاف التطبيق
docker-compose down
```

## النشر على VPS/Server

### 1. الاتصال بالسيرفر

```bash
ssh user@your-server-ip
```

### 2. تثبيت Node.js

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# أو استخدام nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20
```

### 3. استنساخ المستودع

```bash
git clone https://github.com/ahmedalhesh/OrderTrack.git
cd OrderTrack
```

### 4. إعداد المتغيرات البيئية

```bash
cp .env.example .env
nano .env  # عدّل القيم حسب الحاجة
```

### 5. البناء والتشغيل

```bash
npm install
npm run build
npm run db:push

# استخدام PM2
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 6. إعداد Nginx (اختياري)

إنشاء ملف إعداد Nginx:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

تفعيل الإعداد:

```bash
sudo ln -s /etc/nginx/sites-available/ordertrack /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## النسخ الاحتياطي

### نسخ احتياطي لقاعدة البيانات

```bash
# نسخ ملف قاعدة البيانات
cp data/database.sqlite backups/database-$(date +%Y%m%d-%H%M%S).sqlite

# أو استخدام rsync
rsync -avz data/database.sqlite user@backup-server:/backups/
```

### استعادة قاعدة البيانات

```bash
# استبدال ملف قاعدة البيانات
cp backups/database-YYYYMMDD-HHMMSS.sqlite data/database.sqlite

# إعادة تشغيل التطبيق
pm2 restart ordertrack
```

## التحديث

```bash
# سحب التحديثات
git pull origin main

# تثبيت التبعيات الجديدة
npm install

# بناء التطبيق
npm run build

# تحديث قاعدة البيانات (إذا كانت هناك migrations جديدة)
npm run db:push

# إعادة تشغيل التطبيق
pm2 restart ordertrack
```

## استكشاف الأخطاء

### فحص السجلات

```bash
# PM2
pm2 logs ordertrack

# Docker
docker logs ordertrack
docker-compose logs -f
```

### فحص قاعدة البيانات

```bash
# التحقق من وجود ملف قاعدة البيانات
ls -lh data/database.sqlite

# فحص قاعدة البيانات (إذا كان sqlite3 مثبت)
sqlite3 data/database.sqlite ".tables"
```

### فحص المنفذ

```bash
# التحقق من أن المنفذ 5005 مستخدم
netstat -tulpn | grep 5005
# أو
lsof -i :5005
```

## الأمان

1. **غير SESSION_SECRET** إلى مفتاح قوي وعشوائي
2. استخدم HTTPS في الإنتاج (استخدم Let's Encrypt مع Certbot)
3. راجع أذونات الملفات:
   ```bash
   chmod 600 .env
   chmod 755 data
   ```
4. استخدم جدار حماية (Firewall) للسماح فقط بالمنفذات المطلوبة
5. راجع الأذونات في قاعدة البيانات بانتظام

## الدعم

للحصول على المساعدة، افتح issue في المستودع:
https://github.com/ahmedalhesh/OrderTrack/issues

