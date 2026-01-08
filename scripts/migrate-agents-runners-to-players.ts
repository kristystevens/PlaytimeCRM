import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Migrating agents and runners to players...')
  
  // First, add playerType to existing players (default to PLAYER)
  await prisma.$executeRaw`UPDATE players SET player_type = 'PLAYER' WHERE player_type IS NULL`
  
  // Get all existing agents
  const agents = await prisma.agent.findMany()
  console.log(`Found ${agents.length} agents to migrate`)
  
  for (const agent of agents) {
    // Check if a player with this telegram handle already exists
    let player = await prisma.player.findUnique({
      where: { telegramHandle: agent.telegramHandle },
    })
    
    if (!player) {
      // Create a player for this agent
      player = await prisma.player.create({
        data: {
          telegramHandle: agent.telegramHandle,
          playerType: 'AGENT',
          status: 'ACTIVE',
          vipTier: 'SILVER',
          churnRisk: 'LOW',
          skillLevel: 'AMATEUR',
        },
      })
      console.log(`Created player for agent: ${agent.name}`)
    } else {
      // Update existing player to be an agent
      await prisma.player.update({
        where: { id: player.id },
        data: { playerType: 'AGENT' },
      })
      console.log(`Updated player to agent: ${agent.name}`)
    }
    
    // Update agent to link to player
    await prisma.agent.update({
      where: { id: agent.id },
      data: { playerId: player.id },
    })
  }
  
  // Get all existing runners
  const runners = await prisma.runner.findMany()
  console.log(`Found ${runners.length} runners to migrate`)
  
  for (const runner of runners) {
    // Check if a player with this telegram handle already exists
    let player = await prisma.player.findUnique({
      where: { telegramHandle: runner.telegramHandle },
    })
    
    if (!player) {
      // Create a player for this runner
      player = await prisma.player.create({
        data: {
          telegramHandle: runner.telegramHandle,
          playerType: 'RUNNER',
          status: 'ACTIVE',
          vipTier: 'SILVER',
          churnRisk: 'LOW',
          skillLevel: 'AMATEUR',
        },
      })
      console.log(`Created player for runner: ${runner.name}`)
    } else {
      // Update existing player to be a runner
      await prisma.player.update({
        where: { id: player.id },
        data: { playerType: 'RUNNER' },
      })
      console.log(`Updated player to runner: ${runner.name}`)
    }
    
    // Update runner to link to player
    await prisma.runner.update({
      where: { id: runner.id },
      data: { playerId: player.id },
    })
  }
  
  console.log('Migration completed!')
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

