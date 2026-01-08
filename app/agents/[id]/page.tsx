import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import AgentDetail from './agent-detail'
import { Prisma } from '@prisma/client'

async function getAgent(id: string) {
  const agent = await prisma.agent.findUnique({
    where: { id },
    include: {
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
  return agent
}

type AgentWithRelations = Prisma.AgentGetPayload<{
  include: {
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
    payouts: true,
  },
}>

export default async function AgentDetailPage({ params }: { params: { id: string } }) {
  const agent = await getAgent(params.id)

  if (!agent) {
    notFound()
  }

  return <AgentDetail agent={agent as AgentWithRelations} />
}

