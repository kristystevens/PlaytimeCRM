# How to Seed Playtime Data to Production Database

## Current Status
- ✅ Playtime data has been seeded to **local database**
- ❌ Playtime data has **NOT** been seeded to **production database** (Vercel/Supabase)

## Method 1: Using Vercel CLI (Recommended)

### Step 1: Install and Setup Vercel CLI

```bash
# Install Vercel CLI (if not already installed)
npm i -g vercel

# Login to Vercel
vercel login

# Link your project (if not already linked)
vercel link
```

### Step 2: Pull Production Environment Variables

```bash
# This creates/updates .env.local with production DATABASE_URL
vercel env pull .env.local
```

### Step 3: Run Seed Script Against Production

```bash
# Make sure .env.local has the production DATABASE_URL
# Then run the seed script
npm run seed-playtime
```

**Important**: The seed script will use the `DATABASE_URL` from your `.env.local` file, which will be the production database after running `vercel env pull`.

## Method 2: Using Supabase Dashboard (Alternative)

### Step 1: Access Supabase SQL Editor

1. Go to https://app.supabase.com
2. Select your project: `xnppzulmhxkxbtoijren`
3. Go to **SQL Editor** in the left sidebar
4. Click **"New query"**

### Step 2: Run SQL to Insert Data

You can manually insert the playtime data using SQL, or use the seed script via Supabase's connection.

## Method 3: Direct Database Connection

If you have direct access to your Supabase database:

```bash
# Set production DATABASE_URL temporarily
export DATABASE_URL="postgres://postgres.xnppzulmhxkxbtoijren:gIZcNmd1LmNQoHlV@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true"

# Run seed script
npm run seed-playtime
```

## Quick Command Summary

```bash
# One-liner to seed production (after vercel link)
vercel env pull .env.local && npm run seed-playtime
```

## Verify Data in Production

After seeding:

1. **Check Supabase Dashboard**:
   - Go to Table Editor
   - View `playtime_entries` table
   - Should see entries for 2025-01-06 and 2025-01-07

2. **Check Vercel App**:
   - Visit your production URL
   - Go to Dashboard
   - Check "Top 10 Most Active Players" graph
   - Should show the seeded playtime data

## Important Notes

- ⚠️ **Backup First**: If you have existing production data, consider backing it up
- ⚠️ **Idempotent**: The seed script is safe to run multiple times (it updates existing entries)
- ⚠️ **Players Created**: The script will create players if they don't exist
- ⚠️ **Multiple Sessions**: Players with multiple sessions on the same day will have their minutes combined

## Troubleshooting

### "Environment variable not found"
- Make sure you ran `vercel env pull .env.local` first
- Check that `.env.local` contains `DATABASE_URL`

### "Connection refused" or "Timeout"
- Verify your Supabase database is running
- Check connection string is correct
- Try using the pooler connection (port 6543)

### "Unique constraint violation"
- This is normal if data already exists
- The script will update existing entries instead

