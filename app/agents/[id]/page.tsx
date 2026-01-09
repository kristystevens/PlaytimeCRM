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

  // Type assertion: Prisma query includes player but TypeScript inference doesn't always match
  return <AgentDetail agent={agent as any} />
}

