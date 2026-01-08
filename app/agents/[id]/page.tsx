import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import AgentDetail from './agent-detail'

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

export default async function AgentDetailPage({ params }: { params: { id: string } }) {
  const agent = await getAgent(params.id)

  if (!agent) {
    notFound()
  }

  return <AgentDetail agent={agent} />
}

