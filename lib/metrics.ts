import { Decimal } from '@prisma/client/runtime/library'

/**
 * Calculate player value score
 * Formula: totalDeposited + (totalWagered * 0.1) - abs(netPnL) * 0.05
 */
export function calculateValueScore(
  totalDeposited: Decimal | number,
  totalWagered: Decimal | number,
  netPnL: Decimal | number
): number {
  const deposited = typeof totalDeposited === 'number' ? totalDeposited : Number(totalDeposited)
  const wagered = typeof totalWagered === 'number' ? totalWagered : Number(totalWagered)
  const pnl = typeof netPnL === 'number' ? netPnL : Number(netPnL)

  return deposited + (wagered * 0.1) - Math.abs(pnl) * 0.05
}

/**
 * Classify player status and churn risk based on lastActiveAt
 */
export function classifyChurnStatus(lastActiveAt: Date | null | undefined): {
  status: string
  churnRisk: string
} {
  if (!lastActiveAt) {
    return { status: 'CHURNED', churnRisk: 'HIGH' }
  }

  const now = new Date()
  const daysSinceActive = Math.floor((now.getTime() - lastActiveAt.getTime()) / (1000 * 60 * 60 * 24))

  if (daysSinceActive > 30) {
    return { status: 'CHURNED', churnRisk: 'HIGH' }
  } else if (daysSinceActive > 14) {
    return { status: 'FADING', churnRisk: 'HIGH' }
  } else if (daysSinceActive > 7) {
    return { status: 'FADING', churnRisk: 'MED' }
  } else {
    return { status: 'ACTIVE', churnRisk: 'LOW' }
  }
}

/**
 * Calculate runner retention metrics
 */
export function calculateRunnerRetention(
  players: Array<{ lastActiveAt: Date | null }>
): {
  active7d: number
  active30d: number
  retention7d: number
  retention30d: number
} {
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const active7d = players.filter(
    (p) => p.lastActiveAt && p.lastActiveAt >= sevenDaysAgo
  ).length

  const active30d = players.filter(
    (p) => p.lastActiveAt && p.lastActiveAt >= thirtyDaysAgo
  ).length

  const total = players.length

  return {
    active7d,
    active30d,
    retention7d: total > 0 ? (active7d / total) * 100 : 0,
    retention30d: total > 0 ? (active30d / total) * 100 : 0,
  }
}

/**
 * Calculate agent performance metrics
 */
export function calculateAgentPerformance(players: Array<{
  lastActiveAt: Date | null
  totalDeposited: Decimal | number
  totalWagered: Decimal | number
}>): {
  totalPlayers: number
  active7d: number
  active30d: number
  totalDeposits: number
  totalWagered: number
} {
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const active7d = players.filter(
    (p) => p.lastActiveAt && p.lastActiveAt >= sevenDaysAgo
  ).length

  const active30d = players.filter(
    (p) => p.lastActiveAt && p.lastActiveAt >= thirtyDaysAgo
  ).length

  const totalDeposits = players.reduce((sum, p) => {
    const val = typeof p.totalDeposited === 'number' ? p.totalDeposited : Number(p.totalDeposited)
    return sum + val
  }, 0)

  const totalWagered = players.reduce((sum, p) => {
    const val = typeof p.totalWagered === 'number' ? p.totalWagered : Number(p.totalWagered)
    return sum + val
  }, 0)

  return {
    totalPlayers: players.length,
    active7d,
    active30d,
    totalDeposits,
    totalWagered,
  }
}

