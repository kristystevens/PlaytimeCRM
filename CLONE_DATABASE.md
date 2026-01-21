# Clone SQLite Database to PostgreSQL

This guide will help you clone your local SQLite database directly to your production PostgreSQL database.

## Quick Start

### Step 1: Set Production Database URL

Make sure your `.env.local` file has the production PostgreSQL connection string:

```env
DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"
```

**To get your production DATABASE_URL:**
- If using Vercel: Run `vercel env pull .env.local`
- If using Supabase: Get from Supabase Dashboard → Settings → Database
- If using Vercel Postgres: Get from Vercel Dashboard → Storage

### Step 2: Ensure Database Schema Exists

Before cloning, make sure the PostgreSQL database has the schema:

```bash
# Make sure schema is set to PostgreSQL
npm run switch-postgres

# Generate Prisma client
npx prisma generate

# Push schema to production database
npx prisma db push
```

### Step 3: Clone the Database

```bash
npm run clone-db
```

This will:
1. ✅ Connect to SQLite database (reads from `prisma/dev.db`)
2. ✅ Connect to PostgreSQL database (uses `DATABASE_URL` from `.env.local`)
3. ✅ Export all data from SQLite
4. ✅ Import all data to PostgreSQL
5. ✅ Show summary of what was cloned

## What Gets Cloned

- Users
- Players
- Runners
- Agents
- Activity Logs
- Payouts
- Message Tasks
- Playtime Entries
- Games
- Game Players

## Troubleshooting

### "DATABASE_URL not set"
- Make sure `.env.local` exists and has `DATABASE_URL`
- Or run `vercel env pull .env.local` to get production variables

### "Failed to connect to PostgreSQL"
- Verify your connection string is correct
- Check that your database allows connections from your IP
- Ensure SSL is enabled if required (`?sslmode=require`)

### "Schema not found" or "Table does not exist"
- Run `npx prisma db push` first to create all tables
- Make sure you've run `npm run switch-postgres` to use PostgreSQL schema

### "Foreign key constraint error"
- The script handles dependencies automatically
- If errors occur, make sure all tables exist (run `npx prisma db push`)

## Alternative: Using Export/Import

If direct cloning doesn't work, you can use the two-step approach:

```bash
# Step 1: Export from SQLite
npm run export-sqlite

# Step 2: Import to PostgreSQL (make sure DATABASE_URL points to production)
npm run import-postgres
```

## Verify the Clone

After cloning, verify the data:

```bash
# Open Prisma Studio (connects to DATABASE_URL in .env.local)
npx prisma studio
```

Or check your production deployment URL to see if the data appears.
