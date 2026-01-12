import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Adding missing columns to database...\n')

  try {
    // Check if columns exist by trying to query them
    // If they don't exist, we'll need to add them via raw SQL
    
    // Add is_runner column if it doesn't exist
    await prisma.$executeRawUnsafe(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'players' AND column_name = 'is_runner'
        ) THEN
          ALTER TABLE players ADD COLUMN is_runner BOOLEAN DEFAULT false;
        END IF;
      END $$;
    `)
    console.log('✓ Added is_runner column')

    // Add is_agent column if it doesn't exist
    await prisma.$executeRawUnsafe(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'players' AND column_name = 'is_agent'
        ) THEN
          ALTER TABLE players ADD COLUMN is_agent BOOLEAN DEFAULT false;
        END IF;
      END $$;
    `)
    console.log('✓ Added is_agent column')

    // Add player_id column if it doesn't exist
    await prisma.$executeRawUnsafe(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'players' AND column_name = 'player_id'
        ) THEN
          ALTER TABLE players ADD COLUMN player_id VARCHAR(255) UNIQUE;
        END IF;
      END $$;
    `)
    console.log('✓ Added player_id column')

    console.log('\n✅ All columns added successfully!')
  } catch (error: any) {
    console.error('Error adding columns:', error.message)
    throw error
  }
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
