import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import RunnerDetail from './runner-detail'

async function getRunner(id: string) {
  const runner = await prisma.runner.findUnique({
    where: { id },
    include: {
      assignedPlayers: {
        include: {
          referredByAgent: {
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
  return runner
}

export default async function RunnerDetailPage({ params }: { params: { id: string } }) {
  const runner = await getRunner(params.id)

  if (!runner) {
    notFound()
  }

  return <RunnerDetail runner={runner} />
}

