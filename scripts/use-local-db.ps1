# Script to switch to local database for development

Write-Host "Switching to local database configuration..." -ForegroundColor Yellow

$localDbUrl = 'DATABASE_URL="postgresql://ginza:ginza_dev_password@localhost:5432/ginza_crm?schema=public"'
$prodDbUrl = '# DATABASE_URL="postgres://postgres.xnppzulmhxkxbtoijren:gIZcNmd1LmNQoHlV@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true"'

$content = @"
# Local Development Database (PostgreSQL via Docker)
$localDbUrl

# Production Database (commented out)
$prodDbUrl
"@

$content | Out-File -FilePath .env -Encoding utf8

Write-Host "Updated .env to use local database" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Make sure Docker is running" -ForegroundColor White
Write-Host "2. Run: docker-compose up -d" -ForegroundColor White
Write-Host "3. Run: npx prisma db push" -ForegroundColor White
Write-Host "4. Restart your dev server" -ForegroundColor White
