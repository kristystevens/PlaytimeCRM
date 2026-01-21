# Deploy to Vercel and Migrate Database

This guide will help you deploy your application to Vercel and migrate data from SQLite to PostgreSQL.

## Prerequisites

- ✅ Vercel CLI installed (`vercel --version`)
- ✅ Data exported from SQLite (`npm run export-sqlite`)
- ✅ Production database connection string (Supabase or Vercel Postgres)

## Step 1: Export Local SQLite Data

```bash
npm run export-sqlite
```

This creates `scripts/sqlite-export.json` with all your data.

## Step 2: Switch Schema to PostgreSQL

```bash
npm run switch-postgres
npx prisma generate
```

This updates the Prisma schema to use PostgreSQL instead of SQLite.

## Step 3: Deploy to Vercel

### Option A: Using Vercel CLI (Recommended)

```bash
# Login to Vercel (if not already)
vercel login

# Link your project (if not already linked)
vercel link

# Deploy to production
vercel --prod
```

### Option B: Push to GitHub (Auto-deploy)

If your repository is connected to Vercel:
1. Commit and push your changes:
   ```bash
   git add .
   git commit -m "Prepare for PostgreSQL deployment"
   git push origin main
   ```
2. Vercel will automatically deploy

## Step 4: Configure Environment Variables in Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add `DATABASE_URL` with your PostgreSQL connection string:
   - **Name**: `DATABASE_URL`
   - **Value**: Your PostgreSQL connection string (from Supabase or Vercel Postgres)
   - **Environment**: Select all (Production, Preview, Development)
5. Click **"Save"**

### Get Connection String

**If using Supabase:**
- Go to Supabase Dashboard → Settings → Database
- Copy the connection string (URI format)
- Replace `[YOUR-PASSWORD]` with your actual password

**If using Vercel Postgres:**
- Go to Vercel Dashboard → Storage → Your Postgres database
- Copy the connection string

## Step 5: Run Database Migrations

After deployment, run migrations to create the database schema:

```bash
# Pull environment variables
vercel env pull .env.local

# Run migrations
npx prisma db push
```

Or use Vercel CLI:
```bash
vercel env pull .env.local
npx prisma db push
```

## Step 6: Import Data to Production

```bash
# Make sure DATABASE_URL in .env.local points to production
# (It should after running 'vercel env pull')

# Import the exported data
npm run import-postgres
```

This will import all your SQLite data into the PostgreSQL database.

## Step 7: Verify Deployment

1. Visit your Vercel deployment URL
2. Check that:
   - ✅ Dashboard loads
   - ✅ Players are visible
   - ✅ Games are visible
   - ✅ Data matches your local database

## Step 8: Switch Back to SQLite (Optional, for Local Development)

If you want to continue using SQLite locally:

```bash
npm run switch-sqlite
npx prisma generate
```

Then update your local `.env.local` to point to SQLite:
```
DATABASE_URL="file:./prisma/dev.db"
```

## Troubleshooting

### Build Fails with Prisma Errors

- Ensure `DATABASE_URL` is set in Vercel
- Check that PostgreSQL database is accessible
- Verify connection string format

### Import Fails

- Check that migrations have run (`npx prisma db push`)
- Verify `DATABASE_URL` points to production database
- Check that export file exists: `scripts/sqlite-export.json`

### Data Not Showing

- Verify import completed successfully
- Check Vercel logs for errors
- Use Prisma Studio to inspect database: `npx prisma studio`

## Next Steps

- ✅ Monitor your deployment in Vercel dashboard
- ✅ Set up custom domain (optional)
- ✅ Configure analytics (optional)
- ✅ Set up monitoring and alerts
