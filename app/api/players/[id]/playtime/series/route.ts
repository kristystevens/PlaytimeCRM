import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { startOfDay, startOfWeek, startOfMonth, parseISO, format } from 'date-fns'

type Granularity = 'daily' | 'weekly' | 'monthly'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const granularity = (searchParams.get('granularity') || 'daily') as Granularity
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const where: any = { playerId: params.id }

    if (from) {
      where.playedOn = { ...where.playedOn, gte: startOfDay(parseISO(from)) }
    }
    if (to) {
      where.playedOn = { ...where.playedOn, lte: startOfDay(parseISO(to)) }
    }

    const entries = await prisma.playtimeEntry.findMany({
      where,
      orderBy: { playedOn: 'asc' },
    })

    // Group entries by period based on granularity
    const grouped = new Map<string, number>()

    for (const entry of entries) {
      let period: string
      const date = new Date(entry.playedOn)

      switch (granularity) {
        case 'daily':
          period = format(startOfDay(date), 'yyyy-MM-dd')
          break
        case 'weekly':
          period = format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd')
          break
        case 'monthly':
          period = format(startOfMonth(date), 'yyyy-MM-dd')
          break
        default:
          period = format(startOfDay(date), 'yyyy-MM-dd')
      }

      grouped.set(period, (grouped.get(period) || 0) + entry.minutes)
    }

    // Convert to array and sort
    const series = Array.from(grouped.entries())
      .map(([period, minutes]) => ({ period, minutes }))
      .sort((a, b) => a.period.localeCompare(b.period))

    return NextResponse.json(series)
  } catch (error) {
    console.error('Error fetching playtime series:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}



