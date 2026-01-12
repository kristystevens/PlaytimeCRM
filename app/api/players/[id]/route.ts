import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { playerSchema } from '@/lib/validations'
import { logActivity } from '@/lib/activity-log'
import { getNextPlayerID } from '@/lib/player-id-utils'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const player = await prisma.player.findUnique({
      where: { id: params.id },
      include: {
        assignedRunner: true,
        referredByAgent: true,
        messageTasks: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    })

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }

    return NextResponse.json(player)
  } catch (error) {
    console.error('Error fetching player:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {

    const body = await request.json()
    const validated = playerSchema.partial().parse(body)

    const existing = await prisma.player.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }

    const updateData: any = {}
    if (validated.telegramHandle !== undefined) updateData.telegramHandle = validated.telegramHandle
    if (validated.ginzaUsername !== undefined) updateData.ginzaUsername = validated.ginzaUsername
    if (validated.country !== undefined) updateData.country = validated.country
    if (validated.playerType !== undefined) updateData.playerType = validated.playerType
    // playerID is auto-assigned and cannot be updated
    if (validated.vipTier !== undefined) updateData.vipTier = validated.vipTier
    if (validated.status !== undefined) updateData.status = validated.status
    if (validated.churnRisk !== undefined) updateData.churnRisk = validated.churnRisk
    if (validated.skillLevel !== undefined) updateData.skillLevel = validated.skillLevel
    if (validated.preferredGames !== undefined) updateData.preferredGames = validated.preferredGames
    if (validated.notes !== undefined) updateData.notes = validated.notes
    if (validated.assignedRunnerId !== undefined) updateData.assignedRunnerId = validated.assignedRunnerId
    if (validated.referredByAgentId !== undefined) updateData.referredByAgentId = validated.referredByAgentId
    if (validated.lastActiveAt !== undefined) {
      updateData.lastActiveAt = validated.lastActiveAt ? new Date(validated.lastActiveAt) : null
    }
    if (validated.totalDeposited !== undefined) updateData.totalDeposited = validated.totalDeposited
    if (validated.totalWagered !== undefined) updateData.totalWagered = validated.totalWagered
    if (validated.netPnL !== undefined) updateData.netPnL = validated.netPnL
    if (validated.avgBuyIn !== undefined) updateData.avgBuyIn = validated.avgBuyIn
    if (validated.isRunner !== undefined) updateData.isRunner = validated.isRunner
    if (validated.isAgent !== undefined) updateData.isAgent = validated.isAgent

    // Handle isRunner flag - create/delete Runner profile
    if (validated.isRunner !== undefined) {
      if (validated.isRunner) {
        // Create runner profile if it doesn't exist
        const existingRunner = await prisma.runner.findUnique({
          where: { playerId: params.id },
        })
        if (!existingRunner) {
          await prisma.runner.create({
            data: {
              name: existing.telegramHandle,
              telegramHandle: existing.telegramHandle,
              ginzaUsername: existing.ginzaUsername,
              playerId: params.id,
              status: 'TRUSTED',
            },
          })
        }
      } else {
        // Delete runner profile if isRunner is set to false
        await prisma.runner.deleteMany({
          where: { playerId: params.id },
        })
      }
    }

    // Handle isAgent flag - create/delete Agent profile
    if (validated.isAgent !== undefined) {
      if (validated.isAgent) {
        // Ensure player has a playerID (hosts are also players and need unique serialized IDs)
        if (!existing.playerID) {
          const playerID = await getNextPlayerID()
          updateData.playerID = playerID
        }
        
        // Create agent profile if it doesn't exist
        const existingAgent = await prisma.agent.findUnique({
          where: { playerId: params.id },
        })
        if (!existingAgent) {
          await prisma.agent.create({
            data: {
              name: existing.telegramHandle,
              telegramHandle: existing.telegramHandle,
              ginzaUsername: existing.ginzaUsername,
              playerId: params.id,
              status: 'ACTIVE',
            },
          })
        }
      } else {
        // Delete agent profile if isAgent is set to false
        await prisma.agent.deleteMany({
          where: { playerId: params.id },
        })
      }
    }

    // Handle playerType changes - create/delete Agent or Runner records
    if (validated.playerType !== undefined && validated.playerType !== existing.playerType) {
      const oldType = existing.playerType
      const newType = validated.playerType

      // If changing from RUNNER/AGENT to PLAYER, delete the profile
      if (oldType === 'RUNNER') {
        await prisma.runner.deleteMany({
          where: { playerId: params.id },
        })
      } else if (oldType === 'AGENT') {
        await prisma.agent.deleteMany({
          where: { playerId: params.id },
        })
      }

      // If changing to RUNNER/AGENT, create the profile if it doesn't exist
      if (newType === 'RUNNER') {
        const existingRunner = await prisma.runner.findUnique({
          where: { playerId: params.id },
        })
        if (!existingRunner) {
          await prisma.runner.create({
            data: {
              name: existing.telegramHandle,
              telegramHandle: existing.telegramHandle,
              playerId: params.id,
              status: 'TRUSTED',
            },
          })
        }
      } else if (newType === 'AGENT') {
        const existingAgent = await prisma.agent.findUnique({
          where: { playerId: params.id },
        })
        if (!existingAgent) {
          await prisma.agent.create({
            data: {
              name: existing.telegramHandle,
              telegramHandle: existing.telegramHandle,
              playerId: params.id,
              status: 'TEST',
            },
          })
        }
      }
    }

    // Only update if there's data to update
    if (Object.keys(updateData).length === 0) {
      // If no update data, just return the existing player
      const player = await prisma.player.findUnique({
        where: { id: params.id },
        include: {
          assignedRunner: true,
          referredByAgent: true,
          runnerProfile: true,
          agentProfile: true,
        },
      })
      if (!player) {
        return NextResponse.json({ error: 'Player not found' }, { status: 404 })
      }
      return NextResponse.json(player)
    }

    const player = await prisma.player.update({
      where: { id: params.id },
      data: updateData,
      include: {
        assignedRunner: true,
        referredByAgent: true,
        runnerProfile: true,
        agentProfile: true,
      },
    })

    const systemUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
    if (systemUser) {
      await logActivity(systemUser.id, 'PLAYER', player.id, 'UPDATE', {
        changes: validated,
      })
    }

    return NextResponse.json(player)
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    console.error('Error updating player:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const player = await prisma.player.findUnique({
      where: { id: params.id },
    })

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }

    await prisma.player.delete({
      where: { id: params.id },
    })

    const systemUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
    if (systemUser) {
      await logActivity(systemUser.id, 'PLAYER', params.id, 'DELETE', {
        telegramHandle: player.telegramHandle,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting player:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

