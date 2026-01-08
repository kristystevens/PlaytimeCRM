import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { playtimeUpdateSchema } from '@/lib/validations'
import { startOfDay, parseISO, parse, differenceInMinutes, format } from 'date-fns'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { entryId: string } }
) {
  try {
    const body = await request.json()
    const validated = playtimeUpdateSchema.parse(body)

    const updateData: any = {}
    if (validated.playedOn !== undefined) {
      updateData.playedOn = startOfDay(parseISO(validated.playedOn))
    }
    
    // Get existing entry to use its date if needed
    const existing = await prisma.playtimeEntry.findUnique({
      where: { id: params.entryId },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    // Parse start and end times if provided (can be ISO string or HH:mm format)
    if (validated.startTime !== undefined) {
      if (validated.startTime.includes('T') || validated.startTime.includes(' ')) {
        // ISO format - extract HH:mm
        const startTime = parseISO(validated.startTime)
        updateData.startTime = format(startTime, 'HH:mm')
      } else {
        // HH:mm format
        updateData.startTime = validated.startTime || null
      }
    }
    
    if (validated.endTime !== undefined) {
      if (validated.endTime.includes('T') || validated.endTime.includes(' ')) {
        // ISO format - extract HH:mm
        const endTime = parseISO(validated.endTime)
        updateData.endTime = format(endTime, 'HH:mm')
      } else {
        // HH:mm format
        updateData.endTime = validated.endTime || null
      }
    }
    
    // Calculate minutes from start/end time if provided
    if (validated.startTime && validated.endTime) {
      const playedOnDateStr = validated.playedOn || existing.playedOn.toISOString().split('T')[0]
      const startTimeStr = validated.startTime.includes('T') || validated.startTime.includes(' ')
        ? format(parseISO(validated.startTime), 'HH:mm')
        : validated.startTime
      const endTimeStr = validated.endTime.includes('T') || validated.endTime.includes(' ')
        ? format(parseISO(validated.endTime), 'HH:mm')
        : validated.endTime

      const startDateTime = parse(`${playedOnDateStr} ${startTimeStr}`, 'yyyy-MM-dd HH:mm', new Date())
      let endDateTime = parse(`${playedOnDateStr} ${endTimeStr}`, 'yyyy-MM-dd HH:mm', new Date())
      
      if (endDateTime < startDateTime) {
        endDateTime = new Date(endDateTime.getTime() + 24 * 60 * 60 * 1000)
      }
      
      updateData.minutes = Math.max(0, differenceInMinutes(endDateTime, startDateTime))
    } else if (validated.minutes !== undefined) {
      updateData.minutes = validated.minutes
    }

    // If date is being changed, check for conflicts
    if (validated.playedOn && validated.playedOn !== existing.playedOn.toISOString().split('T')[0]) {
      const newDate = startOfDay(parseISO(validated.playedOn))
      const conflict = await prisma.playtimeEntry.findUnique({
        where: {
          playerId_playedOn: {
            playerId: existing.playerId,
            playedOn: newDate,
          },
        },
      })

      if (conflict && conflict.id !== params.entryId) {
        return NextResponse.json(
          { error: 'An entry already exists for this player and date' },
          { status: 400 }
        )
      }
    }

    const updated = await prisma.playtimeEntry.update({
      where: { id: params.entryId },
      data: updateData,
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    console.error('Error updating playtime entry:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { entryId: string } }
) {
  try {
    await prisma.playtimeEntry.delete({
      where: { id: params.entryId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting playtime entry:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}






