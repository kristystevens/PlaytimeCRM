import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Removing all agents except one...')
  
  // Get all agents
  const agents = await prisma.agent.findMany({
    orderBy: { createdAt: 'asc' },
  })
  
  if (agents.length === 0) {
    console.log('No agents found.')
    return
  }
  
  if (agents.length === 1) {
    console.log('Only one agent exists, nothing to remove.')
    return
  }
  
  // Keep the first agent, delete the rest
  const agentToKeep = agents[0]
  const agentsToDelete = agents.slice(1)
  
  console.log(`Keeping agent: ${agentToKeep.name} (${agentToKeep.telegramHandle})`)
  console.log(`Deleting ${agentsToDelete.length} agents...`)
  
  // Delete payouts for agents to be deleted
  for (const agent of agentsToDelete) {
    await prisma.payout.deleteMany({
      where: { agentId: agent.id },
    })
  }
  
  // Delete message tasks for agents to be deleted
  await prisma.messageTask.deleteMany({
    where: {
      agentId: {
        in: agentsToDelete.map(a => a.id),
      },
    },
  })
  
  // Update players to remove agent references (set to null)
  await prisma.player.updateMany({
    where: {
      referredByAgentId: {
        in: agentsToDelete.map(a => a.id),
      },
    },
    data: {
      referredByAgentId: null,
    },
  })
  
  // Delete the agents
  await prisma.agent.deleteMany({
    where: {
      id: {
        in: agentsToDelete.map(a => a.id),
      },
    },
  })
  
  console.log(`Successfully removed ${agentsToDelete.length} agents.`)
  console.log(`Remaining agent: ${agentToKeep.name} (${agentToKeep.telegramHandle})`)
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

