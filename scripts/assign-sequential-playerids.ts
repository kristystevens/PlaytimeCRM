import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Assigning sequential playerIDs to all players...\n')

  try {
    // Get all players, ordered by creation date
    const players = await prisma.player.findMany({
      orderBy: {
        createdAt: 'asc',
      },
    })

    console.log(`Found ${players.length} players\n`)

    // Find the highest existing playerID (if any are numeric)
    let maxID = 0
    for (const player of players) {
      if (player.playerID) {
        const numericID = parseInt(player.playerID)
        if (!isNaN(numericID) && numericID > maxID) {
          maxID = numericID
        }
      }
    }

    // Start from maxID + 1, or 1 if no numeric IDs exist
    let nextID = maxID + 1

    // Assign sequential IDs to all players
    // Strategy: Reassign all IDs sequentially starting from 1
    // This ensures all players have consecutive IDs
    
    let currentID = 1
    let updatedCount = 0

    for (const player of players) {
      const newID = currentID.toString()
      
      // Only update if the ID is different
      if (player.playerID !== newID) {
        await prisma.player.update({
          where: { id: player.id },
          data: { playerID: newID },
        })
        const action = player.playerID ? 'Replaced' : 'Assigned'
        console.log(`✓ ${action} ID ${newID} to ${player.telegramHandle}${player.playerID ? ` (was: ${player.playerID})` : ''}`)
        updatedCount++
      } else {
        console.log(`- ${player.telegramHandle} already has correct ID: ${newID}`)
      }
      currentID++
    }

    console.log(`\n✅ Updated ${updatedCount} players with sequential IDs!`)

    console.log(`\n✅ All players have been assigned sequential IDs!`)
    console.log(`Next available ID: ${nextID}`)
  } catch (error: any) {
    console.error('Error assigning playerIDs:', error.message)
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
