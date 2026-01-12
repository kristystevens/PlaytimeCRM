import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { playerSchema } from '@/lib/validations'
import { logActivity } from '@/lib/activity-log'
import { getNextPlayerID } from '@/lib/player-id-utils'
import { parse, format, addHours } from 'date-fns'

export const dynamic = 'force-dynamic'

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
        { ginzaUsername: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Don't sort by totalPlaytime on server side since it's calculated
    const orderBy: any = {}
    if (sortBy !== 'totalPlaytime') {
      orderBy[sortBy] = sortOrder
    } else {
      // Default to lastActiveAt if sorting by totalPlaytime (will be sorted client-side)
      orderBy['lastActiveAt'] = 'desc'
    }

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

    // Ensure players is an array (Prisma always returns an array, but double-check)
    if (!Array.isArray(players)) {
      console.error('Players is not an array:', players)
      return NextResponse.json({ error: 'Invalid data format' }, { status: 500 })
    }

    // Calculate most active play times, total playtime, and last gameplay datetime
    const now = new Date()
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000) // 14 days ago
    
    const playersWithActiveTimes = await Promise.all(players.map(async (player) => {
      // Ensure playtimeEntries is an array
      const playtimeEntries = Array.isArray(player.playtimeEntries) ? player.playtimeEntries : []
      
      const activeTimes = calculateMostActiveTimes(
        playtimeEntries.filter(e => e && e.startTime && e.endTime)
      )
      // Calculate total playtime - ensure we're summing valid numbers only
      const totalPlaytime = playtimeEntries.reduce((sum, entry) => {
        if (!entry) return sum
        const minutes = entry.minutes
        // Ensure minutes is a valid number
        if (typeof minutes === 'number' && !isNaN(minutes) && minutes >= 0) {
          return sum + minutes
        }
        return sum
      }, 0)
      
      // Calculate last gameplay datetime from most recent playtime entry
      let lastGameplayAt: Date | null = null
      if (playtimeEntries.length > 0) {
        const mostRecentEntry = playtimeEntries[0] // Already sorted by playedOn desc
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
      
      // Use gameplay time if available, otherwise fall back to stored lastActiveAt
      const finalLastActiveAt = lastGameplayAt || player.lastActiveAt
      
      // Check if player hasn't played in over 2 weeks and automatically set status to FADING
      let updatedStatus = player.status
      if (finalLastActiveAt && player.status === 'ACTIVE') {
        const lastActiveDate = new Date(finalLastActiveAt)
        if (lastActiveDate < twoWeeksAgo) {
          // Update status to FADING in database
          try {
            await prisma.player.update({
              where: { id: player.id },
              data: { status: 'FADING' },
            })
            updatedStatus = 'FADING'
          } catch (error) {
            console.error(`Error updating status for player ${player.id}:`, error)
            // Continue with original status if update fails
          }
        }
      }
      
      return {
        ...player,
        mostActiveTimes: activeTimes,
        totalPlaytime,
        lastActiveAt: finalLastActiveAt,
        status: updatedStatus,
      }
    }))

    return NextResponse.json(playersWithActiveTimes)
  } catch (error: any) {
    console.error('Error fetching players:', error)
    // Return error details in development, generic message in production
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? error?.message || 'Internal server error'
      : 'Internal server error'
    return NextResponse.json({ error: errorMessage, details: error?.stack }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = playerSchema.parse(body)

    const isRunner = validated.isRunner || false
    const isAgent = validated.isAgent || false
    
    // Always auto-assign sequential playerID
    const playerID = await getNextPlayerID()
    
    const player = await prisma.player.create({
      data: {
        telegramHandle: validated.telegramHandle,
        ginzaUsername: validated.ginzaUsername,
        country: validated.country,
        playerType: validated.playerType || 'PLAYER',
        isRunner,
        isAgent,
        playerID: playerID,
        vipTier: validated.vipTier || 'MEDIUM',
        status: validated.status || 'ACTIVE',
        churnRisk: validated.churnRisk || 'LOW',
        skillLevel: validated.skillLevel || 'AMATEUR',
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

    // If isRunner is true, create the runner profile
    if (isRunner) {
      await prisma.runner.create({
        data: {
          name: player.telegramHandle,
          telegramHandle: player.telegramHandle,
          ginzaUsername: player.ginzaUsername,
          playerId: player.id,
          status: 'TRUSTED',
        },
      })
    }
    
    // If isAgent is true, create the agent profile
    if (isAgent) {
      await prisma.agent.create({
        data: {
          name: player.telegramHandle,
          telegramHandle: player.telegramHandle,
          ginzaUsername: player.ginzaUsername,
          playerId: player.id,
          status: 'ACTIVE',
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

