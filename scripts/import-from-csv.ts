import { PrismaClient } from '@prisma/client'
import { parse } from 'date-fns'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

// Parse playtime string (e.g., "1h", "11h 30m", "17m") to minutes
function parsePlaytime(playtimeStr: string): number {
  if (!playtimeStr || playtimeStr === '-' || playtimeStr === '0m' || playtimeStr.trim() === '') return 0
  
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

// Simple CSV parser
function parseCSV(csvContent: string): Array<Record<string, string>> {
  const lines = csvContent.split('\n').filter(line => line.trim() !== '')
  if (lines.length === 0) return []
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  const rows: Array<Record<string, string>> = []
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''))
    const row: Record<string, string> = {}
    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })
    rows.push(row)
  }
  
  return rows
}

async function main() {
  console.log('Importing data from CSV...\n')

  // Path to CSV file - update this to point to your CSV file
  const csvPath = path.join(process.cwd(), 'scripts', 'import-data.csv')
  
  if (!fs.existsSync(csvPath)) {
    console.log(`⚠️  CSV file not found at: ${csvPath}`)
    console.log('\nPlease create a CSV file with the following columns:')
    console.log('Telegram, Ginza User, Type, Status, Churn Risk, Skill Level, Country, Last Active, Most Active, Total Playti, Runner, Agent, Notes')
    console.log('\nExample:')
    console.log('Arise,,PLAYER,ACTIVE,LOW,NIT,,,7pm-9pm,2h 30m,,,')
    console.log('Test,,AGENT,ACTIVE,LOW,AMATEUR,,,-,0m,,,')
    return
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  const rows = parseCSV(csvContent)

  if (rows.length === 0) {
    console.log('⚠️  No data rows found in CSV file')
    return
  }

  console.log(`Found ${rows.length} rows to import\n`)

  let created = 0
  let updated = 0
  let skipped = 0
  let errors: string[] = []

  for (const row of rows) {
    try {
      // Map CSV columns to our data structure
      const telegram = row['Telegram'] || row['telegram'] || ''
      const ginzaUser = row['Ginza User'] || row['Ginza User'] || row['ginzaUser'] || ''
      const type = (row['Type'] || row['type'] || 'PLAYER').toUpperCase() as 'PLAYER' | 'AGENT'
      const status = row['Status'] || row['status'] || 'ACTIVE'
      const churnRisk = row['Churn Risk'] || row['Churn Risk'] || row['churnRisk'] || 'LOW'
      const skillLevel = row['Skill Level'] || row['Skill Level'] || row['skillLevel'] || 'AMATEUR'
      const country = row['Country'] || row['country'] || ''
      const lastActive = row['Last Active'] || row['Last Active'] || row['lastActive'] || ''
      const totalPlayti = row['Total Playti'] || row['Total Playti'] || row['totalPlayti'] || row['Total Playtime'] || ''
      const notes = row['Notes'] || row['notes'] || ''

      if (!telegram || telegram.trim() === '') {
        console.log(`⚠️  Skipping row with empty telegram handle`)
        skipped++
        continue
      }

      const isAgent = type === 'AGENT'
      const lastActiveAt = lastActive ? parseDate(lastActive) : null
      
      // Check if player exists
      const existing = await prisma.player.findUnique({
        where: { telegramHandle: telegram.trim() },
      })

      const playerData: any = {
        ginzaUsername: (ginzaUser && ginzaUser.trim() !== '') ? ginzaUser.trim() : null,
        playerType: type,
        isAgent: isAgent,
        isRunner: false,
        status: status || 'ACTIVE',
        churnRisk: churnRisk || 'LOW',
        skillLevel: skillLevel || 'AMATEUR',
        country: (country && country.trim() !== '') ? country.trim() : null,
        lastActiveAt: lastActiveAt,
        notes: (notes && notes.trim() !== '') ? notes.trim() : null,
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
        console.log(`✓ Updated: ${telegram}`)
      } else {
        // Create new player
        playerData.playerID = await getNextPlayerID()
        playerData.telegramHandle = telegram.trim()
        await prisma.player.create({
          data: playerData,
        })
        created++
        console.log(`✓ Created: ${telegram} (ID: ${playerData.playerID})`)
      }

      // If agent, create/update agent profile
      if (isAgent) {
        const player = existing || await prisma.player.findUnique({
          where: { telegramHandle: telegram.trim() },
        })
        
        if (player) {
          const existingAgent = await prisma.agent.findUnique({
            where: { playerId: player.id },
          })
          
          if (!existingAgent) {
            await prisma.agent.create({
              data: {
                name: telegram.trim(),
                telegramHandle: telegram.trim(),
                ginzaUsername: (ginzaUser && ginzaUser.trim() !== '') ? ginzaUser.trim() : null,
                playerId: player.id,
                status: status || 'ACTIVE',
                notes: (notes && notes.trim() !== '') ? notes.trim() : null,
              },
            })
            console.log(`  → Created agent profile for ${telegram}`)
          } else {
            // Update existing agent profile
            await prisma.agent.update({
              where: { id: existingAgent.id },
              data: {
                name: telegram.trim(),
                ginzaUsername: (ginzaUser && ginzaUser.trim() !== '') ? ginzaUser.trim() : null,
                status: status || 'ACTIVE',
                notes: (notes && notes.trim() !== '') ? notes.trim() : null,
              },
            })
            console.log(`  → Updated agent profile for ${telegram}`)
          }
        }
      }
      
    } catch (error: any) {
      const errorMsg = `✗ Error processing row: ${error.message}`
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
