import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { agentSchema } from '@/lib/validations'
import { logActivity } from '@/lib/activity-log'
import { calculateAgentPerformance } from '@/lib/metrics'

export async function GET(request: NextRequest) {
  try {

    const agents = await prisma.agent.findMany({
      include: {
        player: true,
        referredPlayers: {
          select: {
            id: true,
            lastActiveAt: true,
            totalDeposited: true,
            totalWagered: true,
          },
        },
      },
    })

    // Calculate metrics for each agent
    const agentsWithMetrics = agents.map((agent) => {
      // Find the most recent lastActiveAt from referred players or agent's own player profile
      const referredPlayerLastActive = agent.referredPlayers
        .map(p => p.lastActiveAt)
        .filter((date): date is Date => date !== null)
        .sort((a, b) => b.getTime() - a.getTime())[0] || null
      
      const agentLastActive = agent.player?.lastActiveAt || null
      
      // Use the most recent of agent's own activity or their referred players' activity
      const lastActive = agentLastActive && referredPlayerLastActive
        ? agentLastActive > referredPlayerLastActive ? agentLastActive : referredPlayerLastActive
        : agentLastActive || referredPlayerLastActive

      return {
        ...agent,
        metrics: {
          totalPlayers: agent.referredPlayers.length,
          lastActive,
        },
      }
    })

    return NextResponse.json(agentsWithMetrics)
  } catch (error) {
    console.error('Error fetching agents:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = agentSchema.parse(body)

    // First, create or get the player
    let player = await prisma.player.findUnique({
      where: { telegramHandle: validated.telegramHandle },
    })

    if (!player) {
      player = await prisma.player.create({
        data: {
          telegramHandle: validated.telegramHandle,
          playerType: 'AGENT',
          status: 'ACTIVE',
          vipTier: 'MEDIUM',
          churnRisk: 'LOW',
          skillLevel: 'AMATEUR',
        },
      })
    } else {
      // Update existing player to be an agent
      player = await prisma.player.update({
        where: { id: player.id },
        data: { playerType: 'AGENT' },
      })
    }

    // Create the agent linked to the player
    const agent = await prisma.agent.create({
      data: {
        name: validated.name,
        telegramHandle: validated.telegramHandle,
        ginzaUsername: validated.ginzaUsername,
        timezone: validated.timezone,
        playerId: player.id,
        status: validated.status || 'ACTIVE',
        notes: validated.notes,
      },
      include: {
        player: true,
      },
    })

    const systemUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
    if (systemUser) {
      await logActivity(systemUser.id, 'AGENT', agent.id, 'CREATE', {
        name: agent.name,
      })
    }

    return NextResponse.json(agent, { status: 201 })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    console.error('Error creating agent:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

