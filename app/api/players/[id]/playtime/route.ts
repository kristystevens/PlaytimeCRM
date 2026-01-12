import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { playtimeEntrySchema } from '@/lib/validations'
import { startOfDay, parseISO, parse, differenceInMinutes, format } from 'date-fns'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const validated = playtimeEntrySchema.parse(body)

    // Normalize playedOn to start of day in UTC
    const playedOnDate = startOfDay(parseISO(validated.playedOn))

    // Parse start and end times if provided (can be ISO string or HH:mm format)
    let startTimeStr: string | null = null
    let endTimeStr: string | null = null
    let minutes = validated.minutes || 0

    if (validated.startTime && validated.endTime) {
      // If startTime/endTime are ISO strings, extract HH:mm or use them
      // If they're HH:mm format, combine with date to calculate minutes
      if (validated.startTime.includes('T') || validated.startTime.includes(' ')) {
        // ISO format - extract time portion for storage
        const startTime = parseISO(validated.startTime)
        const endTime = parseISO(validated.endTime)
        minutes = Math.max(0, differenceInMinutes(endTime, startTime))
        // Store as HH:mm format
        startTimeStr = format(startTime, 'HH:mm')
        endTimeStr = format(endTime, 'HH:mm')
      } else {
        // HH:mm format - combine with date to calculate minutes
        const startDateTime = parse(`${validated.playedOn} ${validated.startTime}`, 'yyyy-MM-dd HH:mm', new Date())
        let endDateTime = parse(`${validated.playedOn} ${validated.endTime}`, 'yyyy-MM-dd HH:mm', new Date())
        
        // Handle next day (e.g., 11:30pm to 12:30am)
        if (endDateTime < startDateTime) {
          endDateTime = new Date(endDateTime.getTime() + 24 * 60 * 60 * 1000)
        }
        
        minutes = Math.max(0, differenceInMinutes(endDateTime, startDateTime))
        startTimeStr = validated.startTime
        endTimeStr = validated.endTime
      }
    } else if (validated.minutes !== undefined) {
      minutes = validated.minutes
    }

    // Upsert: create or update if entry exists for this player and date
    const entry = await prisma.playtimeEntry.upsert({
      where: {
        playerId_playedOn: {
          playerId: params.id,
          playedOn: playedOnDate,
        },
      },
      update: {
        minutes,
        startTime: startTimeStr,
        endTime: endTimeStr,
        stakes: validated.stakes || null,
      },
      create: {
        playerId: params.id,
        playedOn: playedOnDate,
        startTime: startTimeStr,
        endTime: endTimeStr,
        minutes,
        stakes: validated.stakes || null,
      },
    })

    return NextResponse.json(entry)
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    console.error('Error creating/updating playtime entry:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
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

    return NextResponse.json(entries)
  } catch (error) {
    console.error('Error fetching playtime entries:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}



