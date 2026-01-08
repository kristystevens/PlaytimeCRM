import { PrismaClient } from '@prisma/client'
import { startOfDay } from 'date-fns'

const prisma = new PrismaClient()

// Player data with calculated minutes
const playerData: Array<{ handle: string; minutes: number }> = [
  { handle: 'Qausar', minutes: 60 }, // 11:30-12:30 = 1 hour
  { handle: 'Littlepony', minutes: 337 }, // 12am-3am (180 min) + 4:53am-7:30am (157 min) = 337 min
  { handle: 'Butaskotch', minutes: 270 }, // 12am-4:30am = 4.5 hours = 270 min
  { handle: 'Iamwill', minutes: 280 }, // 2:20am-4:30am (130 min) + 5am-7:30am (150 min) = 280 min
  { handle: 'Json', minutes: 166 }, // 2:32am-5:18am = 166 min
  { handle: '2by4', minutes: 189 }, // 3:17am-4:56am (99 min) + 6am-7:30am (90 min) = 189 min
  { handle: 'Gingjongun', minutes: 240 }, // 3:30am-7:30am = 4 hours = 240 min
  { handle: 'Hassan', minutes: 17 }, // 4:30am-4:47am = 17 min
]

async function main() {
  console.log('Resetting database and seeding with 8 players...')
  
  // Delete all message tasks that reference players
  console.log('Deleting all message tasks...')
  await prisma.messageTask.deleteMany({})
  
  // Delete all playtime entries (they cascade, but explicit is cleaner)
  console.log('Deleting all playtime entries...')
  await prisma.playtimeEntry.deleteMany({})
  
  // Delete all players
  console.log('Deleting all players...')
  await prisma.player.deleteMany({})
  
  console.log('Creating players and playtime entries...')
  
  const today = startOfDay(new Date())
  
  for (const data of playerData) {
    // Create player
    const player = await prisma.player.create({
      data: {
        telegramHandle: data.handle,
        status: 'ACTIVE',
        vipTier: 'SILVER',
        churnRisk: 'LOW',
        skillLevel: 'AMATEUR',
      },
    })
    
    // Create playtime entry for today
    await prisma.playtimeEntry.create({
      data: {
        playerId: player.id,
        playedOn: today,
        minutes: data.minutes,
      },
    })
    
    console.log(`✓ Created ${data.handle}: ${data.minutes} minutes (${Math.floor(data.minutes / 60)}h ${data.minutes % 60}m)`)
  }
  
  console.log('\nDatabase reset and seeded successfully!')
  console.log(`Created ${playerData.length} players with playtime entries for today.`)
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

