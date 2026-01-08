import { PrismaClient } from '@prisma/client'
import { startOfDay } from 'date-fns'

const prisma = new PrismaClient()

// Test data with calculated minutes
// Qausar: 11:30-12:30 = 60 min
// Littlepony: 12am-3am (180 min) + 4:53pm-7:30am next day (14h 37min = 877 min) = 1057 min
// Butaskotch: 12am-4:30am = 270 min
// Iamwill: 2:20am-4:30am (130 min) + 5am-7:30am (150 min) = 280 min
// Json: 2:32am-5:18am = 166 min
// 2by4: 3:17am-4:56am (99 min) + 6am-7:30am (90 min) = 189 min
// Gingjongun: 3:30am-7:30am = 240 min
// Hassan: 4:30am-4:47am = 17 min
const testData: Array<{ handle: string; minutes: number }> = [
  { handle: 'Qausar', minutes: 60 },
  { handle: 'Littlepony', minutes: 1057 },
  { handle: 'Butaskotch', minutes: 270 },
  { handle: 'Iamwill', minutes: 280 },
  { handle: 'Json', minutes: 166 },
  { handle: '2by4', minutes: 189 },
  { handle: 'Gingjongun', minutes: 240 },
  { handle: 'Hassan', minutes: 17 },
]

async function main() {
  console.log('Adding playtime test data...')
  
  const today = startOfDay(new Date())
  
  for (const data of testData) {
    // Find or create player
    let player = await prisma.player.findFirst({
      where: { telegramHandle: data.handle },
    })
    
    if (!player) {
      console.log(`Creating player: ${data.handle}`)
      player = await prisma.player.create({
        data: {
          telegramHandle: data.handle,
          status: 'ACTIVE',
          vipTier: 'BRONZE',
          churnRisk: 'LOW',
          skillLevel: 'AMATEUR',
        },
      })
    }
    
    // Upsert playtime entry for today
    const entry = await prisma.playtimeEntry.upsert({
      where: {
        playerId_playedOn: {
          playerId: player.id,
          playedOn: today,
        },
      },
      update: {
        minutes: data.minutes,
      },
      create: {
        playerId: player.id,
        playedOn: today,
        minutes: data.minutes,
      },
    })
    
    console.log(`✓ ${data.handle}: ${data.minutes} minutes (${Math.floor(data.minutes / 60)}h ${data.minutes % 60}m)`)
  }
  
  console.log('\nPlaytime test data added successfully!')
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

