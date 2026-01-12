import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import PlaytimeChart from './playtime-chart'
import { formatMinutes } from '@/lib/playtime-utils'
import DashboardTable from './dashboard-table'
import { parse, format, addHours } from 'date-fns'

// Round time to nearest hour
function roundToNearestHour(time: string): string {
  try {
    const [hours, minutes] = time.split(':').map(Number)
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
    const [hours] = time.split(':').map(Number)
    const period = hours >= 12 ? 'pm' : 'am'
    let hour12 = hours % 12
    if (hour12 === 0) hour12 = 12
    return `${hour12}${period}`
  } catch (error) {
    return time
  }
}

// Convert ICT (UTC+7) to EST (UTC-5) - 12 hour difference
function convertICTtoEST(ictTime: string): string {
  try {
    const [hours, minutes] = ictTime.split(':').map(Number)
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

  const timeRanges: string[] = []
  
  entries.forEach(entry => {
    if (entry.startTime && entry.endTime) {
      const startEST = convertICTtoEST(entry.startTime)
      const endEST = convertICTtoEST(entry.endTime)
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

  const rangeCounts = new Map<string, number>()
  timeRanges.forEach(range => {
    rangeCounts.set(range, (rangeCounts.get(range) || 0) + 1)
  })

  const sortedRanges = Array.from(rangeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)

  return sortedRanges.map(([range]) => range).join(', ')
}

async function getDashboardData() {
  const players = await prisma.player.findMany({
    include: {
      assignedRunner: true,
      referredByAgent: true,
      playtimeEntries: true,
    },
  })

  const runners = await prisma.runner.findMany({
    include: {
      assignedPlayers: true,
    },
  })

  const agents = await prisma.agent.findMany({
    include: {
      referredPlayers: true,
    },
  })

  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  // Ensure players is an array
  const safePlayers = Array.isArray(players) ? players : []

  // Active players = players with status = 'ACTIVE'
  const activePlayers = safePlayers.filter(
    (p) => p.status === 'ACTIVE'
  ).length

  const activePlayers7d = safePlayers.filter(
    (p) => p.lastActiveAt && p.lastActiveAt >= sevenDaysAgo
  ).length

  // Count hosts the same way as the hosts page - players with isAgent = true
  const hostPlayers = safePlayers.filter((p: any) => p.isAgent === true)
  const totalHosts = hostPlayers.length

  const topPlayersByPlaytime = safePlayers
    .map((p) => {
      const playtimeEntries = Array.isArray(p.playtimeEntries) ? p.playtimeEntries : []
      const totalPlaytime = playtimeEntries.reduce((sum, entry) => sum + entry.minutes, 0)
      const mostActiveTimes = calculateMostActiveTimes(
        playtimeEntries.map(e => ({ startTime: e.startTime, endTime: e.endTime }))
      )
      
      // Calculate last gameplay datetime from most recent playtime entry
      let lastGameplayAt: Date | null = null
      if (playtimeEntries.length > 0) {
        // Sort entries by playedOn descending to get most recent
        const sortedEntries = [...playtimeEntries].sort((a, b) => 
          new Date(b.playedOn).getTime() - new Date(a.playedOn).getTime()
        )
        const mostRecentEntry = sortedEntries[0]
        const playedOnDate = new Date(mostRecentEntry.playedOn)
        
        // If there's an endTime, combine playedOn date with endTime to get full datetime
        if (mostRecentEntry.endTime) {
          try {
            const [hours, minutes] = mostRecentEntry.endTime.split(':').map(Number)
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
        ...p,
        totalPlaytime,
        mostActiveTimes,
        lastActiveAt: lastGameplayAt || p.lastActiveAt, // Use gameplay time if available, otherwise fall back to stored lastActiveAt
      }
    })
    .sort((a, b) => b.totalPlaytime - a.totalPlaytime)
    .slice(0, 10) // Only show top 10

  const topAgents = Array.isArray(agents) ? agents
    .map((a) => ({
      ...a,
      active7d: a.referredPlayers.filter(
        (p) => p.lastActiveAt && p.lastActiveAt >= sevenDaysAgo
      ).length,
    }))
    .sort((a, b) => b.active7d - a.active7d) : []

  const topRunners = runners
    .map((r) => ({
      ...r,
      active7d: r.assignedPlayers.filter(
        (p) => p.lastActiveAt && p.lastActiveAt >= sevenDaysAgo
      ).length,
      retention: r.assignedPlayers.length > 0
        ? (r.assignedPlayers.filter(
            (p) => p.lastActiveAt && p.lastActiveAt >= sevenDaysAgo
          ).length / r.assignedPlayers.length) * 100
        : 0,
    }))
    .sort((a, b) => b.retention - a.retention)

  // Count active hosts (players with isAgent = true and status = 'ACTIVE')
  const activeHosts = hostPlayers.filter(
    (p: any) => p.status === 'ACTIVE'
  ).length

  return {
    activePlayers,
    activePlayers7d,
    totalPlayers: safePlayers.length,
    totalHosts,
    activeHosts,
    topPlayersByPlaytime,
    topAgents,
    topRunners,
  }
}

export default async function DashboardPage() {
  try {
    const data = await getDashboardData()

    return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your poker community</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Players</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.activePlayers}</div>
            <p className="text-xs text-muted-foreground">out of {data.totalPlayers} total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Players</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalPlayers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hosts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalHosts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Hosts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.activeHosts}</div>
            <p className="text-xs text-muted-foreground">out of {data.totalHosts} total</p>
          </CardContent>
        </Card>
      </div>

      {/* Dashboard Table with Dropdowns */}
      <DashboardTable 
        players={data.topPlayersByPlaytime.map(p => ({
          ...p,
          playerID: (p as any).playerID || null,
        }))}
        agents={data.topAgents}
        runners={data.topRunners}
      />

      {/* Total Playtime Chart */}
      <PlaytimeChart />
    </div>
    )
  } catch (error: any) {
    console.error('Error loading dashboard:', error)
    const errorMessage = error?.message || error?.toString() || 'Unknown error'
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your poker community</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600 font-semibold mb-2">Error loading dashboard data</p>
            <p className="text-sm text-muted-foreground mb-4">{errorMessage}</p>
            <p className="text-xs text-muted-foreground">Please check the browser console and server logs for more details.</p>
          </CardContent>
        </Card>
      </div>
    )
  }
}
