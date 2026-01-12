# Deployment Next Steps - PostgreSQL Migration & Vercel

## ✅ Completed
- ✅ Code committed and pushed to `main` branch
- ✅ Prisma schema configured for PostgreSQL
- ✅ All recent changes included (hosts, playerID auto-assignment, filters, etc.)

## 🔄 Next Steps for Vercel Deployment

### 1. Set Up PostgreSQL Database

You have two options:

#### Option A: Use Vercel Postgres (Recommended)
1. Go to your Vercel project dashboard
2. Navigate to **Storage** tab
3. Click **"Create Database"**
4. Select **"Postgres"**
5. Choose a name (e.g., `playtime-crm-db`)
6. Select a region
7. Click **"Create"**
8. Copy the connection string (it will be in the format: `postgresql://...`)

#### Option B: Use Supabase (Already configured)
- Your schema is already configured for Supabase
- Use your existing Supabase connection string

### 2. Configure Environment Variables in Vercel

1. Go to your Vercel project **Settings** → **Environment Variables**
2. Add the following variable:
   - **Name**: `DATABASE_URL`
   - **Value**: Your PostgreSQL connection string
   - **Environment**: Select all (Production, Preview, Development)

### 3. Deploy to Vercel

If your repository is already connected to Vercel:
- The push to `main` should trigger an automatic deployment
- Check the **Deployments** tab in Vercel dashboard

If not connected:
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New Project"**
3. Import your GitHub repository
4. Vercel will auto-detect Next.js settings
5. Click **"Deploy"**

### 4. Run Database Migrations

After the first deployment, you need to run migrations:

**Option 1: Using Vercel CLI (Recommended)**
```bash
# Install Vercel CLI (if not already installed)
npm i -g vercel

# Login to Vercel
vercel login

# Link your project
vercel link

# Pull environment variables
vercel env pull .env.local

# Run migrations
npx prisma migrate deploy
```

**Option 2: Using Prisma Studio (Alternative)**
```bash
# Pull environment variables first
vercel env pull .env.local

# Use Prisma db push for initial setup
npx prisma db push
```

**Option 3: Manual Migration via Vercel Functions**
- Create a one-time API route that runs migrations
- Call it once after deployment
- Delete it after use

### 5. Verify Deployment

After deployment, check:
- [ ] Application loads without errors
- [ ] Database connection works
- [ ] Can create/view players
- [ ] Can create/view hosts
- [ ] Playtime tracking works
- [ ] Dashboard loads correctly

## Important Notes

### Database Migration Strategy

Since you're migrating from SQLite to PostgreSQL:
1. **Export data from SQLite** (if you have existing data):
   ```bash
   # Export from SQLite
   sqlite3 prisma/dev.db .dump > backup.sql
   ```

2. **Import to PostgreSQL** (after setting up production DB):
   - Use a migration script or manual import
   - Consider using Prisma's data migration tools

### Build Configuration

Your `package.json` already includes:
- `"build": "prisma generate && next build"` - This ensures Prisma client is generated during build
- `"postinstall": "prisma generate"` - This ensures Prisma client is generated after npm install

### Environment Variables Checklist

Make sure these are set in Vercel:
- ✅ `DATABASE_URL` - PostgreSQL connection string (REQUIRED)
- ⚠️ Any other environment variables your app needs (check your code)

## Troubleshooting

### Build Fails
- Check that `DATABASE_URL` is set correctly
- Verify PostgreSQL database is accessible
- Check build logs in Vercel dashboard

### Database Connection Errors
- Verify connection string format
- Ensure SSL is enabled if required (add `?sslmode=require` to connection string)
- Check database firewall settings

### Migration Issues
- Run `npx prisma migrate deploy` manually via Vercel CLI
- Check Prisma migration status: `npx prisma migrate status`

## Support Resources

- Vercel Docs: https://vercel.com/docs
- Prisma + Vercel: https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-vercel
- Vercel Postgres: https://vercel.com/docs/storage/vercel-postgres
