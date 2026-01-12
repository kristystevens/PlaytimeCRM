import { PrismaClient } from '@prisma/client'
import { startOfDay, parse, differenceInMinutes } from 'date-fns'

const prisma = new PrismaClient()

// Helper function to calculate minutes from time range
function calculateMinutes(startTime: string, endTime: string): number {
  // Parse times (HH:mm format)
  const [startHour, startMin] = startTime.split(':').map(Number)
  const [endHour, endMin] = endTime.split(':').map(Number)
  
  // Create date objects for calculation (using a reference date)
  const refDate = new Date('2026-01-01')
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

// Helper to parse time from various formats
function parseTime(timeStr: string): string {
  // Remove spaces and convert to 24-hour format
  let cleaned = timeStr.trim().toLowerCase()
  
  // Handle formats like "11:30pm", "12:30am", "6am", "12:41pm"
  if (cleaned.includes('am') || cleaned.includes('pm')) {
    const isPM = cleaned.includes('pm')
    cleaned = cleaned.replace(/[ap]m/g, '').trim()
    
    const [hours, minutes = '0'] = cleaned.split(':')
    let hour24 = parseInt(hours)
    
    if (isPM && hour24 !== 12) {
      hour24 += 12
    } else if (!isPM && hour24 === 12) {
      hour24 = 0
    }
    
    return `${hour24.toString().padStart(2, '0')}:${minutes.padStart(2, '0')}`
  }
  
  // Already in 24-hour format
  return cleaned
}

// Helper to get the next sequential playerID
let nextPlayerID: number | null = null

async function getNextPlayerID(): Promise<string> {
  if (nextPlayerID === null) {
    // Find the highest existing numeric playerID
    const players = await prisma.player.findMany({
      where: {
        playerID: { not: null },
      },
      select: { playerID: true },
    })

    let maxID = 0
    for (const player of players) {
      if (player.playerID) {
        const numericID = parseInt(player.playerID)
        if (!isNaN(numericID) && numericID > maxID) {
          maxID = numericID
        }
      }
    }

    nextPlayerID = maxID + 1
  }

  const id = nextPlayerID.toString()
  nextPlayerID++
  return id
}

// Playtime data for 2026
const playtimeData = [
  // 01/06/2026 (January 6, 2026)
  {
    date: '2026-01-06',
    entries: [
      { handle: 'Qausar', startTime: '23:30', endTime: '00:30', minutes: 60 }, // 11:30pm-12:30am (next day) = 1 hour
      { handle: 'Littlepony', startTime: '00:00', endTime: '03:00', minutes: 180 }, // 12am-3am = 3 hours
      { handle: 'Littlepony', startTime: '04:53', endTime: '07:30', minutes: 157 }, // 4:53am-7:30am = 2h 37m
      { handle: 'Butaskotch', startTime: '00:00', endTime: '04:30', minutes: 270 }, // 12am-4:30am = 4.5 hours
      { handle: 'Iamwill', startTime: '02:20', endTime: '04:30', minutes: 130 }, // 2:20am-4:30am = 2h 10m
      { handle: 'Iamwill', startTime: '05:00', endTime: '07:30', minutes: 150 }, // 5am-7:30am = 2h 30m
      { handle: 'Json', startTime: '02:32', endTime: '05:18', minutes: 166 }, // 2:32am-5:18am = 2h 46m
      { handle: '2by4', startTime: '03:17', endTime: '04:56', minutes: 99 }, // 3:17am-4:56am = 1h 39m
      { handle: '2by4', startTime: '06:00', endTime: '07:30', minutes: 90 }, // 6am-7:30am = 1h 30m
      { handle: 'Ginjongun', startTime: '03:30', endTime: '07:30', minutes: 240 }, // 3:30am-7:30am = 4 hours (fixed typo: Gingjongun -> Ginjongun)
      { handle: 'Hassan', startTime: '04:30', endTime: '04:47', minutes: 17 }, // 4:30am-4:47am = 17 min
    ],
  },
  // 01/07/2026 (January 7, 2026)
  {
    date: '2026-01-07',
    entries: [
      { handle: 'Ginjongun', startTime: '06:00', endTime: '11:04', minutes: 304 }, // 6am-11:04am = 5h 4m
      { handle: 'Littlepony', startTime: '06:00', endTime: '10:42', minutes: 282 }, // 6am-10:42am = 4h 42m
      { handle: 'Json', startTime: '06:25', endTime: '06:40', minutes: 15 }, // 6:25am-6:40am = 15 min
      { handle: 'Arise', startTime: '06:45', endTime: '09:15', minutes: 150 }, // 6:45am-9:15am = 2h 30m
      { handle: 'Alexint…dark', startTime: '06:55', endTime: '09:34', minutes: 159 }, // 6:55am-9:34am = 2h 39m
      { handle: 'Royalg00n', startTime: '07:30', endTime: '12:41', minutes: 311 }, // 7:30am-12:41pm = 5h 11m
      { handle: 'Tankhard', startTime: '07:45', endTime: '09:03', minutes: 78 }, // 7:45am-9:03am = 1h 18m
      { handle: 'Inluvws…ence', startTime: '07:55', endTime: '08:50', minutes: 55 }, // 7:55am-8:50am = 55 min
      { handle: 'Up_some…imes', startTime: '08:16', endTime: '11:30', minutes: 194 }, // 8:16am-11:30am = 3h 14m
      { handle: 'Thiccy', startTime: '09:52', endTime: '11:51', minutes: 119 }, // 9:52am-11:51am = 1h 59m
      { handle: 'Umbreon', startTime: '11:24', endTime: '12:41', minutes: 77 }, // 11:24am-12:41pm = 1h 17m
    ],
  },
]

async function main() {
  console.log('Seeding playtime data for 2026...\n')

  for (const dayData of playtimeData) {
    const date = startOfDay(parse(dayData.date, 'yyyy-MM-dd', new Date()))
    console.log(`\nProcessing ${dayData.date}...`)

    for (const entry of dayData.entries) {
      try {
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
          const playerID = await getNextPlayerID()
          
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
        } else if (!player.playerID || isNaN(parseInt(player.playerID))) {
          // If player exists but has no playerID or non-numeric ID, assign sequential one
          const playerID = await getNextPlayerID()
          player = await prisma.player.update({
            where: { id: player.id },
            data: { playerID: playerID },
          })
          console.log(`  ✓ Assigned playerID to existing player: ${entry.handle} (ID: ${playerID})`)
        }

        // For players with multiple entries on the same day, we need to handle them differently
        // Check if there's already an entry for this player and date
        const existingEntry = await prisma.playtimeEntry.findFirst({
          where: {
            playerId: player.id,
            playedOn: date,
          },
        })

        if (existingEntry) {
          // If entry exists, update by adding minutes and keeping the earliest start/latest end
          const newMinutes = existingEntry.minutes + entry.minutes
          const newStartTime = existingEntry.startTime && entry.startTime
            ? (existingEntry.startTime < entry.startTime ? existingEntry.startTime : entry.startTime)
            : (entry.startTime || existingEntry.startTime || null)
          const newEndTime = existingEntry.endTime && entry.endTime
            ? (existingEntry.endTime > entry.endTime ? existingEntry.endTime : entry.endTime)
            : (entry.endTime || existingEntry.endTime || null)

          await prisma.playtimeEntry.update({
            where: { id: existingEntry.id },
            data: {
              minutes: newMinutes,
              startTime: newStartTime,
              endTime: newEndTime,
            },
          })
          console.log(`  ✓ Updated ${entry.handle}: ${existingEntry.minutes} + ${entry.minutes} = ${newMinutes} minutes`)
        } else {
          // Create new entry
          await prisma.playtimeEntry.create({
            data: {
              playerId: player.id,
              playedOn: date,
              startTime: entry.startTime || null,
              endTime: entry.endTime || null,
              minutes: entry.minutes,
            },
          })
          console.log(`  ✓ Created ${entry.handle}: ${entry.minutes} minutes (${entry.startTime} - ${entry.endTime})`)
        }
      } catch (error: any) {
        console.error(`  ✗ Error processing ${entry.handle}:`, error.message)
      }
    }
  }

  console.log('\n✅ Playtime data seeded successfully!')
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
