# Quick Deployment Checklist

## Before Deploying

- [x] ✅ Schema updated to PostgreSQL
- [x] ✅ Code updated for PostgreSQL types
- [x] ✅ Build script includes `prisma generate`
- [x] ✅ `postinstall` script added for Prisma
- [x] ✅ Repository pushed to GitHub

## Deployment Steps

### 1. Vercel Setup (5 minutes)
- [ ] Sign in to Vercel
- [ ] Import GitHub repository: `kristystevens/PlaytimeCRM`
- [ ] Vercel auto-detects Next.js ✅

### 2. Create Database (2 minutes)
- [ ] Go to **Storage** tab in Vercel project
- [ ] Click **"Create Database"** → **"Postgres"**
- [ ] Name it (e.g., `playtime-crm-db`)
- [ ] Copy the connection string

### 3. Set Environment Variable (1 minute)
- [ ] Go to **Settings** → **Environment Variables**
- [ ] Add `DATABASE_URL` with your Postgres connection string
- [ ] Select all environments (Production, Preview, Development)

### 4. Deploy (2 minutes)
- [ ] Click **"Deploy"**
- [ ] Wait for build to complete (~2-3 minutes)
- [ ] Check deployment logs for errors

### 5. Initialize Database (2 minutes)
After deployment, run migrations:

**Option A: Using Vercel CLI**
```bash
npm i -g vercel
vercel login
vercel link
vercel env pull .env.local
npx prisma db push
```

**Option B: Using Vercel Dashboard**
- Go to deployment → Functions tab
- Or use Vercel's database console

### 6. Verify (5 minutes)
- [ ] Visit your deployed URL
- [ ] Check dashboard loads
- [ ] Try creating a player
- [ ] Test playtime entry
- [ ] Verify CSV export works

## Total Time: ~15-20 minutes

## If Something Goes Wrong

1. **Build fails**: Check logs in Vercel dashboard
2. **Database errors**: Verify `DATABASE_URL` is set correctly
3. **Prisma errors**: Ensure `postinstall` script ran (check build logs)
4. **Runtime errors**: Check function logs in Vercel dashboard

## Need Help?

- See `VERCEL_DEPLOYMENT.md` for detailed instructions
- Check Vercel docs: https://vercel.com/docs
- Prisma + Vercel guide: https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-vercel

