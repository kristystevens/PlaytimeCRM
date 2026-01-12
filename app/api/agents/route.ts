import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { agentSchema } from '@/lib/validations'
import { logActivity } from '@/lib/activity-log'
import { calculateAgentPerformance } from '@/lib/metrics'
import { getNextPlayerID } from '@/lib/player-id-utils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Get all players where isAgent is true
    const agentPlayers = await prisma.player.findMany({
      where: {
        isAgent: true,
      },
      include: {
        agentProfile: {
          include: {
            referredPlayers: {
              select: {
                id: true,
                lastActiveAt: true,
                totalDeposited: true,
                totalWagered: true,
              },
            },
          },
        },
      },
    })

    // Ensure agentPlayers is an array
    if (!Array.isArray(agentPlayers)) {
      console.error('agentPlayers is not an array:', agentPlayers)
      return NextResponse.json([])
    }

    // Create agent profiles for players that have isAgent=true but no profile yet
    for (const player of agentPlayers) {
      const playerWithProfile = player as any
      if (!playerWithProfile.agentProfile) {
        await prisma.agent.create({
          data: {
            name: player.telegramHandle,
            telegramHandle: player.telegramHandle,
            ginzaUsername: player.ginzaUsername,
            playerId: player.id,
            status: 'ACTIVE',
          },
        })
      }
    }

    // Refetch to get all agents with profiles
    const allAgentPlayers = await prisma.player.findMany({
      where: {
        isAgent: true,
      },
      include: {
        agentProfile: {
          include: {
            referredPlayers: {
              select: {
                id: true,
                lastActiveAt: true,
                totalDeposited: true,
                totalWagered: true,
              },
            },
          },
        },
      },
    })

    // Convert to agent format for compatibility
    const agents = allAgentPlayers
      .map((p: any) => {
        if (!p || !p.agentProfile) return null
        const agent = p.agentProfile
        return {
          ...agent,
          player: p,
          referredPlayers: agent.referredPlayers || [],
        }
      })
      .filter((a: any) => a !== null)

    // Ensure agents is an array (should always be, but double-check)
    if (!Array.isArray(agents)) {
      console.error('Agents is not an array after map:', agents)
      return NextResponse.json([])
    }

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
    // Always return an array, even on error, to prevent .map() errors
    return NextResponse.json([])
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

    const playerData = {
      telegramHandle: validated.telegramHandle,
      ginzaUsername: validated.ginzaUsername,
      country: validated.country,
      isAgent: true,
      vipTier: validated.vipTier || 'MEDIUM',
      status: validated.status || 'ACTIVE',
      churnRisk: validated.churnRisk || 'LOW',
      skillLevel: validated.skillLevel || 'AMATEUR',
      notes: validated.notes,
    }

    if (!player) {
      // Always auto-assign sequential playerID for new hosts
      const playerID = await getNextPlayerID()
      player = await prisma.player.create({
        data: {
          ...playerData,
          playerType: 'AGENT',
          playerID: playerID,
        },
      })
    } else {
      // Update existing player to be an agent with all fields
      // If player doesn't have a playerID, assign one
      if (!player.playerID) {
        const playerID = await getNextPlayerID()
        playerData.playerID = playerID
      }
      player = await prisma.player.update({
        where: { id: player.id },
        data: playerData,
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
        status: validated.agentStatus || 'ACTIVE',
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

