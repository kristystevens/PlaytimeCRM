import * as fs from 'fs';
import * as path from 'path';

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');

console.log('Switching Prisma schema to PostgreSQL...');

try {
  let schema = fs.readFileSync(schemaPath, 'utf-8');
  
  // Replace SQLite provider with PostgreSQL
  schema = schema.replace(
    /provider\s*=\s*"sqlite"/,
    'provider = "postgresql"'
  );
  
  // Update comment
  schema = schema.replace(
    /\/\/ SQLite-compatible schema/,
    '// PostgreSQL schema for production'
  );
  
  schema = schema.replace(
    /\/\/ This uses local file storage \(dev\.db\)/,
    '// This uses PostgreSQL (Supabase/Vercel Postgres)'
  );
  
  fs.writeFileSync(schemaPath, schema, 'utf-8');
  
  console.log('✅ Schema updated to PostgreSQL');
  console.log('⚠️  Remember to regenerate Prisma client: npx prisma generate');
} catch (error) {
  console.error('❌ Error updating schema:', error);
  process.exit(1);
}
