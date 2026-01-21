import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { startOfDay, addDays } from 'date-fns'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    if (!id) {
      return NextResponse.json({ error: 'Game ID is required' }, { status: 400 })
    }

    // First, fetch the game with all gamePlayers to reverse their effects
    const game = await prisma.game.findUnique({
      where: { id },
      include: {
        gamePlayers: true,
      },
    })

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    // Reverse the effects of this game on each player
    for (const gamePlayer of game.gamePlayers) {
      // Reverse financial updates (decrement what was incremented)
      await prisma.player.update({
        where: { id: gamePlayer.playerId },
        data: {
          totalDeposited: { decrement: gamePlayer.buyIn },
          totalWagered: { decrement: gamePlayer.buyIn },
          netPnL: { decrement: gamePlayer.pnl },
        },
      })

      // Recalculate playtime entries from remaining game data for that player/day
      const playedAt = game.playedAt
      const dayStart = startOfDay(playedAt)
      const dayEnd = addDays(dayStart, 1)

      const sameDayGamePlayers = await prisma.gamePlayer.findMany({
        where: {
          playerId: gamePlayer.playerId,
          game: {
            playedAt: {
              gte: dayStart,
              lt: dayEnd,
            },
            id: {
              not: game.id, // exclude the game we are deleting
            },
          },
        },
      })

      const totalMinutes = sameDayGamePlayers.reduce(
        (sum, gp) => sum + (gp.playtimeMinutes || 0),
        0,
      )

      const existingPlaytime = await prisma.playtimeEntry.findUnique({
        where: {
          playerId_playedOn: {
            playerId: gamePlayer.playerId,
            playedOn: dayStart,
          },
        },
      })

      if (totalMinutes <= 0) {
        if (existingPlaytime) {
          await prisma.playtimeEntry.delete({
            where: { id: existingPlaytime.id },
          })
        }
      } else {
        if (existingPlaytime) {
          await prisma.playtimeEntry.update({
            where: { id: existingPlaytime.id },
            data: {
              minutes: totalMinutes,
            },
          })
        } else {
          await prisma.playtimeEntry.create({
            data: {
              playerId: gamePlayer.playerId,
              playedOn: dayStart,
              minutes: totalMinutes,
            },
          })
        }
      }
    }

    // Now delete the game; related GamePlayer rows will cascade via Prisma schema
    await prisma.game.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting game:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

