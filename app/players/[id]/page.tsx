import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import PlayerDetail from './player-detail'

async function getPlayer(id: string) {
  const player = await prisma.player.findUnique({
    where: { id },
    include: {
      assignedRunner: true,
      referredByAgent: true,
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

