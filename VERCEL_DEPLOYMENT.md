# Vercel Deployment Guide for Playtime CRM

This guide will walk you through deploying your Playtime CRM application to Vercel with PostgreSQL.

## Prerequisites

- GitHub repository (already set up ✅)
- Vercel account (sign up at https://vercel.com if needed)

## Step-by-Step Deployment

### 1. Connect Repository to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New Project"**
3. Import your GitHub repository: `kristystevens/PlaytimeCRM`
4. Vercel will auto-detect Next.js settings

### 2. Create PostgreSQL Database

1. In your Vercel project dashboard, go to the **Storage** tab
2. Click **"Create Database"**
3. Select **"Postgres"**
4. Choose a name (e.g., `playtime-crm-db`)
5. Select a region (choose closest to your users)
6. Click **"Create"**
7. **Important**: Copy the connection string - you'll need it in the next step

### 3. Configure Environment Variables

1. In your Vercel project settings, go to **Settings** → **Environment Variables**
2. Add the following variable:
   - **Name**: `DATABASE_URL`
   - **Value**: Paste your PostgreSQL connection string from step 2
   - **Environment**: Select all (Production, Preview, Development)

### 4. Configure Build Settings

Vercel should auto-detect these, but verify:

- **Framework Preset**: Next.js
- **Build Command**: `npm run build` (already includes `prisma generate`)
- **Output Directory**: `.next` (default)
- **Install Command**: `npm install`

### 5. Deploy

1. Click **"Deploy"** button
2. Vercel will:
   - Install dependencies
   - Run `prisma generate` (via build script)
   - Run `next build`
   - Deploy your application

### 6. Run Database Migrations

After first deployment:

1. Go to your project's **Deployments** tab
2. Click on the latest deployment
3. Open the **Functions** tab or use Vercel CLI:

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
# OR push schema (for initial setup)
npx prisma db push
```

Alternatively, you can run migrations via Vercel's deployment hooks or manually connect to the database.

### 7. Seed Database (Optional)

If you want to seed initial data:

```bash
# Using Vercel CLI with environment variables
vercel env pull .env.local
npm run db:seed
```

Or create a one-time migration script that runs on first deployment.

## Post-Deployment Checklist

- [ ] Database connection working
- [ ] Can create/view players
- [ ] Can create/view agents
- [ ] Can create/view runners
- [ ] Playtime tracking works
- [ ] Dashboard loads correctly
- [ ] CSV exports work
- [ ] All pages accessible

## Troubleshooting

### Build Fails with Prisma Errors

- Ensure `DATABASE_URL` is set correctly
- Check that PostgreSQL database is created and accessible
- Verify connection string format: `postgresql://user:password@host:port/database?sslmode=require`

### Database Connection Errors

- Verify `DATABASE_URL` environment variable is set
- Check PostgreSQL database is running
- Ensure connection string includes SSL parameters if required

### Prisma Client Not Generated

- The build script includes `prisma generate` - this should run automatically
- If issues persist, add a `postinstall` script to `package.json`:
  ```json
  "postinstall": "prisma generate"
  ```

### Environment Variables Not Loading

- Ensure variables are set for the correct environment (Production/Preview/Development)
- Redeploy after adding new environment variables

## Custom Domain (Optional)

1. Go to **Settings** → **Domains**
2. Add your custom domain
3. Follow DNS configuration instructions
4. SSL certificate is automatically provisioned

## Monitoring & Analytics

- Vercel provides built-in analytics
- Check **Analytics** tab for performance metrics
- Monitor **Logs** tab for runtime errors

## Continuous Deployment

Once connected:
- Every push to `main` branch = automatic production deployment
- Pull requests = automatic preview deployments
- No manual deployment needed!

## Support

- Vercel Docs: https://vercel.com/docs
- Prisma + Vercel: https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-vercel

