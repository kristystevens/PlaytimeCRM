import { PrismaClient } from '@prisma/client'
import { parse, startOfDay } from 'date-fns'
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

// Parse time range (e.g., "7pm-9pm") to start and end times
function parseTimeRange(timeRangeStr: string): { startTime: string | null, endTime: string | null } {
  if (!timeRangeStr || timeRangeStr === '-' || timeRangeStr.trim() === '') {
    return { startTime: null, endTime: null }
  }

  // Handle multiple ranges separated by commas (e.g., "7pm-9pm, 5am-7am")
  // We'll use the first range
  const firstRange = timeRangeStr.split(',')[0].trim()
  
  // Match patterns like "7pm-9pm", "5am-7am", "12pm-1pm"
  const match = firstRange.match(/(\d{1,2})(am|pm)-(\d{1,2})(am|pm)/i)
  if (match) {
    let startHour = parseInt(match[1])
    const startPeriod = match[2].toLowerCase()
    let endHour = parseInt(match[3])
    const endPeriod = match[4].toLowerCase()
    
    // Convert to 24-hour format
    if (startPeriod === 'pm' && startHour !== 12) startHour += 12
    if (startPeriod === 'am' && startHour === 12) startHour = 0
    
    if (endPeriod === 'pm' && endHour !== 12) endHour += 12
    if (endPeriod === 'am' && endHour === 12) endHour = 0
    
    return {
      startTime: `${startHour.toString().padStart(2, '0')}:00`,
      endTime: `${endHour.toString().padStart(2, '0')}:00`,
    }
  }
  
  return { startTime: null, endTime: null }
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
  console.log('Importing playtime data from CSV...\n')

  // Path to CSV file - same as import-from-csv.ts
  const csvPath = path.join(process.cwd(), 'scripts', 'import-data.csv')
  
  if (!fs.existsSync(csvPath)) {
    console.log(`⚠️  CSV file not found at: ${csvPath}`)
    console.log('Please make sure the CSV file exists in the scripts folder.')
    return
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  const rows = parseCSV(csvContent)

  if (rows.length === 0) {
    console.log('⚠️  No data rows found in CSV file')
    return
  }

  console.log(`Found ${rows.length} rows to process\n`)

  // Use today's date for playtime entries (or you can modify this to use a specific date)
  const today = startOfDay(new Date())
  
  let created = 0
  let updated = 0
  let skipped = 0
  let errors: string[] = []

  for (const row of rows) {
    try {
      const telegram = row['Telegram'] || row['telegram'] || ''
      const totalPlayti = row['Total Playti'] || row['Total Playti'] || row['totalPlayti'] || row['Total Playtime'] || ''
      const mostActive = row['Most Active'] || row['Most Active'] || row['mostActive'] || ''
      
      if (!telegram || telegram.trim() === '') {
        skipped++
        continue
      }

      // Find the player
      const player = await prisma.player.findUnique({
        where: { telegramHandle: telegram.trim() },
      })

      if (!player) {
        console.log(`⚠️  Player not found: ${telegram}`)
        skipped++
        continue
      }

      // Parse playtime
      const totalMinutes = parsePlaytime(totalPlayti)
      
      if (totalMinutes === 0) {
        console.log(`⏭️  Skipping ${telegram} - no playtime data`)
        skipped++
        continue
      }

      // Parse time range if available
      const { startTime, endTime } = parseTimeRange(mostActive)

      // Check if entry already exists for today
      const existingEntry = await prisma.playtimeEntry.findUnique({
        where: {
          playerId_playedOn: {
            playerId: player.id,
            playedOn: today,
          },
        },
      })

      if (existingEntry) {
        // Update existing entry
        await prisma.playtimeEntry.update({
          where: { id: existingEntry.id },
          data: {
            minutes: totalMinutes,
            startTime: startTime || existingEntry.startTime,
            endTime: endTime || existingEntry.endTime,
          },
        })
        updated++
        console.log(`✓ Updated playtime for ${telegram}: ${totalMinutes} minutes`)
      } else {
        // Create new entry
        await prisma.playtimeEntry.create({
          data: {
            playerId: player.id,
            playedOn: today,
            startTime: startTime,
            endTime: endTime,
            minutes: totalMinutes,
          },
        })
        created++
        console.log(`✓ Created playtime for ${telegram}: ${totalMinutes} minutes (${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m)`)
      }
      
    } catch (error: any) {
      const errorMsg = `✗ Error processing ${row['Telegram'] || 'unknown'}: ${error.message}`
      console.error(errorMsg)
      errors.push(errorMsg)
      skipped++
    }
  }

  console.log(`\n✅ Playtime import complete!`)
  console.log(`   Created: ${created}`)
  console.log(`   Updated: ${updated}`)
  console.log(`   Skipped: ${skipped}`)
  console.log(`\n📅 All playtime entries assigned to: ${today.toISOString().split('T')[0]}`)
  
  if (errors.length > 0) {
    console.log(`\n⚠️  Errors encountered:`)
    errors.forEach(err => console.log(`   ${err}`))
  }
  
  console.log('\n💡 Note: If you want to assign playtime to different dates, modify the script to use specific dates from your CSV.')
}

main()
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
