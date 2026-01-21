import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  startOfDay,
  format,
  startOfWeek,
  startOfMonth,
  startOfYear,
  endOfWeek,
  endOfMonth,
  endOfYear,
} from 'date-fns'

export const dynamic = 'force-dynamic'

// Usernames to exclude from top players chart
const EXCLUDED_USERNAMES = ['kendalls', 'meowster', 'miguel', 'kimchipapi', 'jquin22'].map(u => u.toLowerCase())

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'month' // day, week, month, year
    
    const now = new Date()
    let startDate: Date
    let endDate: Date

    // Calculate date range based on period, always using *recent* data
    switch (period) {
      case 'day': {
        startDate = startOfDay(now)
        endDate = startOfDay(now)
        break
      }
      case 'week': {
        startDate = startOfWeek(now, { weekStartsOn: 1 })
        endDate = endOfWeek(now, { weekStartsOn: 1 })
        break
      }
      case 'month': {
        startDate = startOfMonth(now)
        endDate = endOfMonth(now)
        break
      }
      case 'year': {
        startDate = startOfYear(now)
        endDate = endOfYear(now)
        break
      }
      default: {
        startDate = startOfMonth(now)
        endDate = endOfMonth(now)
      }
    }
    
    // Get all game-sourced playtime entries in the date range
    const entries = await prisma.gamePlayer.findMany({
      where: {
        playtimeMinutes: {
          gt: 0,
        },
        game: {
          playedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
      include: {
        player: {
          select: {
            id: true,
            telegramHandle: true,
            ginzaUsername: true,
          },
        },
        game: {
          select: {
            playedAt: true,
          },
        },
      },
      orderBy: {
        game: {
          playedAt: 'asc',
        },
      },
    })
    
    // Group by player and calculate total minutes per day
    const playerTotals = new Map<string, { playerId: string; label: string; totalMinutes: number; entries: Array<{ date: string; minutes: number }> }>()
    
    for (const gp of entries) {
      const playerId = gp.player.id
      const rawLabel = gp.player.ginzaUsername || gp.player.telegramHandle
      const normalizedLabel = rawLabel ? rawLabel.toLowerCase() : ''
      
      // Skip excluded usernames
      if (EXCLUDED_USERNAMES.includes(normalizedLabel)) {
        continue
      }
      
      const dateStr = format(startOfDay(gp.game.playedAt), 'yyyy-MM-dd')
      const label = rawLabel ? rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1).toLowerCase() : ''
      
      if (!playerTotals.has(playerId)) {
        playerTotals.set(playerId, {
          playerId,
          label,
          totalMinutes: 0,
          entries: [],
        })
      }
      
      const playerData = playerTotals.get(playerId)!
      playerData.totalMinutes += gp.playtimeMinutes || 0
      
      const existingEntry = playerData.entries.find(e => e.date === dateStr)
      if (existingEntry) {
        existingEntry.minutes += gp.playtimeMinutes || 0
      } else {
        playerData.entries.push({ date: dateStr, minutes: gp.playtimeMinutes || 0 })
      }
    }
    
    // Sort by total minutes and get top 10
    const topPlayers = Array.from(playerTotals.values())
      .sort((a, b) => b.totalMinutes - a.totalMinutes)
      .slice(0, 10)
    
    // Get all unique dates
    const allDates = new Set<string>()
    topPlayers.forEach(player => {
      player.entries.forEach(entry => allDates.add(entry.date))
    })
    const sortedDates = Array.from(allDates).sort()
    
    // Create series data with all dates for each player
    const series = topPlayers.map(player => {
      const data = sortedDates.map(date => {
        const entry = player.entries.find(e => e.date === date)
        return {
          date,
          minutes: entry ? entry.minutes : 0,
        }
      })
      
      return {
        playerId: player.playerId,
        label: player.label,
        totalMinutes: player.totalMinutes,
        data,
      }
    })
    
    return NextResponse.json(series)
  } catch (error) {
    console.error('Error fetching top players playtime:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}



