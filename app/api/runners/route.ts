import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { runnerSchema } from '@/lib/validations'
import { logActivity } from '@/lib/activity-log'
import { calculateRunnerRetention } from '@/lib/metrics'

export async function GET(request: NextRequest) {
  try {

    const runners = await prisma.runner.findMany({
      include: {
        player: true,
        assignedPlayers: {
          select: {
            id: true,
            lastActiveAt: true,
            totalDeposited: true,
          },
        },
      },
    })

    // Calculate metrics for each runner
    const runnersWithMetrics = runners.map((runner) => {
      // Calculate last active - most recent lastActiveAt from assigned players or runner's own player profile
      const assignedPlayersLastActive = runner.assignedPlayers
        .map(p => p.lastActiveAt)
        .filter(Boolean)
        .map(d => new Date(d!))
      
      const runnerLastActive = runner.player?.lastActiveAt ? [new Date(runner.player.lastActiveAt)] : []
      
      const allLastActive = [...assignedPlayersLastActive, ...runnerLastActive]
      const lastActive = allLastActive.length > 0 
        ? new Date(Math.max(...allLastActive.map(d => d.getTime())))
        : null

      return {
        ...runner,
        metrics: {
          assignedPlayers: runner.assignedPlayers.length,
          lastActive,
        },
      }
    })

    return NextResponse.json(runnersWithMetrics)
  } catch (error) {
    console.error('Error fetching runners:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = runnerSchema.parse(body)

    // First, create or get the player
    let player = await prisma.player.findUnique({
      where: { telegramHandle: validated.telegramHandle },
    })

    if (!player) {
      player = await prisma.player.create({
        data: {
          telegramHandle: validated.telegramHandle,
          playerType: 'RUNNER',
          status: 'ACTIVE',
          vipTier: 'MEDIUM',
          churnRisk: 'LOW',
          skillLevel: 'AMATEUR',
        },
      })
    } else {
      // Update existing player to be a runner
      player = await prisma.player.update({
        where: { id: player.id },
        data: { playerType: 'RUNNER' },
      })
    }

    // Create the runner linked to the player
    const runner = await prisma.runner.create({
      data: {
        name: validated.name,
        telegramHandle: validated.telegramHandle,
        ginzaUsername: validated.ginzaUsername,
        playerId: player.id,
        timezone: validated.timezone,
        languages: JSON.stringify(validated.languages || []),
        status: validated.status || 'TRUSTED',
        bankrollAccess: validated.bankrollAccess || false,
        maxTableSize: validated.maxTableSize || 6,
        strikeCount: validated.strikeCount || 0,
        compType: validated.compType || 'PERCENT',
        compValue: validated.compValue || 0,
      },
      include: {
        player: true,
      },
    })

    const systemUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
    if (systemUser) {
      await logActivity(systemUser.id, 'RUNNER', runner.id, 'CREATE', {
        name: runner.name,
      })
    }

    return NextResponse.json(runner, { status: 201 })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    console.error('Error creating runner:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

