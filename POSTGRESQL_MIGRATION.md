# PostgreSQL Migration Guide

Your Prisma schema has been updated to use PostgreSQL instead of SQLite. This is required for Vercel deployment since SQLite doesn't work on serverless platforms.

## Changes Made

### Schema Updates (`prisma/schema.prisma`)
1. **Database Provider**: Changed from `sqlite` to `postgresql`
2. **JSON Fields**: Converted from `String` to `Json` type:
   - `Player.preferredGames` - now `Json` instead of `String`
   - `Runner.languages` - now `Json` instead of `String`
   - `ActivityLog.changes` - now `Json` instead of `String`
3. **Decimal Fields**: Converted from `Float` to `Decimal` with proper precision:
   - `Player.totalDeposited`, `totalWagered`, `netPnL`, `avgBuyIn`
   - `Runner.compValue`, `totalPaid`, `outstandingBalance`
   - `Agent.revSharePct`, `totalEarned`, `totalPaid`, `unpaidBalance`
   - `Payout.amount`

### Code Updates
1. **Removed JSON.stringify/parse**: PostgreSQL's `Json` type handles serialization automatically
   - `app/api/players/route.ts` - removed `JSON.stringify` for `preferredGames`
   - `app/api/players/[id]/route.ts` - removed `JSON.stringify` for `preferredGames`
   - `app/api/runners/route.ts` - removed `JSON.stringify` for `languages`
   - `app/api/runners/[id]/route.ts` - removed `JSON.stringify` for `languages`
   - `app/runners/[id]/runner-detail.tsx` - removed `JSON.parse` for `languages`
   - `lib/activity-log.ts` - removed `JSON.stringify` for `changes`

## Next Steps for Vercel Deployment

### 1. Create Vercel Postgres Database
1. Go to your Vercel project dashboard
2. Navigate to **Storage** → **Create Database** → **Postgres**
3. Create the database and note the connection string

### 2. Set Environment Variables
In your Vercel project settings, add:
```
DATABASE_URL="your-postgres-connection-string"
```

### 3. Run Migrations
After connecting to your PostgreSQL database:

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database (creates tables)
npx prisma db push

# Or create a migration
npx prisma migrate dev --name init
```

### 4. Seed the Database (Optional)
```bash
npm run db:seed
```

## Local Development

For local development, you have two options:

### Option 1: Use Local PostgreSQL
1. Install PostgreSQL locally
2. Create a database
3. Update `.env` with your local PostgreSQL connection string:
   ```
   DATABASE_URL="postgresql://user:password@localhost:5432/playtime_crm"
   ```

### Option 2: Use Vercel Postgres Locally
1. Use Vercel CLI to pull environment variables:
   ```bash
   npx vercel env pull .env.local
   ```
2. This will use your production database (be careful!)

## Important Notes

- **Decimal Types**: Prisma's `Decimal` type returns a `Decimal` object. Use `.toNumber()` or `Number()` to convert to JavaScript numbers when needed.
- **JSON Types**: Prisma automatically serializes/deserializes JSON fields. No manual `JSON.stringify`/`parse` needed.
- **Data Migration**: If you have existing SQLite data, you'll need to export it and import it into PostgreSQL manually.

## Testing

After migration, test:
1. Creating players, runners, and agents
2. Adding playtime entries
3. Viewing dashboard charts
4. Exporting CSV files

All functionality should work the same, but now with PostgreSQL backend!

