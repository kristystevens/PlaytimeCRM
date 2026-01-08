import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { messageTaskSchema } from '@/lib/validations'

export async function GET(request: NextRequest) {
  try {

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const playerId = searchParams.get('playerId')
    const agentId = searchParams.get('agentId')

    const where: any = {}
    if (status) where.status = status
    if (playerId) where.playerId = playerId
    if (agentId) where.agentId = agentId

    const tasks = await prisma.messageTask.findMany({
      where,
      orderBy: { dueAt: 'asc' },
      include: {
        player: {
          select: {
            id: true,
            telegramHandle: true,
            vipTier: true,
          },
        },
        agent: {
          select: {
            id: true,
            name: true,
            telegramHandle: true,
          },
        },
      },
    })

    return NextResponse.json(tasks)
  } catch (error) {
    console.error('Error fetching message tasks:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {

    const body = await request.json()
    const validated = messageTaskSchema.parse(body)

    const task = await prisma.messageTask.create({
      data: {
        playerId: validated.playerId,
        agentId: validated.agentId,
        runnerId: validated.runnerId,
        channel: validated.channel,
        template: validated.template,
        status: validated.status || 'TODO',
        dueAt: validated.dueAt ? new Date(validated.dueAt) : null,
        notes: validated.notes,
      },
    })

    return NextResponse.json(task, { status: 201 })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    console.error('Error creating message task:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

