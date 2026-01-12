import { PrismaClient } from '@prisma/client'
import { startOfDay, parse, differenceInMinutes } from 'date-fns'

const prisma = new PrismaClient()

// Helper function to calculate minutes from time range
function calculateMinutes(startTime: string, endTime: string): number {
  // Parse times (HH:mm format)
  const [startHour, startMin] = startTime.split(':').map(Number)
  const [endHour, endMin] = endTime.split(':').map(Number)
  
  // Create date objects for calculation (using a reference date)
  const refDate = new Date('2026-01-11')
  const start = new Date(refDate)
  start.setHours(startHour, startMin, 0, 0)
  
  const end = new Date(refDate)
  end.setHours(endHour, endMin, 0, 0)
  
  // Handle next day (e.g., 11:30pm to 12:30am)
  if (end < start) {
    end.setDate(end.getDate() + 1)
  }
  
  return Math.max(0, differenceInMinutes(end, start))
}

// Helper to convert AM to PM (add 12 hours)
function convertAMtoPM(timeStr: string): string {
  // Parse time like "3:00 AM" or "3:00AM"
  const cleaned = timeStr.trim().toUpperCase()
  const match = cleaned.match(/(\d+):(\d+)\s*AM/)
  
  if (match) {
    const hours = parseInt(match[1])
    const minutes = match[2]
    // Convert to 24-hour format (AM + 12 hours = PM)
    const hour24 = hours + 12
    return `${hour24.toString().padStart(2, '0')}:${minutes}`
  }
  
  return timeStr // Return as-is if format doesn't match
}

// Playtime data for 01/11/2026 (converted from AM to PM)
const playtimeData = [
  { handle: 'Buttaskotch', startTime: '3:00 AM', endTime: '5:47 AM' },
  { handle: 'Reign', startTime: '3:30 AM', endTime: '4:19 AM' },
  { handle: 'skillzforwealth', startTime: '4:09 AM', endTime: '7:16 AM' },
  { handle: 'lilnigga', startTime: '4:50 AM', endTime: '4:56 AM' },
  { handle: 'jackfruitfruit', startTime: '4:58 AM', endTime: '6:30 AM' },
  { handle: 'tw24', startTime: '5:05 AM', endTime: '6:30 AM' },
  { handle: 'lilnigga', startTime: '5:09 AM', endTime: '6:09 AM' }, // Second entry for lilnigga
  { handle: 'ginjongun', startTime: '5:20 AM', endTime: '6:33 AM' },
]

async function main() {
  console.log('Adding playtime data for 01/11/2026 (AM converted to PM)...\n')

  const date = startOfDay(parse('2026-01-11', 'yyyy-MM-dd', new Date()))
  console.log(`Processing 2026-01-11...\n`)

  for (const entry of playtimeData) {
    try {
      // Convert AM times to PM (24-hour format)
      const startTime24 = convertAMtoPM(entry.startTime)
      const endTime24 = convertAMtoPM(entry.endTime)
      const minutes = calculateMinutes(startTime24, endTime24)

      // Find or create player (check for exact match first, then case-insensitive)
      let player = await prisma.player.findFirst({
        where: {
          OR: [
            { telegramHandle: entry.handle },
            { telegramHandle: { contains: entry.handle, mode: 'insensitive' } },
          ],
        },
      })

      if (!player) {
        // Get next sequential playerID
        const players = await prisma.player.findMany({
          where: {
            playerID: { not: null },
          },
          select: { playerID: true },
        })

        let maxID = 0
        for (const p of players) {
          if (p.playerID) {
            const numericID = parseInt(p.playerID)
            if (!isNaN(numericID) && numericID > maxID) {
              maxID = numericID
            }
          }
        }

        const playerID = (maxID + 1).toString()
        
        player = await prisma.player.create({
          data: {
            telegramHandle: entry.handle,
            playerID: playerID,
            status: 'ACTIVE',
            playerType: 'PLAYER',
            vipTier: 'MEDIUM',
            churnRisk: 'LOW',
            skillLevel: 'AMATEUR',
          },
        })
        console.log(`  ✓ Created player: ${entry.handle} (ID: ${playerID})`)
      }

      // Check if there's already an entry for this player and date
      const existingEntry = await prisma.playtimeEntry.findFirst({
        where: {
          playerId: player.id,
          playedOn: date,
        },
      })

      if (existingEntry) {
        // If entry exists, update by adding minutes and keeping the earliest start/latest end
        const newMinutes = existingEntry.minutes + minutes
        const newStartTime = existingEntry.startTime && startTime24
          ? (existingEntry.startTime < startTime24 ? existingEntry.startTime : startTime24)
          : (startTime24 || existingEntry.startTime || null)
        const newEndTime = existingEntry.endTime && endTime24
          ? (existingEntry.endTime > endTime24 ? existingEntry.endTime : endTime24)
          : (endTime24 || existingEntry.endTime || null)

        await prisma.playtimeEntry.update({
          where: { id: existingEntry.id },
          data: {
            minutes: newMinutes,
            startTime: newStartTime,
            endTime: newEndTime,
          },
        })
        console.log(`  ✓ Updated ${entry.handle}: ${existingEntry.minutes} + ${minutes} = ${newMinutes} minutes (${newStartTime} - ${newEndTime})`)
      } else {
        // Create new entry
        await prisma.playtimeEntry.create({
          data: {
            playerId: player.id,
            playedOn: date,
            startTime: startTime24,
            endTime: endTime24,
            minutes,
          },
        })
        console.log(`  ✓ Created ${entry.handle}: ${minutes} minutes (${startTime24} - ${endTime24})`)
      }
    } catch (error: any) {
      console.error(`  ✗ Error processing ${entry.handle}:`, error.message)
    }
  }

  console.log('\n✅ Playtime data added successfully!')
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
