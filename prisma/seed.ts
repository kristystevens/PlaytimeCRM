import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create users
  const adminPassword = await bcrypt.hash('admin123', 10)
  const opsPassword = await bcrypt.hash('ops123', 10)
  const runnerPassword = await bcrypt.hash('runner123', 10)
  const agentPassword = await bcrypt.hash('agent123', 10)

  const admin = await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@ginza.com',
      passwordHash: adminPassword,
      role: 'ADMIN',
    },
  })

  const ops = await prisma.user.create({
    data: {
      name: 'Ops User',
      email: 'ops@ginza.com',
      passwordHash: opsPassword,
      role: 'OPS',
    },
  })

  console.log('Created users')

  // Create runners (only 1 runner)
  const runners = []
  const runner = await prisma.runner.create({
    data: {
      name: 'Alice Runner',
      telegramHandle: 'alice_r',
      timezone: 'UTC',
      languages: JSON.stringify(['English', 'Spanish']),
      status: 'TRUSTED',
      bankrollAccess: true,
      maxTableSize: 6,
      strikeCount: 0,
      compType: 'PERCENT',
      compValue: 5,
    },
  })
  runners.push(runner)

  console.log('Created runners')

  // Create agents (only 1 test agent)
  const agents = []
  const agent = await prisma.agent.create({
    data: {
      name: 'Agent Alpha',
      telegramHandle: 'alpha_agent',
      primaryPlatform: 'TELEGRAM',
      status: 'TEST',
      revSharePct: 10,
    },
  })
  agents.push(agent)

  console.log('Created agents')

  // Create players
  const countries = ['USA', 'UK', 'Canada', 'Australia', 'Germany', 'France', 'Japan', 'Brazil', 'Mexico', 'Spain']
  const vipTiers: string[] = ['HIGH', 'MEDIUM', 'LOW', 'HIGH', 'MEDIUM', 'LOW', 'HIGH', 'MEDIUM', 'LOW', 'MEDIUM']
  const playerStatuses: string[] = ['ACTIVE', 'ACTIVE', 'FADING', 'ACTIVE', 'CHURNED', 'ACTIVE', 'FADING', 'ACTIVE', 'ACTIVE', 'ACTIVE']
  const churnRisks: string[] = ['LOW', 'LOW', 'MED', 'LOW', 'HIGH', 'LOW', 'MED', 'LOW', 'LOW', 'LOW']

  const now = new Date()
  const daysAgo = [1, 2, 5, 0, 45, 3, 15, 0, 2, 1] // Last active days

  for (let i = 0; i < 50; i++) {
    const vipTier = i < 5 ? 'HIGH' : i < 15 ? 'MEDIUM' : 'LOW'
    const status = i < 30 ? 'ACTIVE' : i < 40 ? 'FADING' : 'CHURNED'
    const churnRisk = i < 20 ? 'LOW' : i < 35 ? 'MED' : 'HIGH'
    const lastActiveDays = Math.floor(Math.random() * 60)
    const lastActiveAt = new Date(now.getTime() - lastActiveDays * 24 * 60 * 60 * 1000)

    const totalDeposited = i < 5 
      ? Math.random() * 100000 + 50000 // Whales: 50k-150k
      : i < 15
      ? Math.random() * 20000 + 10000 // Gold: 10k-30k
      : i < 30
      ? Math.random() * 5000 + 2000 // Silver: 2k-7k
      : Math.random() * 2000 + 500 // Bronze: 500-2.5k

    const totalWagered = totalDeposited * (2 + Math.random() * 3) // 2-5x deposits
    const netPnL = totalDeposited * (Math.random() * 0.3 - 0.15) // -15% to +15% of deposits

    const player = await prisma.player.create({
      data: {
        telegramHandle: `player_${i + 1}`,
        walletAddress: i % 3 === 0 ? `0x${Math.random().toString(16).substring(2, 42)}` : null,
        country: countries[i % countries.length],
        vipTier,
        status,
        churnRisk,
        tiltRisk: i % 7 === 0,
        preferredGames: i % 2 === 0 ? JSON.stringify(['NLH', 'PLO']) : JSON.stringify(['NLH']),
        assignedRunnerId: i % 2 === 0 ? runners[i % runners.length].id : null,
        referredByAgentId: i % 3 === 0 ? agents[i % agents.length].id : null,
        lastActiveAt: lastActiveDays < 30 ? lastActiveAt : null,
        totalDeposited: totalDeposited,
        totalWagered: totalWagered,
        netPnL: netPnL,
        avgBuyIn: totalDeposited / 10,
      },
    })
  }

  console.log('Created players')

  // Create some payouts
  for (let i = 0; i < 5; i++) {
    await prisma.payout.create({
      data: {
        payeeType: 'RUNNER',
        payeeId: runners[i].id,
        runnerId: runners[i].id,
        amount: 1000 + i * 500,
        periodStart: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        periodEnd: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
        status: i < 3 ? 'PAID' : 'PENDING',
      },
    })
  }

  // Create one payout for the agent
  if (agents.length > 0) {
    await prisma.payout.create({
      data: {
        payeeType: 'AGENT',
        payeeId: agents[0].id,
        agentId: agents[0].id,
        amount: 500,
        periodStart: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        periodEnd: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
        status: 'PENDING',
      },
    })
  }

  console.log('Created payouts')

  // Create some message tasks
  const players = await prisma.player.findMany({ take: 10 })
  for (let i = 0; i < 5; i++) {
    await prisma.messageTask.create({
      data: {
        playerId: players[i].id,
        channel: 'TELEGRAM',
        template: i < 2 ? 'WHALE_CHECKIN' : 'REVIVE',
        status: i < 3 ? 'TODO' : 'SENT',
        dueAt: new Date(now.getTime() + i * 24 * 60 * 60 * 1000),
        notes: `Follow up with ${players[i].telegramHandle}`,
      },
    })
  }

  console.log('Created message tasks')
  console.log('Seeding completed!')
  console.log('\nTest accounts:')
  console.log('Admin: admin@ginza.com / admin123')
  console.log('Ops: ops@ginza.com / ops123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

