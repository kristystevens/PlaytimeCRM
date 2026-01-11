import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { agentSchema } from '@/lib/validations'
import { logActivity } from '@/lib/activity-log'
import { calculateAgentPerformance } from '@/lib/metrics'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {

    const agent = await prisma.agent.findUnique({
      where: { id: params.id },
      include: {
        player: true,
        referredPlayers: {
          include: {
            assignedRunner: {
              select: {
                id: true,
                name: true,
                telegramHandle: true,
              },
            },
          },
        },
        payouts: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    const performance = calculateAgentPerformance(agent.referredPlayers)

    return NextResponse.json({
      ...agent,
      metrics: performance,
    })
  } catch (error) {
    console.error('Error fetching agent:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {

    const body = await request.json()
    const validated = agentSchema.partial().parse(body)

    const existing = await prisma.agent.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    const updateData: any = {}
    if (validated.name !== undefined) updateData.name = validated.name
    if (validated.telegramHandle !== undefined) updateData.telegramHandle = validated.telegramHandle
    if (validated.ginzaUsername !== undefined) updateData.ginzaUsername = validated.ginzaUsername
    if (validated.timezone !== undefined) updateData.timezone = validated.timezone
    if (validated.status !== undefined) updateData.status = validated.status
    if (validated.notes !== undefined) updateData.notes = validated.notes

    const agent = await prisma.agent.update({
      where: { id: params.id },
      data: updateData,
    })

    const systemUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
    if (systemUser) {
      await logActivity(systemUser.id, 'AGENT', agent.id, 'UPDATE', {
        changes: validated,
      })
    }

    return NextResponse.json(agent)
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    console.error('Error updating agent:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

