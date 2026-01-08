import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { playerSchema } from '@/lib/validations'
import { logActivity } from '@/lib/activity-log'
import { parse, format, addHours } from 'date-fns'

// Round time to nearest hour
function roundToNearestHour(time: string): string {
  try {
    const [hours, minutes] = time.split(':').map(Number)
    // Round to nearest hour (30+ minutes rounds up)
    let roundedHour = hours
    if (minutes >= 30) {
      roundedHour = (hours + 1) % 24
    }
    return `${roundedHour.toString().padStart(2, '0')}:00`
  } catch (error) {
    return time
  }
}

// Convert 24-hour time to 12-hour format with am/pm
function format12Hour(time: string): string {
  try {
    const [hours, minutes] = time.split(':').map(Number)
    const period = hours >= 12 ? 'pm' : 'am'
    let hour12 = hours % 12
    if (hour12 === 0) hour12 = 12
    // Always show just the hour (no minutes) since we rounded
    return `${hour12}${period}`
  } catch (error) {
    return time
  }
}

// Convert ICT (UTC+7) to EST (UTC-5) - 12 hour difference
function convertICTtoEST(ictTime: string): string {
  try {
    const [hours, minutes] = ictTime.split(':').map(Number)
    // Subtract 12 hours to convert ICT to EST
    let estHour = hours - 12
    if (estHour < 0) {
      estHour += 24
    }
    return `${estHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  } catch (error) {
    return ictTime
  }
}

// Calculate most active play times from playtime entries
function calculateMostActiveTimes(entries: Array<{ startTime: string | null; endTime: string | null }>): string {
  if (!entries || entries.length === 0) {
    return '-'
  }

  // Collect all time ranges converted to EST
  const timeRanges: string[] = []
  
  entries.forEach(entry => {
    if (entry.startTime && entry.endTime) {
      const startEST = convertICTtoEST(entry.startTime)
      const endEST = convertICTtoEST(entry.endTime)
      // Round to nearest hour
      const startRounded = roundToNearestHour(startEST)
      const endRounded = roundToNearestHour(endEST)
      const startFormatted = format12Hour(startRounded)
      const endFormatted = format12Hour(endRounded)
      timeRanges.push(`${startFormatted}-${endFormatted}`)
    }
  })

  if (timeRanges.length === 0) {
    return '-'
  }

  // Count frequency of each time range
  const rangeCounts = new Map<string, number>()
  timeRanges.forEach(range => {
    rangeCounts.set(range, (rangeCounts.get(range) || 0) + 1)
  })

  // Find the most common time ranges (top 2)
  const sortedRanges = Array.from(rangeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)

  // Format as readable time ranges
  return sortedRanges.map(([range]) => range).join(', ')
}

export async function GET(request: NextRequest) {
  try {

    const searchParams = request.nextUrl.searchParams
    const vipTier = searchParams.get('vipTier')
    const playerType = searchParams.get('playerType')
    const status = searchParams.get('status')
    const churnRisk = searchParams.get('churnRisk')
    const assignedRunnerId = searchParams.get('assignedRunnerId')
    const referredByAgentId = searchParams.get('referredByAgentId')
    const country = searchParams.get('country')
    const search = searchParams.get('search')
    const sortBy = searchParams.get('sortBy') || 'totalDeposited'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    const where: any = {}

    if (vipTier) where.vipTier = vipTier
    if (playerType) where.playerType = playerType
    if (status) where.status = status
    if (churnRisk) where.churnRisk = churnRisk
    if (assignedRunnerId) where.assignedRunnerId = assignedRunnerId
    if (referredByAgentId) where.referredByAgentId = referredByAgentId
    if (country) where.country = country
    if (search) {
      where.OR = [
        { telegramHandle: { contains: search, mode: 'insensitive' } },
        { walletAddress: { contains: search, mode: 'insensitive' } },
      ]
    }

    const orderBy: any = {}
    orderBy[sortBy] = sortOrder

    const players = await prisma.player.findMany({
      where,
      orderBy,
      include: {
        assignedRunner: {
          select: {
            id: true,
            name: true,
            telegramHandle: true,
          },
        },
        referredByAgent: {
          select: {
            id: true,
            name: true,
            telegramHandle: true,
          },
        },
        playtimeEntries: {
          select: {
            playedOn: true,
            startTime: true,
            endTime: true,
            minutes: true,
            createdAt: true,
          },
          orderBy: {
            playedOn: 'desc',
          },
        },
      },
    })

    // Calculate most active play times, total playtime, and last gameplay datetime
    const playersWithActiveTimes = players.map(player => {
      const activeTimes = calculateMostActiveTimes(
        player.playtimeEntries.filter(e => e.startTime && e.endTime)
      )
      const totalPlaytime = player.playtimeEntries.reduce((sum, entry) => sum + entry.minutes, 0)
      
      // Calculate last gameplay datetime from most recent playtime entry
      let lastGameplayAt: Date | null = null
      if (player.playtimeEntries.length > 0) {
        const mostRecentEntry = player.playtimeEntries[0] // Already sorted by playedOn desc
        // playedOn is normalized to midnight UTC, so we create a new date from it
        const playedOnDate = new Date(mostRecentEntry.playedOn)
        
        // If there's an endTime, combine playedOn date with endTime to get full datetime
        if (mostRecentEntry.endTime) {
          try {
            const [hours, minutes] = mostRecentEntry.endTime.split(':').map(Number)
            // Create a new date and set the time (using local time since endTime is likely in local timezone)
            const gameplayEnd = new Date(playedOnDate)
            gameplayEnd.setHours(hours, minutes, 0, 0)
            lastGameplayAt = gameplayEnd
          } catch (error) {
            // If parsing fails, use playedOn date at end of day
            const gameplayEnd = new Date(playedOnDate)
            gameplayEnd.setHours(23, 59, 59, 999)
            lastGameplayAt = gameplayEnd
          }
        } else {
          // If no endTime, use playedOn date at end of day (23:59:59)
          const gameplayEnd = new Date(playedOnDate)
          gameplayEnd.setHours(23, 59, 59, 999)
          lastGameplayAt = gameplayEnd
        }
      }
      
      return {
        ...player,
        mostActiveTimes: activeTimes,
        totalPlaytime,
        lastActiveAt: lastGameplayAt || player.lastActiveAt, // Use gameplay time if available, otherwise fall back to stored lastActiveAt
      }
    })

    return NextResponse.json(playersWithActiveTimes)
  } catch (error) {
    console.error('Error fetching players:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = playerSchema.parse(body)

    const playerType = validated.playerType || 'PLAYER'
    
    const player = await prisma.player.create({
      data: {
        telegramHandle: validated.telegramHandle,
        ginzaUsername: validated.ginzaUsername,
        walletAddress: validated.walletAddress,
        country: validated.country,
        playerType,
        vipTier: validated.vipTier || 'MEDIUM',
        status: validated.status || 'ACTIVE',
        churnRisk: validated.churnRisk || 'LOW',
        skillLevel: validated.skillLevel || 'AMATEUR',
        tiltRisk: validated.tiltRisk || false,
        preferredGames: validated.preferredGames || [],
        notes: validated.notes,
        assignedRunnerId: validated.assignedRunnerId,
        referredByAgentId: validated.referredByAgentId,
        lastActiveAt: validated.lastActiveAt ? new Date(validated.lastActiveAt) : null,
        totalDeposited: validated.totalDeposited || 0,
        totalWagered: validated.totalWagered || 0,
        netPnL: validated.netPnL || 0,
        avgBuyIn: validated.avgBuyIn || 0,
      },
      include: {
        assignedRunner: true,
        referredByAgent: true,
      },
    })

    // If playerType is RUNNER or AGENT, create the corresponding profile
    if (playerType === 'RUNNER') {
      await prisma.runner.create({
        data: {
          name: player.telegramHandle,
          telegramHandle: player.telegramHandle,
          playerId: player.id,
          status: 'TRUSTED',
        },
      })
    } else if (playerType === 'AGENT') {
      await prisma.agent.create({
        data: {
          name: player.telegramHandle,
          telegramHandle: player.telegramHandle,
          playerId: player.id,
          status: 'TEST',
        },
      })
    }

    // Get system user for activity logging
    const systemUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
    if (systemUser) {
      await logActivity(systemUser.id, 'PLAYER', player.id, 'CREATE', {
        telegramHandle: player.telegramHandle,
      })
    }

    return NextResponse.json(player, { status: 201 })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    console.error('Error creating player:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

