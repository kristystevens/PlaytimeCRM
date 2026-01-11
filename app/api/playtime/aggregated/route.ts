import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { startOfDay, subDays, format, startOfWeek, startOfMonth, startOfYear } from 'date-fns'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'day' // day, week, month, year
    const days = parseInt(searchParams.get('days') || '30', 10)
    
    const now = new Date()
    const startDate = startOfDay(subDays(now, days))
    
    // Get all playtime entries in the date range
    const entries = await prisma.playtimeEntry.findMany({
      where: {
        playedOn: { gte: startDate },
      },
      orderBy: { playedOn: 'asc' },
    })
    
    // Aggregate by period
    const aggregated = new Map<string, number>()
    
    for (const entry of entries) {
      let key: string
      
      switch (period) {
        case 'day':
          key = format(startOfDay(entry.playedOn), 'yyyy-MM-dd')
          break
        case 'week':
          key = format(startOfWeek(entry.playedOn, { weekStartsOn: 1 }), 'yyyy-MM-dd')
          break
        case 'month':
          key = format(startOfMonth(entry.playedOn), 'yyyy-MM')
          break
        case 'year':
          key = format(startOfYear(entry.playedOn), 'yyyy')
          break
        default:
          key = format(startOfDay(entry.playedOn), 'yyyy-MM-dd')
      }
      
      const current = aggregated.get(key) || 0
      aggregated.set(key, current + entry.minutes)
    }
    
    // Convert to array and sort
    const data = Array.from(aggregated.entries())
      .map(([date, minutes]) => ({ date, minutes }))
      .sort((a, b) => a.date.localeCompare(b.date))
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching aggregated playtime:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

