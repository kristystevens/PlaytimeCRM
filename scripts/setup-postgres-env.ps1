# Script to set up PostgreSQL environment
$postgresUrl = "postgres://postgres.xnppzulmhxkxbtoijren:gIZcNmd1LmNQoHlV@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require"

# Update .env.local file
$envContent = @"
# PostgreSQL Database (Production Supabase)
DATABASE_URL="$postgresUrl"
"@

Set-Content -Path ".env.local" -Value $envContent -Force
Write-Host "✅ Updated .env.local with PostgreSQL URL" -ForegroundColor Green
