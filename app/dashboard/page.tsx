import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import PlaytimeChart from './playtime-chart'
import { formatMinutes } from '@/lib/playtime-utils'

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

  const activePlayers7d = players.filter(
    (p) => p.lastActiveAt && p.lastActiveAt >= sevenDaysAgo
  ).length

  const topPlayersByPlaytime = players
    .map((p) => {
      const totalPlaytime = p.playtimeEntries.reduce((sum, entry) => sum + entry.minutes, 0)
      return {
        ...p,
        totalPlaytime,
      }
    })
    .sort((a, b) => b.totalPlaytime - a.totalPlaytime)
    .slice(0, 10)

  const topAgents = agents
    .map((a) => ({
      ...a,
      active7d: a.referredPlayers.filter(
        (p) => p.lastActiveAt && p.lastActiveAt >= sevenDaysAgo
      ).length,
    }))
    .sort((a, b) => b.active7d - a.active7d)
    .slice(0, 10)

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
    .slice(0, 10)

  return {
    activePlayers7d,
    totalPlayers: players.length,
    totalRunners: runners.length,
    totalAgents: agents.length,
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Players (7d)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.activePlayers7d}</div>
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
            <CardTitle className="text-sm font-medium">Total Runners</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalRunners}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalAgents}</div>
          </CardContent>
        </Card>
      </div>

      {/* Top Players by Playtime */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Players by Playtime</CardTitle>
          <CardDescription>Players ranked by total playtime</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.topPlayersByPlaytime.map((player, idx) => (
              <div key={player.id} className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center space-x-2">
                  <span className="font-medium">#{idx + 1}</span>
                  <Link href={`/players/${player.id}`} className="hover:underline">
                    {player.telegramHandle}
                  </Link>
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatMinutes(player.totalPlaytime)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Agents */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Agents</CardTitle>
          <CardDescription>By active players (7d)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.topAgents.map((agent, idx) => (
              <div key={agent.id} className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center space-x-2">
                  <span className="font-medium">#{idx + 1}</span>
                  <Link href={`/agents/${agent.id}`} className="hover:underline">
                    {agent.name}
                  </Link>
                </div>
                <div className="text-sm text-muted-foreground">
                  {agent.active7d} active
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Runners */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Runners</CardTitle>
          <CardDescription>By retention rate</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.topRunners.map((runner, idx) => (
              <div key={runner.id} className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center space-x-2">
                  <span className="font-medium">#{idx + 1}</span>
                  <Link href={`/runners/${runner.id}`} className="hover:underline">
                    {runner.name}
                  </Link>
                </div>
                <div className="text-sm text-muted-foreground">
                  {runner.retention.toFixed(1)}% retention | {runner.active7d} active
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

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

