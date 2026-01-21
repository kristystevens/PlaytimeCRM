import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getNextPlayerID } from '@/lib/player-id-utils'
import { startOfDay } from 'date-fns'

export const dynamic = 'force-dynamic'

// Parse currency string to number (handles commas, dollar signs, and +/- signs)
function parseCurrency(value: string): number {
  if (!value || value.trim() === '') return 0
  // Remove commas, dollar signs, and spaces, but keep +/- signs
  const cleaned = value.replace(/[,$\s]/g, '')
  return parseFloat(cleaned) || 0
}

// Parse a time string like "2pm", "2:30 pm", "14:00" into a Date on the given base date (assumed EST)
function parseTimeStringToDate(timeStr: string, baseDate: Date): Date | null {
  if (!timeStr) return null
  const trimmed = timeStr.trim().toLowerCase()
  const match = trimmed.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/)
  if (!match) return null

  let hour = parseInt(match[1], 10)
  const minute = match[2] ? parseInt(match[2], 10) : 0
  const ampm = match[3]

  if (ampm) {
    if (ampm === 'pm' && hour < 12) hour += 12
    if (ampm === 'am' && hour === 12) hour = 0
  }

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null

  const d = new Date(baseDate)
  d.setHours(hour, minute, 0, 0)
  return d
}

// Convert an array of time range strings (e.g., ["2pm-5pm", "6pm-7pm"]) to total minutes
function parseTimeRangesToMinutes(ranges: unknown, baseDate: Date): number {
  if (!Array.isArray(ranges)) return 0

  let totalMinutes = 0

  for (const raw of ranges) {
    if (typeof raw !== 'string') continue
    const rangeStr = raw.trim()
    if (!rangeStr) continue

    const parts = rangeStr.split('-')
    if (parts.length < 2) continue

    const start = parseTimeStringToDate(parts[0], baseDate)
    const end = parseTimeStringToDate(parts[1], baseDate)
    if (!start || !end) continue

    let endTime = end
    if (endTime.getTime() <= start.getTime()) {
      // Handle ranges that cross midnight
      endTime = new Date(endTime.getTime() + 24 * 60 * 60 * 1000)
    }

    const diffMs = endTime.getTime() - start.getTime()
    const diffMinutes = Math.max(0, Math.round(diffMs / 60000))
    totalMinutes += diffMinutes
  }

  return totalMinutes
}

// Find or create player by username (ledger username goes into ginzaUsername field)
async function findOrCreatePlayer(username: string): Promise<string | null> {
  const normalizedUsername = username.trim().toLowerCase()
  const trimmedUsername = username.trim()

  // Try to find existing player by ginzaUsername first (case-insensitive for SQLite)
  let existing = await prisma.player.findFirst({
    where: {
      ginzaUsername: {
        equals: trimmedUsername,
      },
    },
  })
  
  // If not found, try case-insensitive search manually (SQLite limitation)
  if (!existing) {
    const allPlayers = await prisma.player.findMany({
      select: { id: true, ginzaUsername: true, telegramHandle: true },
    })
    const found = allPlayers.find(
      p => p.ginzaUsername && p.ginzaUsername.toLowerCase() === normalizedUsername
    )
    if (found) {
      existing = found as any
    }
  }

  // If still not found, try searching by telegramHandle as fallback
  if (!existing) {
    existing = await prisma.player.findFirst({
      where: {
        telegramHandle: {
          equals: trimmedUsername,
        },
      },
    })
  }

  // If not found, try case-insensitive search by telegramHandle manually
  if (!existing) {
    const allPlayers = await prisma.player.findMany({
      select: { id: true, ginzaUsername: true, telegramHandle: true },
    })
    const found = allPlayers.find(
      p => p.telegramHandle && p.telegramHandle.toLowerCase() === normalizedUsername
    )
    if (found) {
      existing = found as any
    }
  }

  if (existing) {
    // Update ginzaUsername if it's different or empty
    if (!existing.ginzaUsername || existing.ginzaUsername.toLowerCase() !== normalizedUsername) {
      await prisma.player.update({
        where: { id: existing.id },
        data: {
          ginzaUsername: trimmedUsername,
        },
      })
    }
    return existing.id
  }

  // Create new player with ledger username as ginzaUsername
  const playerID = await getNextPlayerID()
  const newPlayer = await prisma.player.create({
    data: {
      telegramHandle: trimmedUsername, // Required field - must be unique
      ginzaUsername: trimmedUsername,
      playerID: playerID,
      status: 'ACTIVE',
      playerType: 'PLAYER',
      vipTier: 'MEDIUM',
      churnRisk: 'LOW',
      skillLevel: 'AMATEUR',
    },
  })

  return newPlayer.id
}

export async function GET(request: NextRequest) {
  try {
    const games = await prisma.game.findMany({
      include: {
        host: true,
        gamePlayers: {
          include: {
            player: true,
          },
        },
      },
      orderBy: {
        playedAt: 'desc',
      },
    })

    return NextResponse.json(games)
  } catch (error) {
    console.error('Error fetching games:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { ledgerData, hostId, playedAt } = body

    if (!ledgerData || !Array.isArray(ledgerData)) {
      return NextResponse.json({ error: 'Invalid ledger data' }, { status: 400 })
    }

    if (!playedAt) {
      return NextResponse.json({ error: 'Played date/time is required' }, { status: 400 })
    }

    // Parse date and time
    const playedAtDate = new Date(playedAt)
    if (isNaN(playedAtDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date/time format' }, { status: 400 })
    }

    // Create the game
    const game = await prisma.game.create({
      data: {
        hostId: hostId || null,
        playedAt: playedAtDate,
      },
    })

    const gamePlayers = []
    const playtimeUpdates = []

    // Calculate cutoff for "recent" activity (last 14 days)
    const now = new Date()
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

    // Process each player in the ledger
    for (const entry of ledgerData) {
      const username = entry.player || entry.Player || ''
      if (!username || username.trim() === '') continue

      const buyIn = parseCurrency(entry.buyIn || entry['Buy-In'] || '0')
      const cashout = parseCurrency(entry.cashout || entry.Cashout || '0')
      const pnl = parseCurrency(entry.pnl || entry.PnL || '0')

      // Derive playtime minutes from time ranges (e.g., ["2pm-5pm", "6pm-7pm"]) in EST
      const playtimeMinutesFromRanges = parseTimeRangesToMinutes(entry.timeRanges, playedAtDate)
      const playtimeMinutes =
        playtimeMinutesFromRanges > 0
          ? playtimeMinutesFromRanges
          : parseInt(entry.playtimeMinutes || entry.playtime || '0') || 0

      // Find or create player
      const playerId = await findOrCreatePlayer(username)
      if (!playerId) continue // Skip if player creation failed

      // Create game player entry
      const gamePlayer = await prisma.gamePlayer.create({
        data: {
          gameId: game.id,
          playerId: playerId,
          buyIn: buyIn,
          cashout: cashout,
          pnl: pnl,
          playtimeMinutes: playtimeMinutes,
        },
      })
      gamePlayers.push(gamePlayer)

      // Update player financials and status/lastActiveAt
      const playerUpdateData: any = {
        totalDeposited: { increment: buyIn },
        totalWagered: { increment: buyIn },
        netPnL: { increment: pnl },
      }

      // If this game is recent (within last 2 weeks), mark player as ACTIVE and update lastActiveAt
      if (playedAtDate >= twoWeeksAgo) {
        playerUpdateData.status = 'ACTIVE'
        playerUpdateData.lastActiveAt = playedAtDate
      } else {
        // For older backfilled games, don't change status, but still update lastActiveAt if it's null
        playerUpdateData.lastActiveAt = playedAtDate
      }

      await prisma.player.update({
        where: { id: playerId },
        data: playerUpdateData,
      })

      // Update or create playtime entry (minutes only; time-of-day ranges are entered in EST)
      if (playtimeMinutes > 0) {
        const playedOnDate = startOfDay(playedAtDate)

        const existingPlaytime = await prisma.playtimeEntry.findUnique({
          where: {
            playerId_playedOn: {
              playerId: playerId,
              playedOn: playedOnDate,
            },
          },
        })

        if (existingPlaytime) {
          // Update existing entry - add minutes
          await prisma.playtimeEntry.update({
            where: { id: existingPlaytime.id },
            data: {
              minutes: existingPlaytime.minutes + playtimeMinutes,
            },
          })
        } else {
          // Create new playtime entry
          await prisma.playtimeEntry.create({
            data: {
              playerId: playerId,
              playedOn: playedOnDate,
              minutes: playtimeMinutes,
            },
          })
        }
      }
    }

    // Fetch the complete game with relations
    const completeGame = await prisma.game.findUnique({
      where: { id: game.id },
      include: {
        host: true,
        gamePlayers: {
          include: {
            player: true,
          },
        },
      },
    })

    return NextResponse.json(completeGame, { status: 201 })
  } catch (error: any) {
    console.error('Error creating game:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
