import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Clearing all test data...')
  
  // Delete in order to respect foreign key constraints
  console.log('Deleting message tasks...')
  await prisma.messageTask.deleteMany({})
  
  console.log('Deleting payouts...')
  await prisma.payout.deleteMany({})
  
  console.log('Deleting activity logs...')
  await prisma.activityLog.deleteMany({})
  
  console.log('Deleting playtime entries...')
  await prisma.playtimeEntry.deleteMany({})
  
  console.log('Deleting players...')
  await prisma.player.deleteMany({})
  
  console.log('Deleting agents...')
  await prisma.agent.deleteMany({})
  
  console.log('Deleting runners...')
  await prisma.runner.deleteMany({})
  
  // Keep users as they might be needed for auth
  // Uncomment if you want to delete users too:
  // console.log('Deleting users...')
  // await prisma.user.deleteMany({})
  
  console.log('All test data cleared!')
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

