import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

/**
 * This script clones data from SQLite to PostgreSQL
 * 
 * It works by:
 * 1. First exporting from SQLite (if export file doesn't exist)
 * 2. Then importing to PostgreSQL
 * 
 * Usage:
 * 1. Set DATABASE_URL in .env.local to point to PostgreSQL (production)
 * 2. Run: npm run clone-db
 */

const exportPath = path.join(__dirname, 'sqlite-export.json');

async function exportFromSQLite() {
  console.log('📤 Step 1: Exporting from SQLite...\n');
  
  // Temporarily switch to SQLite by setting DATABASE_URL
  const originalDbUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = process.env.SQLITE_DATABASE_URL || 'file:./prisma/dev.db';
  
  // We need to use a Prisma client that works with SQLite
  // Since Prisma Client is tied to the schema provider, we'll use the export script
  const { execSync } = require('child_process');
  
  try {
    // Run the export script
    execSync('npm run export-sqlite', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    console.log('\n✅ Export completed\n');
  } catch (error) {
    console.error('❌ Export failed:', error);
    throw error;
  } finally {
    // Restore original DATABASE_URL
    if (originalDbUrl) {
      process.env.DATABASE_URL = originalDbUrl;
    }
  }
}

async function importToPostgreSQL() {
  console.log('📥 Step 2: Importing to PostgreSQL...\n');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set!');
    console.error('   Please set DATABASE_URL in .env.local to your PostgreSQL connection string');
    process.exit(1);
  }
  
  if (!fs.existsSync(exportPath)) {
    console.error(`❌ Export file not found: ${exportPath}`);
    console.error('   Please run the export first or ensure the file exists');
    process.exit(1);
  }
  
  const { execSync } = require('child_process');
  
  try {
    // Run the import script
    execSync('npm run import-postgres', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    console.log('\n✅ Import completed\n');
  } catch (error) {
    console.error('❌ Import failed:', error);
    throw error;
  }
}

async function cloneDatabase() {
  console.log('🔄 Cloning SQLite database to PostgreSQL...\n');
  
  try {
    // Check if export file exists
    if (!fs.existsSync(exportPath)) {
      console.log('📤 Export file not found. Exporting from SQLite first...\n');
      await exportFromSQLite();
    } else {
      console.log('✅ Export file found. Using existing export.\n');
    }
    
    // Import to PostgreSQL
    await importToPostgreSQL();
    
    console.log('✅ Database clone completed successfully!');
    console.log('\n📊 Your SQLite data has been cloned to PostgreSQL.');
    console.log('   Check your production database to verify the data.');
    
  } catch (error) {
    console.error('❌ Clone failed:', error);
    process.exit(1);
  }
}

cloneDatabase()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Clone failed:', error);
    process.exit(1);
  });
