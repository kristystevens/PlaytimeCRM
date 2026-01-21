import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { startOfDay, addDays } from 'date-fns'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const newMinutes = Number(body.playtimeMinutes)

    if (!id) {
      return NextResponse.json({ error: 'GamePlayer ID is required' }, { status: 400 })
    }

    if (!Number.isFinite(newMinutes) || newMinutes < 0) {
      return NextResponse.json({ error: 'playtimeMinutes must be a non-negative number' }, { status: 400 })
    }

    // Fetch the game player with game info for date and playerId
    const gamePlayer = await prisma.gamePlayer.findUnique({
      where: { id },
      include: {
        game: true,
      },
    })

    if (!gamePlayer || !gamePlayer.game) {
      return NextResponse.json({ error: 'Game player not found' }, { status: 404 })
    }

    // Update the game player's playtimeMinutes
    await prisma.gamePlayer.update({
      where: { id },
      data: {
        playtimeMinutes: newMinutes,
      },
    })

    // Recalculate total minutes for this player on the date of the game
    const playedAt = gamePlayer.game.playedAt
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
        },
      },
      include: {
        game: true,
      },
    })

    const totalMinutes = sameDayGamePlayers.reduce(
      (sum, gp) => sum + (gp.playtimeMinutes || 0),
      0,
    )

    // Sync the aggregated playtime entry for this player and date
    const existingPlaytime = await prisma.playtimeEntry.findUnique({
      where: {
        playerId_playedOn: {
          playerId: gamePlayer.playerId,
          playedOn: dayStart,
        },
      },
    })

    if (totalMinutes <= 0) {
      // If no minutes remain for this day, delete the entry if it exists
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

    return NextResponse.json({ success: true, playtimeMinutes: newMinutes })
  } catch (error: any) {
    console.error('Error updating game player playtime:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 },
    )
  }
}

