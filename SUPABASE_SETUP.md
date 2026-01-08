# Supabase Setup Guide for Playtime CRM

This guide will help you set up Supabase for both local development and production deployment.

## Why Supabase?

- ✅ Built on PostgreSQL (compatible with our schema)
- ✅ Free tier available
- ✅ Great local development experience
- ✅ Built-in authentication (if needed later)
- ✅ Real-time capabilities
- ✅ Easy database management UI

## Local Development Setup

### Prerequisites

**Supabase CLI requires Docker Desktop:**
- Download and install [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- Start Docker Desktop before running Supabase commands
- Make sure Docker is running (you'll see the Docker icon in your system tray)

### Option 1: Supabase CLI (Recommended - Requires Docker)

1. **Install Supabase CLI** (Windows):

   **Method A: Using Scoop (Recommended for Windows)**
   ```powershell
   # Install Scoop if you don't have it
   Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
   irm get.scoop.sh | iex
   
   # Install Supabase CLI
   scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
   scoop install supabase
   ```

   **Method B: Using npx (No installation needed)**
   ```bash
   # Use npx to run Supabase commands without installing
   npx supabase init
   npx supabase start
   ```

   **Method C: Direct Download**
   - Download from: https://github.com/supabase/cli/releases
   - Extract and add to PATH

2. **Initialize Supabase in your project**:
   ```bash
   supabase init
   ```

3. **Start local Supabase**:
   
   If using Scoop:
   ```bash
   supabase start
   ```
   
   If using npx:
   ```bash
   npx supabase start
   ```
   This will:
   - Start PostgreSQL database
   - Start Supabase Studio (database UI)
   - Provide connection strings

4. **Get your local connection string**:
   After running `supabase start` (or `npx supabase start`), you'll see output like:
   ```
   API URL: http://localhost:54321
   DB URL: postgresql://postgres:postgres@localhost:54322/postgres
   ```
   Copy the DB URL.

5. **Create `.env.local` file**:
   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres"
   ```

6. **Run migrations**:
   ```bash
   npx prisma db push
   ```

7. **Access Supabase Studio**:
   - Open http://localhost:54323 in your browser
   - Manage your database visually

### Option 2: Direct PostgreSQL (No Docker - Alternative)

If you don't want to use Docker, you can run PostgreSQL directly:

1. **Install PostgreSQL**:
   - Download from: https://www.postgresql.org/download/windows/
   - Or use Chocolatey: `choco install postgresql`
   - Or use Scoop: `scoop install postgresql`

2. **Create database**:
   ```sql
   CREATE DATABASE playtime_crm;
   ```

3. **Set connection string**:
   Create `.env.local`:
   ```env
   DATABASE_URL="postgresql://postgres:your_password@localhost:5432/playtime_crm"
   ```

4. **Run migrations**:
   ```bash
   npx prisma db push
   ```

**Note**: You won't get Supabase Studio UI with this method, but you can use Prisma Studio:
```bash
npx prisma studio
```

### Option 3: Docker Compose (Alternative)

1. **Create `docker-compose.yml`** (if not exists):
   ```yaml
   version: '3.8'
   services:
     postgres:
       image: supabase/postgres:latest
       ports:
         - "54322:5432"
       environment:
         POSTGRES_PASSWORD: postgres
         POSTGRES_DB: postgres
       volumes:
         - postgres-data:/var/lib/postgresql/data
   
   volumes:
     postgres-data:
   ```

2. **Start database**:
   ```bash
   docker-compose up -d
   ```

3. **Set DATABASE_URL**:
   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres"
   ```

## Production Setup (Supabase Cloud)

### 1. Create Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Sign up or log in
3. Click **"New Project"**
4. Fill in:
   - **Name**: `playtime-crm` (or your choice)
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose closest to your users
5. Click **"Create new project"**
6. Wait 2-3 minutes for project to be ready

### 2. Get Connection String

1. In your Supabase project dashboard
2. Go to **Settings** → **Database**
3. Scroll to **"Connection string"**
4. Select **"URI"** tab
5. Copy the connection string (it looks like):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```
6. Replace `[YOUR-PASSWORD]` with your actual database password

### 3. Configure Vercel Environment Variable

1. In your Vercel project dashboard
2. Go to **Settings** → **Environment Variables**
3. Add:
   - **Name**: `DATABASE_URL`
   - **Value**: Your Supabase connection string
   - **Environment**: All (Production, Preview, Development)
4. Click **"Save"**

### 4. Deploy to Vercel

1. Push your code to GitHub (already done ✅)
2. Vercel will automatically deploy
3. After deployment, run migrations:
   ```bash
   # Using Vercel CLI
   vercel env pull .env.local
   npx prisma db push
   ```

## Database Migrations

### Local Development

```bash
# Push schema changes
npx prisma db push

# Or create a migration
npx prisma migrate dev --name migration_name
```

### Production

```bash
# Using Vercel CLI
vercel env pull .env.local
npx prisma migrate deploy

# Or push directly (for quick changes)
npx prisma db push
```

## Supabase Studio (Database UI)

### Local
- URL: http://localhost:54323
- Access: No login required (local only)

### Production
- URL: https://app.supabase.com/project/[YOUR-PROJECT]
- Access: Your Supabase account

Features:
- View/edit data
- Run SQL queries
- Manage tables
- View logs
- API documentation

## Environment Variables

### Local (`.env.local`)
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres"
```

### Production (Vercel)
Set in Vercel dashboard:
```
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
```

## Useful Supabase Commands

**If installed via Scoop:**
```bash
# Start local Supabase
supabase start

# Stop local Supabase
supabase stop

# Reset local database
supabase db reset

# View local logs
supabase logs

# Generate TypeScript types (optional)
supabase gen types typescript --local > types/supabase.ts
```

**If using npx (no installation):**
```bash
# Start local Supabase
npx supabase start

# Stop local Supabase
npx supabase stop

# Reset local database
npx supabase db reset

# View local logs
npx supabase logs

# Generate TypeScript types (optional)
npx supabase gen types typescript --local > types/supabase.ts
```

## Troubleshooting

### Connection Issues

1. **Check Supabase is running**:
   ```bash
   supabase status
   ```

2. **Verify connection string**:
   - Local: `postgresql://postgres:postgres@localhost:54322/postgres`
   - Production: Check in Supabase dashboard

3. **Test connection**:
   ```bash
   npx prisma db pull
   ```

### Migration Issues

- Use `npx prisma db push` for development (faster)
- Use `npx prisma migrate dev` for production-ready migrations

### Port Conflicts

If port 54322 is in use:
```bash
# Stop local Supabase
supabase stop

# Or change port in supabase/config.toml
```

## Next Steps

1. ✅ Set up local Supabase
2. ✅ Run `npx prisma db push`
3. ✅ Test locally with `npm run dev`
4. ✅ Create Supabase cloud project
5. ✅ Set Vercel environment variable
6. ✅ Deploy to Vercel
7. ✅ Run production migrations

## Resources

- [Supabase Docs](https://supabase.com/docs)
- [Supabase CLI Docs](https://supabase.com/docs/guides/cli)
- [Prisma + Supabase](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-supabase)

