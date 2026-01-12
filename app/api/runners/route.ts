import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { runnerSchema } from '@/lib/validations'
import { logActivity } from '@/lib/activity-log'
import { calculateRunnerRetention } from '@/lib/metrics'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Get all players where isRunner is true
    const runnerPlayers = await prisma.player.findMany({
      where: {
        // @ts-expect-error - isRunner field exists in database but may not be in Prisma types yet
        isRunner: true,
      },
      include: {
        runnerProfile: {
          include: {
            assignedPlayers: {
              select: {
                id: true,
                lastActiveAt: true,
                totalDeposited: true,
              },
            },
          },
        },
      },
    })

    // Create runner profiles for players that have isRunner=true but no profile yet
    for (const player of runnerPlayers) {
      const playerWithProfile = player as any
      if (!playerWithProfile.runnerProfile) {
        await prisma.runner.create({
          data: {
            name: player.telegramHandle,
            telegramHandle: player.telegramHandle,
            ginzaUsername: player.ginzaUsername,
            playerId: player.id,
            status: 'TRUSTED',
          },
        })
      }
    }

    // Refetch to get all runners with profiles
    const allRunnerPlayers = await prisma.player.findMany({
      where: {
        // @ts-expect-error - isRunner field exists in database but may not be in Prisma types yet
        isRunner: true,
      },
      include: {
        runnerProfile: {
          include: {
            assignedPlayers: {
              select: {
                id: true,
                lastActiveAt: true,
                totalDeposited: true,
              },
            },
          },
        },
      },
    })

    // Convert to runner format for compatibility
    const runners = allRunnerPlayers
      .map((p: any) => {
        if (!p.runnerProfile) return null
        const runner = p.runnerProfile
        return {
          ...runner,
          player: p,
          assignedPlayers: runner.assignedPlayers || [],
        }
      })
      .filter((r: any) => r !== null)

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

    const playerData = {
      telegramHandle: validated.telegramHandle,
      ginzaUsername: validated.ginzaUsername,
      country: validated.country,
      isRunner: true,
      vipTier: validated.vipTier || 'MEDIUM',
      status: validated.status || 'ACTIVE',
      churnRisk: validated.churnRisk || 'LOW',
      skillLevel: validated.skillLevel || 'AMATEUR',
      notes: validated.notes,
    }

    if (!player) {
      player = await prisma.player.create({
        data: {
          ...playerData,
          playerType: 'RUNNER',
        },
      })
    } else {
      // Update existing player to be a runner with all fields
      player = await prisma.player.update({
        where: { id: player.id },
        data: playerData,
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
        languages: validated.languages || [],
        status: validated.runnerStatus || 'TRUSTED',
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

