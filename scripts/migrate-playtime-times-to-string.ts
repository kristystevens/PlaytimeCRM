import { PrismaClient } from '@prisma/client'
import { format } from 'date-fns'

const prisma = new PrismaClient()

async function main() {
  console.log('Migrating playtime entry start_time and end_time from DateTime to String...')
  
  // Get all playtime entries
  const entries = await prisma.$queryRaw<Array<{
    id: string
    start_time: string | null
    end_time: string | null
  }>>`
    SELECT id, start_time, end_time FROM playtime_entries
  `
  
  console.log(`Found ${entries.length} entries to migrate`)
  
  // SQLite doesn't support ALTER COLUMN, so we need to:
  // 1. Create a new table with String columns
  // 2. Copy data (converting DateTime to HH:mm format)
  // 3. Drop old table
  // 4. Rename new table
  
  // First, let's update existing entries that have DateTime values
  for (const entry of entries) {
    if (entry.start_time || entry.end_time) {
      try {
        // Try to parse as DateTime and convert to HH:mm
        let startTimeStr: string | null = null
        let endTimeStr: string | null = null
        
        if (entry.start_time) {
          // If it's already a string in HH:mm format, keep it
          if (typeof entry.start_time === 'string' && entry.start_time.match(/^\d{2}:\d{2}$/)) {
            startTimeStr = entry.start_time
          } else {
            // Try to parse as DateTime
            const date = new Date(entry.start_time)
            if (!isNaN(date.getTime())) {
              startTimeStr = format(date, 'HH:mm')
            }
          }
        }
        
        if (entry.end_time) {
          // If it's already a string in HH:mm format, keep it
          if (typeof entry.end_time === 'string' && entry.end_time.match(/^\d{2}:\d{2}$/)) {
            endTimeStr = entry.end_time
          } else {
            // Try to parse as DateTime
            const date = new Date(entry.end_time)
            if (!isNaN(date.getTime())) {
              endTimeStr = format(date, 'HH:mm')
            }
          }
        }
        
        // Update the entry using raw SQL since Prisma might have type issues
        await prisma.$executeRaw`
          UPDATE playtime_entries 
          SET start_time = ${startTimeStr}, end_time = ${endTimeStr}
          WHERE id = ${entry.id}
        `
        
        console.log(`Updated entry ${entry.id}`)
      } catch (error) {
        console.error(`Error updating entry ${entry.id}:`, error)
      }
    }
  }
  
  console.log('Migration completed!')
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

