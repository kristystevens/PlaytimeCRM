# PostgreSQL Setup for Windows (No Docker)

This guide will help you install and configure PostgreSQL for local development.

## Installation Options

### Option A: Manual Installation (Recommended)

1. **Download PostgreSQL**:
   - Go to: https://www.postgresql.org/download/windows/
   - Click "Download the installer"
   - Download the latest version (e.g., PostgreSQL 16.x)

2. **Run the Installer**:
   - Run the downloaded `.exe` file
   - Follow the installation wizard:
     - **Installation Directory**: Keep default (or choose your own)
     - **Data Directory**: Keep default
     - **Password**: Set a password for the `postgres` user (remember this!)
     - **Port**: Keep default `5432`
     - **Locale**: Keep default
     - **Stack Builder**: You can skip this

3. **Complete Installation**:
   - Wait for installation to finish
   - PostgreSQL service will start automatically

4. **Verify Installation**:
   - Open Command Prompt or PowerShell
   - Run: `psql --version`
   - You should see the version number

### Option B: Using Chocolatey (Requires Admin)

If you have admin rights, open PowerShell as Administrator and run:

```powershell
choco install postgresql --params '/Password:postgres' -y
```

**Note**: Replace `postgres` with your desired password.

## Configure PostgreSQL

### 1. Create Database

Open Command Prompt or PowerShell and run:

```bash
# Connect to PostgreSQL (use the password you set during installation)
psql -U postgres

# Or if psql is not in PATH, use full path:
# "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres
```

Once connected, create the database:

```sql
CREATE DATABASE playtime_crm;
\q
```

### 2. Set Up Environment Variable

Create a `.env.local` file in your project root:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/playtime_crm"
```

**Replace `YOUR_PASSWORD`** with the password you set during PostgreSQL installation.

**Example** (if password is `postgres`):
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/playtime_crm"
```

### 3. Initialize Database Schema

Run Prisma migrations:

```bash
npx prisma db push
```

This will create all the tables in your database.

### 4. (Optional) Seed Database

If you want to add test data:

```bash
npm run db:seed
```

## Verify Setup

### Test Connection

```bash
# Test Prisma connection
npx prisma db pull

# Or open Prisma Studio to view database
npx prisma studio
```

### Start Development Server

```bash
npm run dev
```

Visit http://localhost:3000 and test creating a player!

## Useful PostgreSQL Commands

### Connect to Database

```bash
psql -U postgres -d playtime_crm
```

### Common SQL Commands

```sql
-- List all databases
\l

-- Connect to database
\c playtime_crm

-- List all tables
\dt

-- View table structure
\d table_name

-- Exit
\q
```

### Using Prisma Studio (Easier UI)

```bash
npx prisma studio
```

Opens a web UI at http://localhost:5555 to view and edit your database.

## Troubleshooting

### psql command not found

If `psql` is not recognized, add PostgreSQL to your PATH:

1. Find PostgreSQL installation (usually `C:\Program Files\PostgreSQL\16\bin`)
2. Add to System PATH:
   - Right-click "This PC" → Properties
   - Advanced System Settings → Environment Variables
   - Edit "Path" → Add PostgreSQL bin directory

Or use the full path:
```bash
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres
```

### Connection Refused

- Check PostgreSQL service is running:
  - Open Services (Win+R → `services.msc`)
  - Find "postgresql-x64-16" (or similar)
  - Ensure it's "Running"

### Authentication Failed

- Verify password in `.env.local` matches PostgreSQL password
- Try resetting password:
  ```sql
  ALTER USER postgres WITH PASSWORD 'newpassword';
  ```

### Port Already in Use

If port 5432 is in use:
- Change port in PostgreSQL config
- Or update `DATABASE_URL` to use different port

## Next Steps

Once PostgreSQL is set up:

1. ✅ Database created
2. ✅ `.env.local` configured
3. ✅ Schema pushed with `npx prisma db push`
4. ✅ Start developing with `npm run dev`

## Production Deployment

For production, you'll use Supabase Cloud:
1. Create project at https://app.supabase.com
2. Get connection string
3. Set in Vercel environment variables
4. Deploy!

