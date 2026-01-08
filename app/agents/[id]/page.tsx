import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import AgentDetail from './agent-detail'

export default async function AgentDetailPage({ params }: { params: { id: string } }) {
  const agent = await prisma.agent.findUnique({
    where: { id },
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
    notFound()
  }

  // @ts-expect-error - Prisma type inference issue, but player is included at runtime
  return <AgentDetail agent={agent} />
}

