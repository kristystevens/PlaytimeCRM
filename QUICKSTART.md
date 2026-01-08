# Quick Start Guide

## Prerequisites
- Docker Desktop must be running
- Node.js 18+ installed
- Dependencies installed (`npm install` - already done)

## Quick Setup (Once Docker is Ready)

### Option 1: Use the Setup Script
```powershell
.\setup.ps1
```

### Option 2: Manual Steps

1. **Start PostgreSQL:**
   ```powershell
   docker-compose up -d
   ```

2. **Create Database Schema:**
   ```powershell
   npm run db:migrate
   ```

3. **Seed Database:**
   ```powershell
   npm run db:seed
   ```

4. **Start Development Server:**
   ```powershell
   npm run dev
   ```

5. **Open Browser:**
   - Navigate to: http://localhost:3000
   - Login with:
     - Email: `admin@ginza.com`
     - Password: `admin123`

## Troubleshooting Docker

If Docker Desktop is not working:

1. **Restart Docker Desktop:**
   - Right-click Docker Desktop icon in system tray
   - Select "Restart"

2. **Check Docker Status:**
   ```powershell
   docker ps
   ```
   Should return container list (or empty list, not an error)

3. **Alternative: Use External PostgreSQL**
   - Update `.env` file with your PostgreSQL connection string
   - Then run: `npm run db:migrate` and `npm run db:seed`

## What's Included

- ✅ 50 sample players (including 5 whales)
- ✅ 6 runners with various statuses
- ✅ 10 agents with performance data
- ✅ Sample payouts and message tasks
- ✅ Full authentication system
- ✅ Role-based access control

## Next Steps After Setup

1. Explore the dashboard at `/dashboard`
2. View players at `/players`
3. Check runners at `/runners`
4. Review agents at `/agents`
5. See activity logs at `/activity`
6. Manage messages at `/messages`

