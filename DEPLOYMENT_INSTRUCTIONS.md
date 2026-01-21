# Quick Deployment Instructions

## ✅ Completed Steps

1. ✅ **Data Exported**: All SQLite data exported to `scripts/sqlite-export.json`
   - 34 Players
   - 2 Agents
   - 14 Playtime Entries
   - 1 Game
   - 14 Game Players

2. ✅ **Schema Updated**: Prisma schema switched to PostgreSQL
3. ✅ **Prisma Client Regenerated**: Ready for PostgreSQL

## 🚀 Next Steps to Deploy

### Step 1: Commit and Push Changes

```bash
git add .
git commit -m "Prepare for PostgreSQL deployment and add migration scripts"
git push origin main
```

### Step 2: Login to Vercel (if not already)

```bash
vercel login
```

### Step 3: Link Project to Vercel (if not already linked)

```bash
vercel link
```

If your project is already connected to Vercel via GitHub, skip to Step 4.

### Step 4: Set Production Database URL in Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add or update:
   - **Name**: `DATABASE_URL`
   - **Value**: Your PostgreSQL connection string
     - **If using Supabase**: Get from Supabase Dashboard → Settings → Database
     - **If using Vercel Postgres**: Get from Vercel Dashboard → Storage → Your Postgres DB
   - **Environment**: Select all (Production, Preview, Development)
5. Click **"Save"**

### Step 5: Deploy to Vercel

**Option A: Auto-deploy (if GitHub is connected)**
- Your push in Step 1 will trigger automatic deployment
- Check the Deployments tab in Vercel dashboard

**Option B: Manual deploy**
```bash
vercel --prod
```

### Step 6: Run Database Migrations

After deployment completes:

```bash
# Pull environment variables
vercel env pull .env.local

# Run migrations to create tables
npx prisma db push
```

### Step 7: Import Data to Production

```bash
# Make sure .env.local has production DATABASE_URL
# (It should after running 'vercel env pull')

# Import the exported data
npm run import-postgres
```

### Step 8: Verify Deployment

1. Visit your Vercel deployment URL
2. Check that:
   - ✅ Dashboard loads
   - ✅ Players are visible (should show 34 players)
   - ✅ Games are visible (should show 1 game)
   - ✅ Data matches your local database

## 🔄 Switch Back to SQLite (Optional)

If you want to continue local development with SQLite:

```bash
npm run switch-sqlite
npx prisma generate
```

Then update `.env.local`:
```
DATABASE_URL="file:./prisma/dev.db"
```

## 📝 Notes

- The export file `scripts/sqlite-export.json` contains all your data
- It's been added to `.gitignore` to keep it local
- You can re-export anytime with `npm run export-sqlite`
- The schema is now PostgreSQL-compatible

## 🆘 Troubleshooting

**Build fails?**
- Check that `DATABASE_URL` is set in Vercel
- Verify connection string format

**Import fails?**
- Make sure migrations ran first (`npx prisma db push`)
- Check that `DATABASE_URL` in `.env.local` points to production

**Data not showing?**
- Verify import completed: Check console output
- Use Prisma Studio: `npx prisma studio` (with production DATABASE_URL)
