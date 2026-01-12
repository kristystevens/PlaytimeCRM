import { PrismaClient } from '@prisma/client'
import { parseISO, format } from 'date-fns'

const prisma = new PrismaClient()

async function main() {
  console.log('Consolidating Ginjongun/Gingjongun players...\n')

  try {
    // Find both players
    const players = await prisma.player.findMany({
      where: {
        OR: [
          { telegramHandle: { contains: 'Ginjongun', mode: 'insensitive' } },
          { telegramHandle: { contains: 'Gingjongun', mode: 'insensitive' } },
          { ginzaUsername: { contains: 'Ginjongun', mode: 'insensitive' } },
          { ginzaUsername: { contains: 'Gingjongun', mode: 'insensitive' } },
        ],
      },
      include: {
        playtimeEntries: true,
      },
    })

    console.log(`Found ${players.length} players matching Ginjongun/Gingjongun:`)
    players.forEach((p) => {
      console.log(`  - ${p.telegramHandle} (${p.ginzaUsername || 'no ginza username'}) - ID: ${p.id}`)
      console.log(`    Playtime entries: ${p.playtimeEntries.length}`)
    })

    if (players.length < 2) {
      console.log('\n⚠️  Need at least 2 players to consolidate. Found:', players.length)
      return
    }

    // Use the first player as the one to keep (or the one with more data)
    const keepPlayer = players[0]
    const deletePlayer = players[1]

    console.log(`\n✓ Keeping player: ${keepPlayer.telegramHandle} (${keepPlayer.id})`)
    console.log(`✗ Deleting player: ${deletePlayer.telegramHandle} (${deletePlayer.id})`)

    // Move playtime entries from deletePlayer to keepPlayer
    for (const entry of deletePlayer.playtimeEntries) {
      // Check if keepPlayer already has an entry for this date
      const existingEntry = await prisma.playtimeEntry.findUnique({
        where: {
          playerId_playedOn: {
            playerId: keepPlayer.id,
            playedOn: entry.playedOn,
          },
        },
      })

      if (existingEntry) {
        // Merge: add minutes and update times
        const mergedMinutes = existingEntry.minutes + entry.minutes
        let mergedStartTime = existingEntry.startTime
        let mergedEndTime = existingEntry.endTime

        if (entry.startTime && (!mergedStartTime || entry.startTime < mergedStartTime)) {
          mergedStartTime = entry.startTime
        }
        if (entry.endTime && (!mergedEndTime || entry.endTime > mergedEndTime)) {
          mergedEndTime = entry.endTime
        }

        await prisma.playtimeEntry.update({
          where: { id: existingEntry.id },
          data: {
            minutes: mergedMinutes,
            startTime: mergedStartTime,
            endTime: mergedEndTime,
          },
        })
        console.log(`  ✓ Merged entry for ${format(entry.playedOn, 'yyyy-MM-dd')}: ${existingEntry.minutes} + ${entry.minutes} = ${mergedMinutes} minutes`)
      } else {
        // Move entry to keepPlayer
        await prisma.playtimeEntry.update({
          where: { id: entry.id },
          data: {
            playerId: keepPlayer.id,
          },
        })
        console.log(`  ✓ Moved entry for ${format(entry.playedOn, 'yyyy-MM-dd')} to keepPlayer`)
      }
    }

    // Update playtime entries to match the specified data
    // 01/06/2026: 3:30am-7:30am
    const date2026_01_06 = parseISO('2026-01-06T00:00:00.000Z')
    const entry2026_01_06 = await prisma.playtimeEntry.findUnique({
      where: {
        playerId_playedOn: {
          playerId: keepPlayer.id,
          playedOn: date2026_01_06,
        },
      },
    })

    if (entry2026_01_06) {
      // Calculate minutes: 3:30am to 7:30am = 4 hours = 240 minutes
      await prisma.playtimeEntry.update({
        where: { id: entry2026_01_06.id },
        data: {
          startTime: '03:30',
          endTime: '07:30',
          minutes: 240, // 4 hours
        },
      })
      console.log(`  ✓ Updated 01/06/2026 entry: 3:30am-7:30am (240 minutes)`)
    } else {
      // Create entry if it doesn't exist
      await prisma.playtimeEntry.create({
        data: {
          playerId: keepPlayer.id,
          playedOn: date2026_01_06,
          startTime: '03:30',
          endTime: '07:30',
          minutes: 240,
        },
      })
      console.log(`  ✓ Created 01/06/2026 entry: 3:30am-7:30am (240 minutes)`)
    }

    // 01/07/2026: 6am - 11:04am
    const date2026_01_07 = parseISO('2026-01-07T00:00:00.000Z')
    const entry2026_01_07 = await prisma.playtimeEntry.findUnique({
      where: {
        playerId_playedOn: {
          playerId: keepPlayer.id,
          playedOn: date2026_01_07,
        },
      },
    })

    if (entry2026_01_07) {
      // Calculate minutes: 6am to 11:04am = 5 hours 4 minutes = 304 minutes
      await prisma.playtimeEntry.update({
        where: { id: entry2026_01_07.id },
        data: {
          startTime: '06:00',
          endTime: '11:04',
          minutes: 304, // 5 hours 4 minutes
        },
      })
      console.log(`  ✓ Updated 01/07/2026 entry: 6am-11:04am (304 minutes)`)
    } else {
      // Create entry if it doesn't exist
      await prisma.playtimeEntry.create({
        data: {
          playerId: keepPlayer.id,
          playedOn: date2026_01_07,
          startTime: '06:00',
          endTime: '11:04',
          minutes: 304,
        },
      })
      console.log(`  ✓ Created 01/07/2026 entry: 6am-11:04am (304 minutes)`)
    }

    // Delete the duplicate player (this will cascade delete any remaining playtime entries)
    await prisma.player.delete({
      where: { id: deletePlayer.id },
    })
    console.log(`\n✓ Deleted duplicate player: ${deletePlayer.telegramHandle}`)

    // Update the kept player's telegram handle to be consistent (use "Ginjongun")
    await prisma.player.update({
      where: { id: keepPlayer.id },
      data: {
        telegramHandle: 'Ginjongun',
      },
    })
    console.log(`✓ Updated player handle to: Ginjongun`)

    console.log('\n✅ Consolidation complete!')
  } catch (error: any) {
    console.error('Error consolidating players:', error.message)
    throw error
  }
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
