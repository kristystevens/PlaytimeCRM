# Script to set up SQLite for local development

Write-Host "Setting up SQLite database configuration..." -ForegroundColor Yellow

$content = @"
# Local Development Database (SQLite)
DATABASE_URL="file:./prisma/dev.db"

# Production Database (commented out - uncomment to switch back)
# DATABASE_URL="postgres://postgres.xnppzulmhxkxbtoijren:gIZcNmd1LmNQoHlV@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true"
"@

$content | Out-File -FilePath .env -Encoding utf8

Write-Host "Updated .env to use SQLite database" -ForegroundColor Green
Write-Host "DATABASE_URL is now: file:./prisma/dev.db" -ForegroundColor Cyan
