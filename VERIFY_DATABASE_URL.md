# Verify DATABASE_URL in Vercel

## Steps to Fix DATABASE_URL Error

### 1. Verify in Vercel Dashboard

1. Go to https://vercel.com/dashboard
2. Select your project: `playtime-user-tracking-app`
3. Go to **Settings** → **Environment Variables**
4. Verify `DATABASE_URL` is listed for:
   - ✅ Production
   - ✅ Preview  
   - ✅ Development

### 2. If DATABASE_URL is Missing or Incorrect

**Add/Update it:**
1. Click **"Add New"** or edit existing
2. **Name**: `DATABASE_URL`
3. **Value**: `postgres://postgres.xnppzulmhxkxbtoijren:gIZcNmd1LmNQoHlV@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require&supa=base-pooler.x`
4. **Environment**: Select all (Production, Preview, Development)
5. Click **"Save"**

### 3. Redeploy After Adding/Updating

After adding or updating the environment variable:
1. Go to **Deployments** tab
2. Click the **"..."** menu on the latest deployment
3. Click **"Redeploy"**
4. Or push a new commit to trigger automatic deployment

### 4. Alternative: Use Vercel CLI

```bash
# Remove existing (if needed)
vercel env rm DATABASE_URL production
vercel env rm DATABASE_URL preview
vercel env rm DATABASE_URL development

# Add with correct value
echo "postgres://postgres.xnppzulmhxkxbtoijren:gIZcNmd1LmNQoHlV@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require&supa=base-pooler.x" | vercel env add DATABASE_URL production
echo "postgres://postgres.xnppzulmhxkxbtoijren:gIZcNmd1LmNQoHlV@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require&supa=base-pooler.x" | vercel env add DATABASE_URL preview
echo "postgres://postgres.xnppzulmhxkxbtoijren:gIZcNmd1LmNQoHlV@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require&supa=base-pooler.x" | vercel env add DATABASE_URL development

# Then redeploy
vercel --prod
```

## Common Issues

### Issue: Environment variable not available at runtime
**Solution**: Make sure you redeploy after adding/updating environment variables

### Issue: Variable exists but still getting error
**Solution**: 
- Check for typos in variable name (must be exactly `DATABASE_URL`)
- Verify the connection string is correct
- Wait a few minutes for deployment to propagate

### Issue: Works locally but not in production
**Solution**: Environment variables in `.env.local` are only for local development. Production uses Vercel's environment variables.

## Verify It's Working

After redeploying, check the logs:
```bash
vercel logs https://playtime-user-tracking-app.vercel.app
```

Or visit the site and check the browser console for errors.
