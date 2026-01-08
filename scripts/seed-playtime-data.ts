import { PrismaClient } from '@prisma/client'
import { startOfDay, parse } from 'date-fns'

const prisma = new PrismaClient()

// Playtime data
const playtimeData = [
  // 01/06/2026
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
      { handle: 'Gingjongun', startTime: '03:30', endTime: '07:30', minutes: 240 }, // 3:30am-7:30am = 4 hours
      { handle: 'Hassan', startTime: '04:30', endTime: '04:47', minutes: 17 }, // 4:30am-4:47am = 17 min
    ],
  },
  // 01/07/2026
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
  console.log('Seeding playtime data...')

  for (const dayData of playtimeData) {
    const date = startOfDay(parse(dayData.date, 'yyyy-MM-dd', new Date()))

    for (const entry of dayData.entries) {
      // Find or create player
      let player = await prisma.player.findUnique({
        where: { telegramHandle: entry.handle },
      })

      if (!player) {
        player = await prisma.player.create({
          data: {
            telegramHandle: entry.handle,
            status: 'ACTIVE',
            playerType: 'PLAYER',
            vipTier: 'MEDIUM',
            churnRisk: 'LOW',
            skillLevel: 'AMATEUR',
          },
        })
        console.log(`Created player: ${entry.handle}`)
      }

      // Check if entry already exists for this date
      const existingEntry = await prisma.playtimeEntry.findUnique({
        where: {
          playerId_playedOn: {
            playerId: player.id,
            playedOn: date,
          },
        },
      })

      if (existingEntry) {
        // Update existing entry by adding minutes
        const newMinutes = existingEntry.minutes + entry.minutes
        // For multiple entries on same day, keep earliest start and latest end
        const newStartTime = existingEntry.startTime && entry.startTime
          ? existingEntry.startTime < entry.startTime ? existingEntry.startTime : entry.startTime
          : (entry.startTime || existingEntry.startTime || null)
        const newEndTime = existingEntry.endTime && entry.endTime
          ? existingEntry.endTime > entry.endTime ? existingEntry.endTime : entry.endTime
          : (entry.endTime || existingEntry.endTime || null)

        await prisma.playtimeEntry.update({
          where: { id: existingEntry.id },
          data: {
            minutes: newMinutes,
            startTime: newStartTime,
            endTime: newEndTime,
          },
        })
        console.log(`Updated ${entry.handle} for ${dayData.date}: ${newMinutes} minutes`)
      } else {
        // Create new entry
        // Store times as HH:mm format strings
        await prisma.playtimeEntry.create({
          data: {
            playerId: player.id,
            playedOn: date,
            startTime: entry.startTime || null,
            endTime: entry.endTime || null,
            minutes: entry.minutes,
          },
        })
        console.log(`Created ${entry.handle} for ${dayData.date}: ${entry.minutes} minutes`)
      }
    }
  }

  console.log('\nPlaytime data seeded successfully!')
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

