# PowerShell Script لإعداد قاعدة بيانات D1

$DB_NAME = "ordertrack-db"

Write-Host "🔍 التحقق من قاعدة البيانات D1..." -ForegroundColor Cyan

# التحقق من وجود database_id في wrangler.toml
$wranglerContent = Get-Content wrangler.toml -Raw
if ($wranglerContent -notmatch 'database_id\s*=\s*"[^"]{10,}"') {
    Write-Host "❌ خطأ: database_id غير موجود أو فارغ في wrangler.toml" -ForegroundColor Red
    Write-Host "📝 قم بتشغيل: wrangler d1 create $DB_NAME" -ForegroundColor Yellow
    Write-Host "   ثم أضف database_id في wrangler.toml" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ database_id موجود" -ForegroundColor Green

# تطبيق migrations
Write-Host "📦 تطبيق migrations..." -ForegroundColor Cyan

if (Test-Path "migrations/apply-to-d1.sql") {
    Write-Host "📄 استخدام ملف migration موحد..." -ForegroundColor Yellow
    wrangler d1 execute $DB_NAME --file=./migrations/apply-to-d1.sql
} else {
    Write-Host "📄 تطبيق migrations منفصلة..." -ForegroundColor Yellow
    wrangler d1 execute $DB_NAME --file=./migrations/0000_acoustic_metal_master.sql
    wrangler d1 execute $DB_NAME --file=./migrations/0001_watery_shadowcat.sql
    wrangler d1 execute $DB_NAME --file=./migrations/0002_familiar_johnny_storm.sql
    wrangler d1 execute $DB_NAME --file=./migrations/0003_cultured_mastermind.sql
}

Write-Host ""
Write-Host "✅ تم تطبيق migrations بنجاح!" -ForegroundColor Green
Write-Host ""
Write-Host "🔍 التحقق من الجداول:" -ForegroundColor Cyan
wrangler d1 execute $DB_NAME --command="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"

