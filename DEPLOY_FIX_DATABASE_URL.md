# Fix DATABASE_URL Error on Vercel Deployment

## The Error
```
error: Environment variable not found: DATABASE_URL.
```

## Solution: Add DATABASE_URL to Vercel

### Step 1: Get Your Supabase Connection String

You already have this from your Supabase setup. Use the **pooler connection** (recommended for serverless):

```
postgres://postgres.xnppzulmhxkxbtoijren:gIZcNmd1LmNQoHlV@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true
```

### Step 2: Add to Vercel (Web Interface)

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/dashboard
   - Sign in if needed

2. **Select Your Project**
   - Click on **"PlaytimeCRM"** project

3. **Navigate to Settings**
   - Click **"Settings"** in the top navigation
   - Click **"Environment Variables"** in the left sidebar

4. **Add DATABASE_URL**
   - Click **"Add New"** button
   - Enter:
     - **Key**: `DATABASE_URL`
     - **Value**: Paste your Supabase connection string:
       ```
       postgres://postgres.xnppzulmhxkxbtoijren:gIZcNmd1LmNQoHlV@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true
       ```
     - **Environment**: Select **ALL THREE** checkboxes:
       - ✅ Production
       - ✅ Preview  
       - ✅ Development
   - Click **"Save"**

5. **Redeploy**
   - Go to **"Deployments"** tab
   - Find your latest deployment
   - Click the **"..."** (three dots) menu
   - Click **"Redeploy"**
   - Or simply push a new commit to trigger automatic deployment

### Step 3: Verify

After redeployment:
1. Wait 2-3 minutes for deployment to complete
2. Visit your Vercel app URL
3. Check the dashboard - it should load without errors
4. If you see errors, check the **"Logs"** tab in Vercel

## Alternative: Using Vercel CLI

If you prefer command line:

```bash
# Install Vercel CLI (if not installed)
npm i -g vercel

# Login to Vercel
vercel login

# Link your project (if not already linked)
vercel link

# Add environment variable for all environments
vercel env add DATABASE_URL production
# When prompted, paste your connection string

vercel env add DATABASE_URL preview
# Paste the same connection string

vercel env add DATABASE_URL development
# Paste the same connection string

# Redeploy
vercel --prod
```

## Important Notes

### ✅ Use Pooler Connection
- **Port 6543** (pooler) is better for serverless/Vercel
- **Port 5432** (direct) can hit connection limits

### ✅ SSL Required
- Always include `?sslmode=require` in the connection string
- Supabase requires SSL connections

### ✅ All Environments
- Add `DATABASE_URL` to **Production**, **Preview**, AND **Development**
- This ensures it works for all deployment types

### ✅ After Adding Variables
- **Must redeploy** for changes to take effect
- Environment variables are only loaded at build/runtime
- New deployments automatically use new variables

## Troubleshooting

### Still Getting Errors?

1. **Double-check the connection string**
   - Must start with `postgres://` or `postgresql://`
   - No extra spaces or quotes
   - Includes `?sslmode=require`

2. **Verify in Vercel**
   - Go to Settings → Environment Variables
   - Confirm `DATABASE_URL` is listed
   - Check it's enabled for the right environments

3. **Check Supabase Dashboard**
   - Ensure your database is running
   - Verify connection pooling is enabled
   - Check if there are any IP restrictions

4. **Redeploy**
   - Environment variables only apply to NEW deployments
   - Old deployments won't have the new variable

5. **Check Vercel Logs**
   - Go to your deployment → "Logs" tab
   - Look for specific error messages
   - Share logs if you need help debugging

## Quick Checklist

- [ ] Added `DATABASE_URL` to Vercel environment variables
- [ ] Used pooler connection (port 6543)
- [ ] Included `?sslmode=require` in connection string
- [ ] Enabled for Production, Preview, and Development
- [ ] Redeployed the application
- [ ] Verified dashboard loads without errors

## Connection String Format

```
postgres://[USER]:[PASSWORD]@[HOST]:[PORT]/[DATABASE]?sslmode=require&pgbouncer=true
```

Your specific values:
- **USER**: `postgres.xnppzulmhxkxbtoijren`
- **PASSWORD**: `gIZcNmd1LmNQoHlV`
- **HOST**: `aws-1-us-east-1.pooler.supabase.com`
- **PORT**: `6543` (pooler) or `5432` (direct)
- **DATABASE**: `postgres`

