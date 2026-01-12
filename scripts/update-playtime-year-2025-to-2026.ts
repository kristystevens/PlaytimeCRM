import { PrismaClient } from '@prisma/client'
import { addYears } from 'date-fns'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting migration: Updating playtime entries from 2025 to 2026...')

  // Find all playtime entries from 2025
  const entries2025 = await prisma.playtimeEntry.findMany({
    where: {
      playedOn: {
        gte: new Date('2025-01-01T00:00:00.000Z'),
        lt: new Date('2026-01-01T00:00:00.000Z'),
      },
    },
  })

  console.log(`Found ${entries2025.length} entries from 2025`)

  if (entries2025.length === 0) {
    console.log('No entries to update.')
    return
  }

  let updated = 0
  let errors = 0

  // Update each entry
  for (const entry of entries2025) {
    try {
      // Add 1 year to the playedOn date
      const newDate = addYears(entry.playedOn, 1)

      // Check if an entry already exists for the new date and same player
      const existingEntry = await prisma.playtimeEntry.findUnique({
        where: {
          playerId_playedOn: {
            playerId: entry.playerId,
            playedOn: newDate,
          },
        },
      })

      if (existingEntry) {
        // If entry exists, merge the minutes and keep the earliest start and latest end time
        const mergedMinutes = (existingEntry.minutes || 0) + (entry.minutes || 0)
        
        // Determine earliest start time
        let mergedStartTime = existingEntry.startTime
        if (entry.startTime) {
          if (!mergedStartTime) {
            mergedStartTime = entry.startTime
          } else {
            const [existingHour, existingMin] = mergedStartTime.split(':').map(Number)
            const [entryHour, entryMin] = entry.startTime.split(':').map(Number)
            const existingMinutes = existingHour * 60 + existingMin
            const entryMinutes = entryHour * 60 + entryMin
            if (entryMinutes < existingMinutes) {
              mergedStartTime = entry.startTime
            }
          }
        }

        // Determine latest end time
        let mergedEndTime = existingEntry.endTime
        if (entry.endTime) {
          if (!mergedEndTime) {
            mergedEndTime = entry.endTime
          } else {
            const [existingHour, existingMin] = mergedEndTime.split(':').map(Number)
            const [entryHour, entryMin] = entry.endTime.split(':').map(Number)
            const existingMinutes = existingHour * 60 + existingMin
            const entryMinutes = entryHour * 60 + entryMin
            if (entryMinutes > existingMinutes) {
              mergedEndTime = entry.endTime
            }
          }
        }

        // Update the existing entry
        await prisma.playtimeEntry.update({
          where: {
            id: existingEntry.id,
          },
          data: {
            minutes: mergedMinutes,
            startTime: mergedStartTime,
            endTime: mergedEndTime,
          },
        })

        // Delete the old entry
        await prisma.playtimeEntry.delete({
          where: {
            id: entry.id,
          },
        })

        console.log(`Merged entry for player ${entry.playerId} on ${entry.playedOn.toISOString().split('T')[0]} -> ${newDate.toISOString().split('T')[0]}`)
      } else {
        // No conflict, just update the date
        await prisma.playtimeEntry.update({
          where: {
            id: entry.id,
          },
          data: {
            playedOn: newDate,
          },
        })

        console.log(`Updated entry ${entry.id}: ${entry.playedOn.toISOString().split('T')[0]} -> ${newDate.toISOString().split('T')[0]}`)
      }

      updated++
    } catch (error) {
      console.error(`Error updating entry ${entry.id}:`, error)
      errors++
    }
  }

  console.log(`\nMigration complete!`)
  console.log(`Updated: ${updated}`)
  console.log(`Errors: ${errors}`)
}

main()
  .catch((e) => {
    console.error('Migration failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
