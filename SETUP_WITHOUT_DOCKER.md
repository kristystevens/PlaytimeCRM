# Setup Without Docker

## Option 1: Install PostgreSQL on Windows

1. **Download PostgreSQL:**
   - Visit: https://www.postgresql.org/download/windows/
   - Download and install PostgreSQL 15 or later
   - During installation, remember the password you set for the `postgres` user

2. **Create Database:**
   ```powershell
   # Open PostgreSQL command line (psql) or use pgAdmin
   # Create database and user
   psql -U postgres
   ```
   
   Then in psql:
   ```sql
   CREATE DATABASE ginza_crm;
   CREATE USER ginza WITH PASSWORD 'ginza_dev_password';
   GRANT ALL PRIVILEGES ON DATABASE ginza_crm TO ginza;
   \q
   ```

3. **Update .env file:**
   ```
   DATABASE_URL="postgresql://ginza:ginza_dev_password@localhost:5432/ginza_crm?schema=public"
   ```

4. **Run migrations and seed:**
   ```powershell
   npm run db:migrate
   npm run db:seed
   npm run dev
   ```

## Option 2: Use SQLite (Simplest - No Installation Needed)

I can modify the project to use SQLite instead of PostgreSQL. This requires:
- No database installation
- No Docker
- Just works out of the box

Would you like me to convert the project to use SQLite?

## Option 3: Use Cloud Database

- **Supabase** (Free tier available): https://supabase.com
- **Neon** (Free tier): https://neon.tech
- **Railway** (Free tier): https://railway.app

Just update the `DATABASE_URL` in `.env` with your cloud database connection string.

