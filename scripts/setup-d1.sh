#!/bin/bash
# Script لإعداد قاعدة بيانات D1

DB_NAME="ordertrack-db"

echo "🔍 التحقق من قاعدة البيانات D1..."

# التحقق من وجود database_id في wrangler.toml
if ! grep -q "database_id.*=" wrangler.toml || grep -q 'database_id = ""' wrangler.toml; then
    echo "❌ خطأ: database_id غير موجود في wrangler.toml"
    echo "📝 قم بتشغيل: wrangler d1 create $DB_NAME"
    echo "   ثم أضف database_id في wrangler.toml"
    exit 1
fi

echo "✅ database_id موجود"

# تطبيق migrations
echo "📦 تطبيق migrations..."

# قراءة ملف migration الموحد
if [ -f "migrations/apply-to-d1.sql" ]; then
    echo "📄 استخدام ملف migration موحد..."
    wrangler d1 execute $DB_NAME --file=./migrations/apply-to-d1.sql
else
    echo "📄 تطبيق migrations منفصلة..."
    wrangler d1 execute $DB_NAME --file=./migrations/0000_acoustic_metal_master.sql
    wrangler d1 execute $DB_NAME --file=./migrations/0001_watery_shadowcat.sql
    wrangler d1 execute $DB_NAME --file=./migrations/0002_familiar_johnny_storm.sql
    wrangler d1 execute $DB_NAME --file=./migrations/0003_cultured_mastermind.sql
fi

echo ""
echo "✅ تم تطبيق migrations بنجاح!"
echo ""
echo "🔍 التحقق من الجداول:"
wrangler d1 execute $DB_NAME --command="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"

