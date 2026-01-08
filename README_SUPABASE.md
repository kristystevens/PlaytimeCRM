# Playtime CRM - Supabase Setup

This project uses **Supabase** (PostgreSQL) for database management in both local development and production.

## Quick Start

### Local Development

1. **Install Supabase CLI** (Windows):

   **Option A: Using Scoop (Recommended)**
   ```powershell
   # Install Scoop if needed
   Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
   irm get.scoop.sh | iex
   
   # Install Supabase
   scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
   scoop install supabase
   ```

   **Option B: Using npx (No installation needed)**
   ```bash
   # Just use npx - works without installation!
   ```

2. **Start Supabase locally**:

   **If using Scoop:**
   ```bash
   supabase init
   supabase start
   ```

   **If using npx:**
   ```bash
   npx supabase init
   npx supabase start
   ```

3. **Set environment variable**:
   Create `.env.local`:
   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres"
   ```
   (The connection string is shown when you run `supabase start`)

4. **Initialize database**:
   ```bash
   npx prisma db push
   ```

5. **Start development server**:
   ```bash
   npm run dev
   ```

6. **Access Supabase Studio** (optional):
   - Open http://localhost:54323
   - Manage your database visually

### Production Deployment

1. **Create Supabase project** at [supabase.com](https://app.supabase.com)
2. **Get connection string** from Settings → Database
3. **Set in Vercel**: Environment Variables → `DATABASE_URL`
4. **Deploy**: Vercel will auto-deploy from GitHub
5. **Run migrations**: `npx prisma db push` (using Vercel CLI or direct connection)

## Documentation

- **Full Setup Guide**: See `SUPABASE_SETUP.md`
- **Quick Checklist**: See `DEPLOY_CHECKLIST_SUPABASE.md`
- **Migration Guide**: See `POSTGRESQL_MIGRATION.md`

## Environment Variables

### Local (`.env.local`)
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres"
```

### Production (Vercel)
Set in Vercel dashboard with your Supabase connection string.

## Useful Commands

```bash
# Supabase (if installed via Scoop)
supabase start          # Start local Supabase
supabase stop           # Stop local Supabase
supabase status         # Check status
supabase db reset       # Reset local database

# Or using npx (no installation)
npx supabase start      # Start local Supabase
npx supabase stop       # Stop local Supabase
npx supabase status     # Check status
npx supabase db reset   # Reset local database

# Prisma
npx prisma db push      # Push schema changes
npx prisma studio       # Open Prisma Studio
npx prisma generate     # Generate Prisma client

# Development
npm run dev            # Start Next.js dev server
npm run build          # Build for production
```

## Troubleshooting

**Can't connect?**
- Run `supabase status` to verify Supabase is running
- Check `.env.local` has correct `DATABASE_URL`

**Port conflicts?**
- Stop Supabase: `supabase stop`
- Or change port in `supabase/config.toml`

**Migration issues?**
- Use `npx prisma db push` for quick updates
- Use `npx prisma migrate dev` for versioned migrations

