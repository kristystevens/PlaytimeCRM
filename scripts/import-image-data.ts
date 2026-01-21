import { PrismaClient } from '@prisma/client'
import { parse } from 'date-fns'

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
  console.log('Importing data from spreadsheet image...\n')

  // Data extracted from the spreadsheet image
  // Note: Last Active dates are masked (########) so we'll skip them
  const spreadsheetData = [
    { telegram: 'Arise', ginzaUser: '', type: 'PLAYER', status: 'ACTIVE', churnRisk: 'LOW', skillLevel: 'NIT', country: '', mostActive: '7pm-9pm', totalPlayti: '2h 30m', notes: '' },
    { telegram: 'Json', ginzaUser: '', type: 'PLAYER', status: 'ACTIVE', churnRisk: 'LOW', skillLevel: 'PUNTER', country: '', mostActive: '5am-7am', totalPlayti: '11h 30m', notes: '' },
    { telegram: 'Ginjongun', ginzaUser: '', type: 'PLAYER', status: 'ACTIVE', churnRisk: 'LOW', skillLevel: 'AMATEUR', country: '', mostActive: '3am-8am', totalPlayti: '17h 4m', notes: '' },
    { telegram: 'Test', ginzaUser: '', type: 'AGENT', status: 'ACTIVE', churnRisk: 'LOW', skillLevel: 'AMATEUR', country: '', mostActive: '-', totalPlayti: '0m', notes: '' },
    { telegram: 'Alexinthed Alexinthed', ginzaUser: 'Alexinthed Alexinthed', type: 'AGENT', status: 'ACTIVE', churnRisk: 'LOW', skillLevel: 'PRO', country: '', mostActive: '', totalPlayti: '', notes: '' },
    // Add more rows as needed from your spreadsheet
    // The image shows 28 rows total, but I can only see a few clearly
  ]

  let created = 0
  let updated = 0
  let skipped = 0
  let errors: string[] = []

  for (const data of spreadsheetData) {
    try {
      if (!data.telegram || data.telegram.trim() === '') {
        console.log(`⚠️  Skipping row with empty telegram handle`)
        skipped++
        continue
      }

      const isAgent = data.type === 'AGENT'
      
      // Check if player exists
      const existing = await prisma.player.findUnique({
        where: { telegramHandle: data.telegram.trim() },
      })

      const playerData: any = {
        ginzaUsername: (data.ginzaUser && data.ginzaUser.trim() !== '') ? data.ginzaUser.trim() : null,
        playerType: data.type,
        isAgent: isAgent,
        isRunner: false,
        status: data.status || 'ACTIVE',
        churnRisk: data.churnRisk || 'LOW',
        skillLevel: data.skillLevel || 'AMATEUR',
        country: (data.country && data.country.trim() !== '') ? data.country.trim() : null,
        lastActiveAt: null, // Dates are masked in the image
        notes: (data.notes && data.notes.trim() !== '') ? data.notes.trim() : null,
      }

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
        playerData.telegramHandle = data.telegram.trim()
        await prisma.player.create({
          data: playerData,
        })
        created++
        console.log(`✓ Created: ${data.telegram} (ID: ${playerData.playerID})`)
      }

      // If agent, create/update agent profile
      if (isAgent) {
        const player = existing || await prisma.player.findUnique({
          where: { telegramHandle: data.telegram.trim() },
        })
        
        if (player) {
          const existingAgent = await prisma.agent.findUnique({
            where: { playerId: player.id },
          })
          
          if (!existingAgent) {
            await prisma.agent.create({
              data: {
                name: data.telegram.trim(),
                telegramHandle: data.telegram.trim(),
                ginzaUsername: (data.ginzaUser && data.ginzaUser.trim() !== '') ? data.ginzaUser.trim() : null,
                playerId: player.id,
                status: data.status || 'ACTIVE',
                notes: (data.notes && data.notes.trim() !== '') ? data.notes.trim() : null,
              },
            })
            console.log(`  → Created agent profile for ${data.telegram}`)
          } else {
            // Update existing agent profile
            await prisma.agent.update({
              where: { id: existingAgent.id },
              data: {
                name: data.telegram.trim(),
                ginzaUsername: (data.ginzaUser && data.ginzaUser.trim() !== '') ? data.ginzaUser.trim() : null,
                status: data.status || 'ACTIVE',
                notes: (data.notes && data.notes.trim() !== '') ? data.notes.trim() : null,
              },
            })
            console.log(`  → Updated agent profile for ${data.telegram}`)
          }
        }
      }
      
    } catch (error: any) {
      const errorMsg = `✗ Error processing ${data.telegram}: ${error.message}`
      console.error(errorMsg)
      errors.push(errorMsg)
      skipped++
    }
  }

  console.log(`\n✅ Import complete!`)
  console.log(`   Created: ${created}`)
  console.log(`   Updated: ${updated}`)
  console.log(`   Skipped: ${skipped}`)
  
  if (errors.length > 0) {
    console.log(`\n⚠️  Errors encountered:`)
    errors.forEach(err => console.log(`   ${err}`))
  }
  
  console.log('\n💡 Note: To import all 28 rows from your spreadsheet, please:')
  console.log('   1. Export your spreadsheet as CSV')
  console.log('   2. Use the import-from-csv.ts script, or')
  console.log('   3. Add all rows to the spreadsheetData array in this file')
}

main()
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
