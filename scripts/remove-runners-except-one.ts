import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Removing all runners except one...')
  
  // Get all runners
  const runners = await prisma.runner.findMany({
    orderBy: { createdAt: 'asc' },
  })
  
  if (runners.length === 0) {
    console.log('No runners found.')
    return
  }
  
  if (runners.length === 1) {
    console.log('Only one runner exists, nothing to remove.')
    return
  }
  
  // Keep the first runner, delete the rest
  const runnerToKeep = runners[0]
  const runnersToDelete = runners.slice(1)
  
  console.log(`Keeping runner: ${runnerToKeep.name} (${runnerToKeep.telegramHandle})`)
  console.log(`Deleting ${runnersToDelete.length} runners...`)
  
  // Delete payouts for runners to be deleted
  for (const runner of runnersToDelete) {
    await prisma.payout.deleteMany({
      where: { runnerId: runner.id },
    })
  }
  
  // Update players to remove runner references (set to null)
  await prisma.player.updateMany({
    where: {
      assignedRunnerId: {
        in: runnersToDelete.map(r => r.id),
      },
    },
    data: {
      assignedRunnerId: null,
    },
  })
  
  // Delete the runners
  await prisma.runner.deleteMany({
    where: {
      id: {
        in: runnersToDelete.map(r => r.id),
      },
    },
  })
  
  console.log(`Successfully removed ${runnersToDelete.length} runners.`)
  console.log(`Remaining runner: ${runnerToKeep.name} (${runnerToKeep.telegramHandle})`)
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

