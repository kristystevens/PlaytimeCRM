import { PrismaClient } from '@prisma/client'
import { parse, format } from 'date-fns'

const prisma = new PrismaClient()

// Parse playtime string (e.g., "1h", "11h 30m", "17m") to minutes
function parsePlaytime(playtimeStr: string): number {
  if (!playtimeStr || playtimeStr === '-' || playtimeStr === '0m') return 0
  
  let totalMinutes = 0
  const hoursMatch = playtimeStr.match(/(\d+)h/)
  const minutesMatch = playtimeStr.match(/(\d+)m/)
  
  if (hoursMatch) {
    totalMinutes += parseInt(hoursMatch[1]) * 60
  }
  if (minutesMatch) {
    totalMinutes += parseInt(minutesMatch[1])
  }
  
  return totalMinutes
}

// Parse date string (e.g., "1/5/2026 19:30") to Date
function parseDate(dateStr: string): Date | null {
  if (!dateStr || dateStr.trim() === '') return null
  
  try {
    // Format: "1/5/2026 19:30" -> "M/d/yyyy HH:mm"
    return parse(dateStr.trim(), 'M/d/yyyy HH:mm', new Date())
  } catch (error) {
    try {
      // Try without time
      return parse(dateStr.trim(), 'M/d/yyyy', new Date())
    } catch {
      return null
    }
  }
}

// Get next playerID
async function getNextPlayerID(): Promise<string> {
  const players = await prisma.player.findMany({
    where: { playerID: { not: null } },
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

  return (maxID + 1).toString()
}

async function main() {
  console.log('Seeding players data...\n')

  const playersData = [
    { telegram: 'Qausar', ginza: '', type: 'PLAYER', status: 'ACTIVE', churnRisk: 'LOW', skillLevel: 'AMATEUR', country: '', lastActive: '1/5/2026 19:30', mostActive: '12pm-1pm', playtime: '1h', runner: '', agent: '', notes: '' },
    { telegram: 'Ginjongun', ginza: '', type: 'PLAYER', status: 'ACTIVE', churnRisk: 'LOW', skillLevel: 'AMATEUR', country: '', lastActive: '1/11/2026 13:33', mostActive: '5am-7am, 6pm-11pm', playtime: '11h 30m', runner: '', agent: '', notes: '' },
    { telegram: 'Buttaskotch', ginza: '', type: 'PLAYER', status: 'ACTIVE', churnRisk: 'LOW', skillLevel: 'AMATEUR', country: '', lastActive: '1/5/2026 23:30', mostActive: '12pm-5pm', playtime: '4h 30m', runner: '', agent: '', notes: '' },
    { telegram: 'Iamwill', ginza: '', type: 'PLAYER', status: 'ACTIVE', churnRisk: 'LOW', skillLevel: 'AMATEUR', country: '', lastActive: '1/6/2026 2:30', mostActive: '2pm-8pm', playtime: '5h 10m', runner: '', agent: '', notes: '' },
    { telegram: 'Json', ginza: '', type: 'PLAYER', status: 'ACTIVE', churnRisk: 'LOW', skillLevel: 'AMATEUR', country: '', lastActive: '1/7/2026 1:40', mostActive: '6pm-7pm, 3pm-5pm', playtime: '3h 1m', runner: '', agent: '', notes: '' },
    { telegram: '2by4', ginza: '', type: 'PLAYER', status: 'ACTIVE', churnRisk: 'LOW', skillLevel: 'AMATEUR', country: '', lastActive: '1/6/2026 2:30', mostActive: '3pm-8pm', playtime: '4h 13m', runner: '', agent: '', notes: '' },
    { telegram: 'Hassan', ginza: '', type: 'PLAYER', status: 'ACTIVE', churnRisk: 'LOW', skillLevel: 'AMATEUR', country: '', lastActive: '1/5/2026 23:47', mostActive: '5pm-5pm', playtime: '17m', runner: '', agent: '', notes: '' },
    { telegram: 'Arise', ginza: '', type: 'PLAYER', status: 'ACTIVE', churnRisk: 'LOW', skillLevel: 'AMATEUR', country: '', lastActive: '1/7/2026 4:15', mostActive: '7pm-9pm', playtime: '2h 30m', runner: '', agent: '', notes: '' },
    { telegram: 'Royalg00n', ginza: '', type: 'PLAYER', status: 'ACTIVE', churnRisk: 'LOW', skillLevel: 'AMATEUR', country: '', lastActive: '1/7/2026 7:41', mostActive: '8pm-1am', playtime: '5h 11m', runner: '', agent: '', notes: '' },
    { telegram: 'Tankhard', ginza: '', type: 'PLAYER', status: 'ACTIVE', churnRisk: 'LOW', skillLevel: 'AMATEUR', country: '', lastActive: '1/11/2026 11:25', mostActive: '4am-4am, 8pm-9pm', playtime: '2h 9m', runner: '', agent: '', notes: '' },
    { telegram: 'Inluvwsâ€¦ence', ginza: '', type: 'PLAYER', status: 'ACTIVE', churnRisk: 'LOW', skillLevel: 'AMATEUR', country: '', lastActive: '1/7/2026 3:50', mostActive: '8pm-9pm', playtime: '55m', runner: '', agent: '', notes: '' },
    { telegram: 'Up_sometimes', ginza: '', type: 'PLAYER', status: 'ACTIVE', churnRisk: 'LOW', skillLevel: 'AMATEUR', country: '', lastActive: '1/7/2026 6:30', mostActive: '8pm-12am', playtime: '3h 14m', runner: '', agent: '', notes: '' },
    { telegram: 'Thiccy', ginza: '', type: 'PLAYER', status: 'ACTIVE', churnRisk: 'LOW', skillLevel: 'AMATEUR', country: '', lastActive: '1/7/2026 6:51', mostActive: '10pm-12am', playtime: '1h 59m', runner: '', agent: '', notes: '' },
    { telegram: 'Umbreon', ginza: '', type: 'PLAYER', status: 'ACTIVE', churnRisk: 'LOW', skillLevel: 'AMATEUR', country: '', lastActive: '1/7/2026 7:41', mostActive: '11pm-1am', playtime: '1h 17m', runner: '', agent: '', notes: '' },
    { telegram: 'Specialmoneyglitch', ginza: 'skillzforwealth', type: 'PLAYER', status: 'ACTIVE', churnRisk: 'LOW', skillLevel: 'AMATEUR', country: '', lastActive: '1/12/2026 14:16', mostActive: '4am-7am', playtime: '3h 7m', runner: '', agent: '', notes: 'Came from mystic dao community? ' },
    { telegram: 'Littlepony', ginza: 'Littlepony', type: 'PLAYER', status: 'ACTIVE', churnRisk: 'LOW', skillLevel: 'AMATEUR', country: '', lastActive: '1/11/2026 15:00', mostActive: '3am-8am, 6pm-11pm', playtime: '17h 4m', runner: '', agent: '', notes: '' },
    { telegram: 'Alexinthedark', ginza: 'Alexinthedark', type: 'AGENT', status: 'ACTIVE', churnRisk: 'LOW', skillLevel: 'AMATEUR', country: '', lastActive: '1/7/2026 4:34', mostActive: '7pm-10pm', playtime: '2h 39m', runner: '', agent: '', notes: '' },
    { telegram: 'Buttaskotch', ginza: '', type: 'PLAYER', status: 'ACTIVE', churnRisk: 'LOW', skillLevel: 'AMATEUR', country: '', lastActive: '1/11/2026 12:47', mostActive: '3am-6am', playtime: '5h 29m', runner: '', agent: '', notes: '' },
    { telegram: 'Reign', ginza: '', type: 'PLAYER', status: 'ACTIVE', churnRisk: 'LOW', skillLevel: 'AMATEUR', country: '', lastActive: '1/11/2026 11:19', mostActive: '4am-4am', playtime: '49m', runner: '', agent: '', notes: '' },
    { telegram: 'skillzforwealth', ginza: '', type: 'PLAYER', status: 'ACTIVE', churnRisk: 'LOW', skillLevel: 'AMATEUR', country: '', lastActive: '1/11/2026 14:16', mostActive: '4am-7am', playtime: '3h 7m', runner: '', agent: '', notes: '' },
    { telegram: 'lilnigga', ginza: '', type: 'PLAYER', status: 'ACTIVE', churnRisk: 'LOW', skillLevel: 'AMATEUR', country: '', lastActive: '1/11/2026 13:09', mostActive: '5am-6am', playtime: '1h 6m', runner: '', agent: '', notes: '' },
    { telegram: 'jackfruitfruit', ginza: '', type: 'PLAYER', status: 'ACTIVE', churnRisk: 'LOW', skillLevel: 'AMATEUR', country: '', lastActive: '1/11/2026 13:30', mostActive: '5am-7am', playtime: '1h 32m', runner: '', agent: '', notes: '' },
    { telegram: 'tw24', ginza: '', type: 'PLAYER', status: 'ACTIVE', churnRisk: 'LOW', skillLevel: 'AMATEUR', country: '', lastActive: '1/11/2026 13:30', mostActive: '5am-7am', playtime: '1h 25m', runner: '', agent: '', notes: '' },
    { telegram: 'mobydicks', ginza: '', type: 'PLAYER', status: 'ACTIVE', churnRisk: 'LOW', skillLevel: 'AMATEUR', country: '', lastActive: '1/11/2026 12:10', mostActive: '3am-5am', playtime: '1h 45m', runner: '', agent: '', notes: '' },
    { telegram: 'rad1bad1', ginza: '', type: 'PLAYER', status: 'ACTIVE', churnRisk: 'LOW', skillLevel: 'AMATEUR', country: '', lastActive: '1/11/2026 15:00', mostActive: '4am-8am', playtime: '3h 2m', runner: '', agent: '', notes: '' },
    { telegram: 'royalgoon', ginza: '', type: 'PLAYER', status: 'ACTIVE', churnRisk: 'LOW', skillLevel: 'AMATEUR', country: '', lastActive: '1/11/2026 12:44', mostActive: '4am-6am', playtime: '1h 40m', runner: '', agent: '', notes: '' },
    { telegram: 'gingjongun', ginza: '', type: 'PLAYER', status: 'ACTIVE', churnRisk: 'LOW', skillLevel: 'AMATEUR', country: '', lastActive: '1/11/2026 15:00', mostActive: '5am-8am', playtime: '2h 45m', runner: '', agent: '', notes: '' },
    { telegram: 'Test', ginza: '', type: 'AGENT', status: 'ACTIVE', churnRisk: 'LOW', skillLevel: 'AMATEUR', country: '', lastActive: '', mostActive: '-', playtime: '0m', runner: '', agent: '', notes: '' },
  ]

  let created = 0
  let updated = 0
  let skipped = 0

  for (const data of playersData) {
    try {
      const isAgent = data.type === 'AGENT'
      const lastActiveAt = parseDate(data.lastActive)
      const totalPlaytime = parsePlaytime(data.playtime)
      
      // Check if player exists
      const existing = await prisma.player.findUnique({
        where: { telegramHandle: data.telegram },
      })

      const playerData: any = {
        ginzaUsername: data.ginza || null,
        playerType: data.type,
        isAgent: isAgent,
        isRunner: false,
        status: data.status,
        churnRisk: data.churnRisk,
        skillLevel: data.skillLevel,
        country: data.country || null,
        lastActiveAt: lastActiveAt,
        notes: data.notes || null,
      }

      // Calculate totalPlaytime - we'll need to store this differently since it's calculated
      // For now, we'll store it in a way that can be calculated from playtime entries

      if (existing) {
        // Update existing player
        if (!existing.playerID) {
          playerData.playerID = await getNextPlayerID()
        }
        await prisma.player.update({
          where: { id: existing.id },
          data: playerData,
        })
        updated++
        console.log(`✓ Updated: ${data.telegram}`)
      } else {
        // Create new player
        playerData.playerID = await getNextPlayerID()
        playerData.telegramHandle = data.telegram
        await prisma.player.create({
          data: playerData,
        })
        created++
        console.log(`✓ Created: ${data.telegram} (ID: ${playerData.playerID})`)
      }

      // If agent, create agent profile
      if (isAgent) {
        const player = existing || await prisma.player.findUnique({
          where: { telegramHandle: data.telegram },
        })
        
        if (player) {
          const existingAgent = await prisma.agent.findUnique({
            where: { playerId: player.id },
          })
          
          if (!existingAgent) {
            await prisma.agent.create({
              data: {
                name: data.telegram,
                telegramHandle: data.telegram,
                ginzaUsername: data.ginza || null,
                playerId: player.id,
                status: 'ACTIVE',
              },
            })
            console.log(`  → Created agent profile for ${data.telegram}`)
          }
        }
      }
    } catch (error: any) {
      console.error(`✗ Error processing ${data.telegram}:`, error.message)
      skipped++
    }
  }

  console.log(`\n✅ Done! Created: ${created}, Updated: ${updated}, Skipped: ${skipped}`)
}

main()
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
