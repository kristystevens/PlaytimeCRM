import { PrismaClient } from '@prisma/client'
import { parse, differenceInMinutes, format } from 'date-fns'

const prisma = new PrismaClient()

async function main() {
  console.log('Recalculating all playtime metrics...\n')

  try {
    // Get all playtime entries
    const entries = await prisma.playtimeEntry.findMany({
      orderBy: {
        playedOn: 'desc',
      },
    })

    console.log(`Found ${entries.length} playtime entries to process\n`)

    let updatedCount = 0
    let skippedCount = 0
    let errorCount = 0

    for (const entry of entries) {
      try {
        let newMinutes = entry.minutes
        let shouldUpdate = false

        // If entry has both startTime and endTime, recalculate minutes
        if (entry.startTime && entry.endTime) {
          try {
            const dateStr = format(entry.playedOn, 'yyyy-MM-dd')
            const startDateTime = parse(`${dateStr} ${entry.startTime}`, 'yyyy-MM-dd HH:mm', new Date())
            let endDateTime = parse(`${dateStr} ${entry.endTime}`, 'yyyy-MM-dd HH:mm', new Date())
            
            // Handle next day (e.g., 11:30pm to 12:30am)
            if (endDateTime < startDateTime) {
              endDateTime = new Date(endDateTime.getTime() + 24 * 60 * 60 * 1000)
            }
            
            const calculatedMinutes = Math.max(0, differenceInMinutes(endDateTime, startDateTime))
            
            // Only update if the calculated minutes differ from stored minutes
            if (calculatedMinutes !== entry.minutes) {
              newMinutes = calculatedMinutes
              shouldUpdate = true
              console.log(
                `  Entry ${entry.id} (${entry.playedOn.toISOString().split('T')[0]}): ` +
                `${entry.minutes} → ${calculatedMinutes} minutes ` +
                `(${entry.startTime} - ${entry.endTime})`
              )
            }
          } catch (parseError) {
            console.error(`  ✗ Error parsing times for entry ${entry.id}:`, parseError)
            errorCount++
            continue
          }
        } else {
          // Entry doesn't have both times, skip recalculation
          skippedCount++
          continue
        }

        // Update the entry if needed
        if (shouldUpdate) {
          await prisma.playtimeEntry.update({
            where: { id: entry.id },
            data: {
              minutes: newMinutes,
            },
          })
          updatedCount++
        }
      } catch (error: any) {
        console.error(`  ✗ Error processing entry ${entry.id}:`, error.message)
        errorCount++
      }
    }

    console.log('\n✅ Recalculation complete!')
    console.log(`   Updated: ${updatedCount} entries`)
    console.log(`   Skipped: ${skippedCount} entries (no start/end times)`)
    console.log(`   Errors: ${errorCount} entries`)

    // Now verify total playtime for all players
    console.log('\n📊 Verifying total playtime for all players...\n')
    
    const players = await prisma.player.findMany({
      include: {
        playtimeEntries: {
          select: {
            minutes: true,
          },
        },
      },
    })

    let playersWithIssues = 0
    for (const player of players) {
      const calculatedTotal = player.playtimeEntries.reduce((sum, entry) => {
        const minutes = entry.minutes
        if (typeof minutes === 'number' && !isNaN(minutes) && minutes >= 0) {
          return sum + minutes
        }
        return sum
      }, 0)

      // Format playtime for display
      const hours = Math.floor(calculatedTotal / 60)
      const minutes = calculatedTotal % 60
      const formattedTime = `${hours}h ${minutes}m`

      console.log(`  ${player.telegramHandle}: ${formattedTime} (${calculatedTotal} minutes)`)
    }

    console.log(`\n✅ Verified ${players.length} players`)
  } catch (error: any) {
    console.error('Error recalculating playtime metrics:', error.message)
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
