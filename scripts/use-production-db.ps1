# Script to switch back to production database

Write-Host "Switching to production database configuration..." -ForegroundColor Yellow

$envContent = @"
# Production Database (Supabase)
DATABASE_URL="postgres://postgres.xnppzulmhxkxbtoijren:gIZcNmd1LmNQoHlV@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true"

# Local Development Database (commented out - uncomment to use locally)
# DATABASE_URL="postgresql://ginza:ginza_dev_password@localhost:5432/ginza_crm?schema=public"
"@

$envContent | Out-File -FilePath .env -Encoding utf8 -NoNewline

Write-Host "✓ Updated .env to use production database" -ForegroundColor Green
Write-Host ""
Write-Host "Restart your dev server to apply changes" -ForegroundColor Cyan
