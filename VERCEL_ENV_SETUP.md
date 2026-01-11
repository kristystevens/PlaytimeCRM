# Quick Guide: Adding DATABASE_URL to Vercel

## The Error
```
error: Environment variable not found: DATABASE_URL.
```

## Solution: Add DATABASE_URL to Vercel

### Step 1: Get Your Database URL

Since you're using Supabase, you have the connection string. Use one of these:

**Option A: Direct Connection (Recommended for Vercel)**
```
postgresql://postgres.xnppzulmhxkxbtoijren:gIZcNmd1LmNQoHlV@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require
```

**Option B: Connection Pooler (Better for serverless)**
```
postgres://postgres.xnppzulmhxkxbtoijren:gIZcNmd1LmNQoHlV@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true
```

### Step 2: Add to Vercel

1. Go to your Vercel project dashboard: https://vercel.com/dashboard
2. Select your **PlaytimeCRM** project
3. Go to **Settings** → **Environment Variables**
4. Click **"Add New"**
5. Enter:
   - **Name**: `DATABASE_URL`
   - **Value**: Paste your connection string (use Option B for better performance)
   - **Environment**: Select **Production**, **Preview**, and **Development** (all three)
6. Click **"Save"**

### Step 3: Redeploy

After adding the environment variable:

1. Go to **Deployments** tab
2. Click the **"..."** menu on the latest deployment
3. Click **"Redeploy"**
4. Or push a new commit to trigger automatic deployment

### Step 4: Verify

After redeployment, check:
- Dashboard loads without errors
- Can view players/agents/runners
- Database queries work

## Alternative: Using Vercel CLI

If you prefer command line:

```bash
# Install Vercel CLI (if not installed)
npm i -g vercel

# Login
vercel login

# Link your project
vercel link

# Add environment variable
vercel env add DATABASE_URL production
# Paste your connection string when prompted
# Repeat for preview and development environments

# Redeploy
vercel --prod
```

## Troubleshooting

### Still Getting Errors?

1. **Check the connection string format**: Must start with `postgresql://` or `postgres://`
2. **Verify SSL mode**: Should include `?sslmode=require`
3. **Check Supabase settings**: Ensure your database allows connections from Vercel IPs
4. **Wait a few minutes**: Environment variables can take a moment to propagate

### Connection Pooling

For serverless functions (like Vercel), use the **pooler connection** (port 6543) instead of direct connection (port 5432). This prevents connection limit issues.

