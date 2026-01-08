import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { subDays, startOfMonth, startOfDay } from 'date-fns'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const now = new Date()
    const sevenDaysAgo = startOfDay(subDays(now, 7))
    const thirtyDaysAgo = startOfDay(subDays(now, 30))
    const thisMonthStart = startOfMonth(now)

    const [last7Days, last30Days, thisMonth, lifetime] = await Promise.all([
      prisma.playtimeEntry.aggregate({
        where: {
          playerId: params.id,
          playedOn: { gte: sevenDaysAgo },
        },
        _sum: { minutes: true },
      }),
      prisma.playtimeEntry.aggregate({
        where: {
          playerId: params.id,
          playedOn: { gte: thirtyDaysAgo },
        },
        _sum: { minutes: true },
      }),
      prisma.playtimeEntry.aggregate({
        where: {
          playerId: params.id,
          playedOn: { gte: thisMonthStart },
        },
        _sum: { minutes: true },
      }),
      prisma.playtimeEntry.aggregate({
        where: {
          playerId: params.id,
        },
        _sum: { minutes: true },
      }),
    ])

    return NextResponse.json({
      last7DaysMinutes: last7Days._sum.minutes || 0,
      last30DaysMinutes: last30Days._sum.minutes || 0,
      thisMonthMinutes: thisMonth._sum.minutes || 0,
      lifetimeMinutes: lifetime._sum.minutes || 0,
    })
  } catch (error) {
    console.error('Error fetching playtime summary:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}



