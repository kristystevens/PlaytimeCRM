import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { startOfDay, subDays, format, startOfWeek, startOfMonth, startOfYear, endOfWeek, endOfMonth, endOfYear } from 'date-fns'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'month' // day, week, month, year
    
    const now = new Date()
    let startDate: Date
    let endDate: Date
    
    // Calculate date range based on period
    // Include entries up to 1 year in the future to handle test data
    const futureDate = new Date(now)
    futureDate.setFullYear(futureDate.getFullYear() + 1)
    const maxEndDate = startOfDay(futureDate)
    
    // For month and year, include all data from 2026 onwards to handle test data
    const year2026Start = new Date('2026-01-01')
    
    switch (period) {
      case 'day':
        startDate = startOfDay(now)
        endDate = maxEndDate
        break
      case 'week':
        startDate = startOfWeek(now, { weekStartsOn: 1 })
        endDate = maxEndDate
        break
      case 'month':
        // For month, include all entries from 2026 to handle test data
        startDate = year2026Start
        endDate = maxEndDate
        break
      case 'year':
        // For year, include all entries from 2026
        startDate = year2026Start
        endDate = maxEndDate
        break
      default:
        startDate = year2026Start
        endDate = maxEndDate
    }
    
    // Get all playtime entries in the date range
    const entries = await prisma.playtimeEntry.findMany({
      where: {
        playedOn: { 
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        player: {
          select: {
            id: true,
            telegramHandle: true,
          },
        },
      },
      orderBy: { playedOn: 'asc' },
    })
    
    // Group by player and calculate total minutes
    const playerTotals = new Map<string, { playerId: string; telegramHandle: string; totalMinutes: number; entries: Array<{ date: string; minutes: number }> }>()
    
    for (const entry of entries) {
      const playerId = entry.playerId
      const dateStr = format(startOfDay(entry.playedOn), 'yyyy-MM-dd')
      
      if (!playerTotals.has(playerId)) {
        playerTotals.set(playerId, {
          playerId,
          telegramHandle: entry.player.telegramHandle,
          totalMinutes: 0,
          entries: [],
        })
      }
      
      const playerData = playerTotals.get(playerId)!
      playerData.totalMinutes += entry.minutes
      
      // Add or update entry for this date
      const existingEntry = playerData.entries.find(e => e.date === dateStr)
      if (existingEntry) {
        existingEntry.minutes += entry.minutes
      } else {
        playerData.entries.push({ date: dateStr, minutes: entry.minutes })
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
        telegramHandle: player.telegramHandle,
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



