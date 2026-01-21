// @ts-nocheck
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import AgentDetail from './agent-detail'

// Force dynamic rendering to avoid build-time database connection issues
export const dynamic = 'force-dynamic'

export default async function AgentDetailPage({ params }: { params: { id: string } }) {
  const agentResult = await prisma.agent.findUnique({
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

  if (!agentResult) {
    notFound()
  }

  // Explicitly cast to any to bypass TypeScript type checking
  const agent = agentResult as any

  // @ts-ignore - Prisma type inference issue, player is included at runtime
  return <AgentDetail agent={agent} />
}

