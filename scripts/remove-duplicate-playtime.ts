import { PrismaClient } from '@prisma/client'
import { startOfDay } from 'date-fns'

const prisma = new PrismaClient()

async function main() {
  console.log('Removing duplicate playtime entries...\n')

  try {
    // Get all players
    const players = await prisma.player.findMany({
      select: { id: true, telegramHandle: true },
    })

    let totalRemoved = 0
    let totalMerged = 0

    for (const player of players) {
      // Get all playtime entries for this player, grouped by date
      const entries = await prisma.playtimeEntry.findMany({
        where: { playerId: player.id },
        orderBy: { playedOn: 'asc' },
      })

      // Group by date (normalized to start of day)
      const entriesByDate = new Map<string, typeof entries>()
      
      for (const entry of entries) {
        const dateKey = startOfDay(entry.playedOn).toISOString()
        if (!entriesByDate.has(dateKey)) {
          entriesByDate.set(dateKey, [])
        }
        entriesByDate.get(dateKey)!.push(entry)
      }

      // For each date with multiple entries, merge them
      for (const [dateKey, dateEntries] of entriesByDate.entries()) {
        if (dateEntries.length > 1) {
          console.log(`  Found ${dateEntries.length} entries for ${player.telegramHandle} on ${dateKey}`)
          
          // Merge all entries into one
          const totalMinutes = dateEntries.reduce((sum, e) => sum + e.minutes, 0)
          
          // Find earliest start time and latest end time
          let earliestStart: string | null = null
          let latestEnd: string | null = null
          
          for (const entry of dateEntries) {
            if (entry.startTime && (!earliestStart || entry.startTime < earliestStart)) {
              earliestStart = entry.startTime
            }
            if (entry.endTime && (!latestEnd || entry.endTime > latestEnd)) {
              latestEnd = entry.endTime
            }
          }

          // Keep the first entry, update it with merged data
          const keepEntry = dateEntries[0]
          const toDelete = dateEntries.slice(1)

          await prisma.playtimeEntry.update({
            where: { id: keepEntry.id },
            data: {
              minutes: totalMinutes,
              startTime: earliestStart,
              endTime: latestEnd,
            },
          })

          // Delete the duplicate entries
          for (const entry of toDelete) {
            await prisma.playtimeEntry.delete({
              where: { id: entry.id },
            })
            totalRemoved++
          }
          
          totalMerged++
          console.log(`    ✓ Merged into one entry: ${totalMinutes} minutes`)
        }
      }
    }

    console.log(`\n✅ Removed ${totalRemoved} duplicate entries`)
    console.log(`✅ Merged ${totalMerged} sets of duplicates`)
  } catch (error: any) {
    console.error('Error removing duplicates:', error.message)
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
