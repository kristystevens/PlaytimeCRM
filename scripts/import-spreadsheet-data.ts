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

// Parse date string - handles masked dates (########) by returning null
function parseDate(dateStr: string): Date | null {
  if (!dateStr || dateStr.trim() === '' || dateStr.includes('#')) return null
  
  try {
    // Try various date formats
    const formats = [
      'M/d/yyyy HH:mm',
      'M/d/yyyy',
      'yyyy-MM-dd HH:mm',
      'yyyy-MM-dd',
    ]
    
    for (const format of formats) {
      try {
        return parse(dateStr.trim(), format, new Date())
      } catch {
        continue
      }
    }
    
    return null
  } catch {
    return null
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

// Type definition for spreadsheet row
type SpreadsheetRow = {
  telegram: string
  ginzaUser?: string
  type: 'PLAYER' | 'AGENT'
  status: string
  churnRisk: string
  skillLevel: string
  country?: string
  lastActive?: string
  mostActive?: string
  totalPlayti?: string
  runner?: string
  agent?: string
  notes?: string
}

async function main() {
  console.log('Importing spreadsheet data...\n')

  // TODO: Replace this array with your actual spreadsheet data
  // You can copy-paste from your spreadsheet or convert CSV to this format
  const spreadsheetData: SpreadsheetRow[] = [
    // Example format - replace with your actual data:
    // { telegram: 'Arise', ginzaUser: '', type: 'PLAYER', status: 'ACTIVE', churnRisk: 'LOW', skillLevel: 'NIT', country: '', lastActive: '', mostActive: '7pm-9pm', totalPlayti: '2h 30m', runner: '', agent: '', notes: '' },
    // { telegram: 'Json', ginzaUser: '', type: 'PLAYER', status: 'ACTIVE', churnRisk: 'LOW', skillLevel: 'PUNTER', country: '', lastActive: '', mostActive: '5am-7am', totalPlayti: '11h 30m', runner: '', agent: '', notes: '' },
    // { telegram: 'Ginjongun', ginzaUser: '', type: 'PLAYER', status: 'ACTIVE', churnRisk: 'LOW', skillLevel: 'AMATEUR', country: '', lastActive: '', mostActive: '3am-8am', totalPlayti: '17h 4m', runner: '', agent: '', notes: '' },
    // { telegram: 'Test', ginzaUser: '', type: 'AGENT', status: 'ACTIVE', churnRisk: 'LOW', skillLevel: 'AMATEUR', country: '', lastActive: '', mostActive: '-', totalPlayti: '0m', runner: '', agent: '', notes: '' },
    // { telegram: 'Alexinthed Alexinthed', ginzaUser: 'Alexinthed Alexinthed', type: 'AGENT', status: 'ACTIVE', churnRisk: 'LOW', skillLevel: 'PRO', country: '', lastActive: '', mostActive: '', totalPlayti: '', runner: '', agent: '', notes: '' },
    
    // Add all your rows here...
  ]

  if (spreadsheetData.length === 0) {
    console.log('⚠️  No data to import. Please add your spreadsheet data to the spreadsheetData array in this script.')
    console.log('\nExpected format:')
    console.log('{')
    console.log('  telegram: "Username",')
    console.log('  ginzaUser: "GinzaUsername" or "",')
    console.log('  type: "PLAYER" or "AGENT",')
    console.log('  status: "ACTIVE",')
    console.log('  churnRisk: "LOW",')
    console.log('  skillLevel: "NIT" | "PUNTER" | "AMATEUR" | "PRO",')
    console.log('  country: "" or country name,')
    console.log('  lastActive: "" or date string (will be ignored if masked),')
    console.log('  mostActive: "7pm-9pm" or "-",')
    console.log('  totalPlayti: "2h 30m" or "0m",')
    console.log('  runner: "",')
    console.log('  agent: "",')
    console.log('  notes: "" or note text')
    console.log('}')
    return
  }

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
      const lastActiveAt = data.lastActive ? parseDate(data.lastActive) : null
      const totalPlaytime = data.totalPlayti ? parsePlaytime(data.totalPlayti) : 0
      
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
        lastActiveAt: lastActiveAt,
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

      // Note: We're not storing totalPlaytime directly as it's calculated from playtime entries
      // If you want to create playtime entries, you'd need to do that separately with dates
      
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
}

main()
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
