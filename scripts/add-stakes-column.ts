import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Adding stakes column to playtime_entries table...')
  
  try {
    // Use raw SQL to add the column if it doesn't exist
    await prisma.$executeRawUnsafe(`
      ALTER TABLE playtime_entries 
      ADD COLUMN IF NOT EXISTS stakes TEXT;
    `)
    
    console.log('✅ Successfully added stakes column to playtime_entries table')
  } catch (error: any) {
    console.error('Error adding stakes column:', error.message)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })
