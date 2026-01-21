import * as fs from 'fs';
import * as path from 'path';

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');

console.log('Switching Prisma schema to SQLite...');

try {
  let schema = fs.readFileSync(schemaPath, 'utf-8');
  
  // Replace PostgreSQL provider with SQLite
  schema = schema.replace(
    /provider\s*=\s*"postgresql"/,
    'provider = "sqlite"'
  );
  
  // Update comment
  schema = schema.replace(
    /\/\/ PostgreSQL schema for production/,
    '// SQLite-compatible schema (no Docker needed!)'
  );
  
  schema = schema.replace(
    /\/\/ This uses PostgreSQL \(Supabase\/Vercel Postgres\)/,
    '// This uses local file storage (dev.db)'
  );
  
  fs.writeFileSync(schemaPath, schema, 'utf-8');
  
  console.log('✅ Schema updated to SQLite');
  console.log('⚠️  Remember to regenerate Prisma client: npx prisma generate');
} catch (error) {
  console.error('❌ Error updating schema:', error);
  process.exit(1);
}
