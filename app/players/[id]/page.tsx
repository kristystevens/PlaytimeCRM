import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import PlayerDetail from './player-detail'

// Force dynamic rendering to avoid build-time database connection issues
export const dynamic = 'force-dynamic'

async function getPlayer(id: string) {
  const player = await prisma.player.findUnique({
    where: { id },
    include: {
      assignedRunner: true,
      referredByAgent: true,
      gamePlayers: {
        include: {
          game: {
            include: {
              host: true,
            },
          },
        },
      },
    },
  })
  return player
}

export default async function PlayerDetailPage({ params }: { params: { id: string } }) {
  const player = await getPlayer(params.id)

  if (!player) {
    notFound()
  }

  return <PlayerDetail player={player} />
}

