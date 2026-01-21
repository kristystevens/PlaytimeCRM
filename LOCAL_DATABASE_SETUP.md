# Local Database Setup Guide

This guide explains how to use a local database for development instead of the production Supabase database.

## Option 1: Use Local SQLite Database (Simplest)

1. **Update your `.env` file** (or create `.env.local`):
   ```env
   DATABASE_URL="file:./prisma/dev.db"
   ```

2. **Switch to SQLite schema**:
   ```bash
   Copy-Item prisma/schema.sqlite.prisma prisma/schema.prisma -Force
   ```

3. **Generate Prisma client and push schema**:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Restart your dev server**

## Option 2: Use Local PostgreSQL with Docker (Recommended)

1. **Start Docker Desktop** (if not already running)

2. **Start PostgreSQL container**:
   ```bash
   docker-compose up -d
   ```

3. **Update your `.env` file** (or create `.env.local`):
   ```env
   DATABASE_URL="postgresql://ginza:ginza_dev_password@localhost:5432/ginza_crm"
   ```

4. **Ensure you're using PostgreSQL schema** (current `schema.prisma`):
   ```bash
   # Verify schema.prisma uses PostgreSQL
   # It should have: provider = "postgresql"
   ```

5. **Generate Prisma client and push schema**:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

6. **Restart your dev server**

## Option 3: Keep Production Database (Current Setup)

If you want to continue using the Supabase database:
- Keep your current `.env` file with the Supabase `DATABASE_URL`
- No changes needed

## Switching Between Databases

- **For local development**: Use `.env.local` with local database URL
- **For production**: Use `.env` with production database URL
- Next.js automatically loads `.env.local` first, which overrides `.env`

## Important Notes

- `.env.local` is gitignored and won't be committed
- Always use `.env.local` for local database credentials
- Never commit production database credentials to git
