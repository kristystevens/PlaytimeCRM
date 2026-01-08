# Ginza CRM Setup Script
# Run this script once Docker Desktop is fully started

Write-Host "Starting Ginza CRM setup..." -ForegroundColor Green

# Step 1: Start PostgreSQL
Write-Host "`n[1/4] Starting PostgreSQL database..." -ForegroundColor Yellow
docker-compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Docker is not running. Please start Docker Desktop and try again." -ForegroundColor Red
    exit 1
}

# Wait for database to be ready
Write-Host "Waiting for database to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Step 2: Create database schema
Write-Host "`n[2/4] Creating database schema..." -ForegroundColor Yellow
npm run db:migrate
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Migration failed" -ForegroundColor Red
    exit 1
}

# Step 3: Seed database
Write-Host "`n[3/4] Seeding database with sample data..." -ForegroundColor Yellow
npm run db:seed
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Seeding failed" -ForegroundColor Red
    exit 1
}

# Step 4: Start dev server
Write-Host "`n[4/4] Starting development server..." -ForegroundColor Yellow
Write-Host "`n✅ Setup complete! The app will be available at http://localhost:3000" -ForegroundColor Green
Write-Host "Login credentials:" -ForegroundColor Cyan
Write-Host "  Email: admin@ginza.com" -ForegroundColor Cyan
Write-Host "  Password: admin123" -ForegroundColor Cyan
Write-Host "`nPress Ctrl+C to stop the server`n" -ForegroundColor Yellow

npm run dev

