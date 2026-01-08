import { describe, it, expect } from 'vitest'
import { calculateValueScore, classifyChurnStatus } from '../metrics'
import { PlayerStatus, ChurnRisk } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

describe('calculateValueScore', () => {
  it('should calculate value score correctly', () => {
    const totalDeposited = 10000
    const totalWagered = 50000
    const netPnL = 1000

    const score = calculateValueScore(totalDeposited, totalWagered, netPnL)
    // Formula: 10000 + (50000 * 0.1) - (1000 * 0.05) = 10000 + 5000 - 50 = 14950
    expect(score).toBe(14950)
  })

  it('should handle negative PnL', () => {
    const totalDeposited = 10000
    const totalWagered = 50000
    const netPnL = -2000

    const score = calculateValueScore(totalDeposited, totalWagered, netPnL)
    // Formula: 10000 + (50000 * 0.1) - (2000 * 0.05) = 10000 + 5000 - 100 = 14900
    expect(score).toBe(14900)
  })

  it('should work with Decimal types', () => {
    const totalDeposited = new Decimal(10000)
    const totalWagered = new Decimal(50000)
    const netPnL = new Decimal(1000)

    const score = calculateValueScore(totalDeposited, totalWagered, netPnL)
    expect(score).toBe(14950)
  })
})

describe('classifyChurnStatus', () => {
  it('should classify active player correctly', () => {
    const now = new Date()
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)

    const result = classifyChurnStatus(threeDaysAgo)
    expect(result.status).toBe(PlayerStatus.ACTIVE)
    expect(result.churnRisk).toBe(ChurnRisk.LOW)
  })

  it('should classify fading player correctly (8 days)', () => {
    const now = new Date()
    const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000)

    const result = classifyChurnStatus(eightDaysAgo)
    expect(result.status).toBe(PlayerStatus.FADING)
    expect(result.churnRisk).toBe(ChurnRisk.MED)
  })

  it('should classify fading player correctly (15 days)', () => {
    const now = new Date()
    const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000)

    const result = classifyChurnStatus(fifteenDaysAgo)
    expect(result.status).toBe(PlayerStatus.FADING)
    expect(result.churnRisk).toBe(ChurnRisk.HIGH)
  })

  it('should classify churned player correctly', () => {
    const now = new Date()
    const fortyFiveDaysAgo = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000)

    const result = classifyChurnStatus(fortyFiveDaysAgo)
    expect(result.status).toBe(PlayerStatus.CHURNED)
    expect(result.churnRisk).toBe(ChurnRisk.HIGH)
  })

  it('should handle null lastActiveAt', () => {
    const result = classifyChurnStatus(null)
    expect(result.status).toBe(PlayerStatus.CHURNED)
    expect(result.churnRisk).toBe(ChurnRisk.HIGH)
  })

  it('should handle undefined lastActiveAt', () => {
    const result = classifyChurnStatus(undefined)
    expect(result.status).toBe(PlayerStatus.CHURNED)
    expect(result.churnRisk).toBe(ChurnRisk.HIGH)
  })
})

