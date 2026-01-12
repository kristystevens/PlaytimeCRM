import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { runnerSchema } from '@/lib/validations'
import { logActivity } from '@/lib/activity-log'
import { calculateRunnerRetention } from '@/lib/metrics'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {

    const runner = await prisma.runner.findUnique({
      where: { id: params.id },
      include: {
        assignedPlayers: {
          include: {
            referredByAgent: {
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

    if (!runner) {
      return NextResponse.json({ error: 'Runner not found' }, { status: 404 })
    }

    const retention = calculateRunnerRetention(runner.assignedPlayers)

    return NextResponse.json({
      ...runner,
      metrics: {
        assignedPlayers: runner.assignedPlayers.length,
        active7d: retention.active7d,
        active30d: retention.active30d,
        retention7d: retention.retention7d,
        retention30d: retention.retention30d,
      },
    })
  } catch (error) {
    console.error('Error fetching runner:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const validated = runnerSchema.partial().parse(body)

    const existing = await prisma.runner.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Runner not found' }, { status: 404 })
    }

    const updateData: any = {}
    if (validated.name !== undefined) updateData.name = validated.name
    if (validated.telegramHandle !== undefined) updateData.telegramHandle = validated.telegramHandle
    if (validated.timezone !== undefined) updateData.timezone = validated.timezone
    if (validated.languages !== undefined) updateData.languages = validated.languages
    if (validated.status !== undefined) updateData.status = validated.status
    if (validated.notes !== undefined) updateData.notes = validated.notes

    const runner = await prisma.runner.update({
      where: { id: params.id },
      data: updateData,
    })

    const systemUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
    if (systemUser) {
      await logActivity(systemUser.id, 'RUNNER', runner.id, 'UPDATE', {
        changes: validated,
      })
    }

    return NextResponse.json(runner)
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    console.error('Error updating runner:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

