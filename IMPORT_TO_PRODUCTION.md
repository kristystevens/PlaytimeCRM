# Import Database to Production

## Prerequisites

1. ✅ Code has been pushed to GitHub
2. ✅ Vercel deployment is complete (or in progress)
3. ✅ `DATABASE_URL` is set in Vercel environment variables
4. ✅ Export file exists: `scripts/sqlite-export.json`

## Step 1: Pull Production Environment Variables

```bash
# Make sure you're logged into Vercel
vercel login

# Link your project (if not already linked)
vercel link

# Pull environment variables (this will create/update .env.local with production DATABASE_URL)
vercel env pull .env.local
```

## Step 2: Verify Database Connection

```bash
# Test the connection
npx prisma db push
```

This will create all the tables in your production database.

## Step 3: Import Your Data

```bash
# Import all your SQLite data to PostgreSQL
npm run import-postgres
```

This will import:
- 34 Players
- 2 Agents
- 14 Playtime Entries
- 1 Game
- 14 Game Players

## Step 4: Verify Import

After import, you can verify the data:

```bash
# Open Prisma Studio (connects to production database via .env.local)
npx prisma studio
```

Or check your Vercel deployment URL to see if the data appears.

## Troubleshooting

### "DATABASE_URL not found"
- Make sure you ran `vercel env pull .env.local`
- Check that `DATABASE_URL` is set in Vercel dashboard

### "Connection refused" or "SSL required"
- Verify your PostgreSQL connection string includes `?sslmode=require`
- Check that your database allows connections from your IP

### Import fails with foreign key errors
- Make sure you ran `npx prisma db push` first to create all tables
- The import script handles dependencies, but tables must exist first

### Data not showing in production
- Wait a few minutes for Vercel to redeploy if needed
- Check Vercel function logs for errors
- Verify the import completed successfully (check console output)
