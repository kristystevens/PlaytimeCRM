import { prisma } from './prisma'

/**
 * Gets the next available sequential playerID
 * This ensures all players have consecutive numeric IDs (1, 2, 3, ...)
 */
export async function getNextPlayerID(): Promise<string> {
  // Find the highest existing numeric playerID
  const players = await prisma.player.findMany({
    where: {
      playerID: { not: null },
    },
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

  // Return the next sequential ID
  return (maxID + 1).toString()
}
