# Quick Deployment Checklist - Supabase Edition

## Before Deploying

- [x] ✅ Schema updated to PostgreSQL (works with Supabase)
- [x] ✅ Code updated for PostgreSQL types
- [x] ✅ Build script includes `prisma generate`
- [x] ✅ `postinstall` script added for Prisma
- [x] ✅ Repository pushed to GitHub

## Local Development Setup (10 minutes)

### 1. Install Supabase CLI
```bash
npm install -g supabase
```

### 2. Initialize & Start Supabase
```bash
supabase init
supabase start
```

### 3. Set Local Environment Variable
Create `.env.local`:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres"
```

### 4. Initialize Database
```bash
npx prisma db push
npm run db:seed  # Optional: seed test data
```

### 5. Start Dev Server
```bash
npm run dev
```

### 6. Access Supabase Studio
- Open http://localhost:54323
- View/manage your database

## Production Deployment (15 minutes)

### 1. Create Supabase Project
- [ ] Go to [Supabase Dashboard](https://app.supabase.com)
- [ ] Click **"New Project"**
- [ ] Name: `playtime-crm`
- [ ] Set database password (save it!)
- [ ] Choose region
- [ ] Wait for project creation (~2 minutes)

### 2. Get Connection String
- [ ] Go to **Settings** → **Database**
- [ ] Copy **Connection string** (URI format)
- [ ] Replace `[YOUR-PASSWORD]` with actual password

### 3. Configure Vercel
- [ ] Go to Vercel project dashboard
- [ ] **Settings** → **Environment Variables**
- [ ] Add `DATABASE_URL` with Supabase connection string
- [ ] Select all environments

### 4. Deploy
- [ ] Vercel will auto-deploy from GitHub
- [ ] Or manually trigger deployment
- [ ] Wait for build (~2-3 minutes)

### 5. Run Production Migrations
After deployment:
```bash
# Option A: Using Vercel CLI
vercel env pull .env.local
npx prisma db push

# Option B: Direct connection
# Use connection string from Supabase dashboard
npx prisma db push
```

### 6. Verify Deployment
- [ ] Visit deployed URL
- [ ] Check dashboard loads
- [ ] Create a test player
- [ ] Test playtime entry
- [ ] Verify CSV export

## Total Time: ~25 minutes

## Daily Development Workflow

```bash
# Start Supabase (if stopped)
supabase start

# Start dev server
npm run dev

# When done
supabase stop  # Optional: saves resources
```

## Useful Commands

```bash
# Supabase status
supabase status

# View database in browser
# http://localhost:54323

# Reset local database
supabase db reset

# View logs
supabase logs
```

## Troubleshooting

**Can't connect to local database?**
- Run `supabase status` to check if it's running
- Verify `.env.local` has correct connection string

**Build fails on Vercel?**
- Check `DATABASE_URL` is set correctly
- Verify Supabase project is active
- Check connection string format

**Migration errors?**
- Use `npx prisma db push` for quick updates
- Use `npx prisma migrate dev` for versioned migrations

