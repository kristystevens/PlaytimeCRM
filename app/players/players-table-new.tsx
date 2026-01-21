'use client'

import React, { useState, useEffect, type MouseEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import Link from 'next/link'
import { formatMinutes } from '@/lib/playtime-utils'
import { capitalizeFirst } from '@/lib/utils'
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { Player, Runner, Agent } from '@prisma/client'

type PlayerWithRelations = Player & {
  assignedRunner: Runner | null
  referredByAgent: Agent | null
  mostActiveTimes?: string | null
  totalPlaytime?: number
  isRunner?: boolean
  isAgent?: boolean
  playerID?: string | null
}

export default function PlayersTableNew() {
  const router = useRouter()
  const [players, setPlayers] = useState<PlayerWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    status: '',
    churnRisk: '',
    preferredTimeZones: '',
    search: '',
  })
  const [sortBy, setSortBy] = useState<'playerID' | 'name' | 'status' | 'totalPlaytime' | 'lastActiveAt'>('lastActiveAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [runners, setRunners] = useState<Runner[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const safeRunners = Array.isArray(runners) ? runners : []
  const safeAgents = Array.isArray(agents) ? agents : []
  const safePlayers = Array.isArray(players) ? players : []

  useEffect(() => {
    fetchPlayers()
  }, [filters, sortBy, sortOrder])

  // Fetch runners and agents once on mount (for display in expanded rows)
  useEffect(() => {
    fetchRunners()
    fetchAgents()
  }, [])

  const fetchPlayers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.status) params.append('status', filters.status)
      if (filters.churnRisk) params.append('churnRisk', filters.churnRisk)
      if (filters.preferredTimeZones) params.append('preferredTimeZones', filters.preferredTimeZones)
      if (filters.search) params.append('search', filters.search)
      params.append('sortBy', sortBy)
      params.append('sortOrder', sortOrder)

      const res = await fetch(`/api/players?${params}`)
      if (!res.ok) {
        console.error('Failed to fetch players:', res.status)
        setPlayers([])
        return
      }
      const data = await res.json()
      if (Array.isArray(data)) {
        setPlayers(data)
      } else {
        console.error('Invalid response format:', data)
        setPlayers([])
      }
    } catch (error) {
      console.error('Error fetching players:', error)
      setPlayers([])
    } finally {
      setLoading(false)
    }
  }

  const fetchRunners = async () => {
    try {
      const res = await fetch('/api/runners')
      const data = await res.json()
      if (Array.isArray(data)) {
        setRunners(data)
      } else {
        setRunners([])
      }
    } catch (error) {
      console.error('Error fetching runners:', error)
      setRunners([])
    }
  }

  const fetchAgents = async () => {
    try {
      const res = await fetch('/api/agents')
      const data = await res.json()
      if (Array.isArray(data)) {
        setAgents(data)
      } else {
        setAgents([])
      }
    } catch (error) {
      console.error('Error fetching agents:', error)
      setAgents([])
    }
  }

  const handleSort = (column: 'playerID' | 'name' | 'status' | 'totalPlaytime' | 'lastActiveAt') => {
    setSortBy((prevBy) => {
      if (prevBy === column) {
        // Toggle sort order
        setSortOrder((prevOrder) => (prevOrder === 'asc' ? 'desc' : 'asc'))
        return prevBy
      }

      // Default order: desc for numeric/date, asc for text
      if (column === 'playerID' || column === 'totalPlaytime' || column === 'lastActiveAt') {
        setSortOrder('desc')
      } else {
        setSortOrder('asc')
      }
      return column
    })
  }

  const toggleRow = (id: string, e?: MouseEvent) => {
    if (e) {
      e.stopPropagation()
    }
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedRows(newExpanded)
  }

  const navigateToPlayer = (playerId: string) => {
    router.push(`/players/${playerId}`)
  }

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>
  }

  return (
    <div className="space-y-4">
      {/* Players Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Players</CardTitle>
          <CardDescription>
            Click on a row to view player details, or use the buttons to toggle quick view / view
            full page
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th
                    className="text-left p-3 font-medium cursor-pointer select-none"
                    onClick={() => handleSort('playerID')}
                  >
                    Player ID
                  </th>
                  <th
                    className="text-left p-3 font-medium cursor-pointer select-none"
                    onClick={() => handleSort('name')}
                  >
                    Player
                  </th>
                  <th
                    className="text-left p-3 font-medium cursor-pointer select-none"
                    onClick={() => handleSort('status')}
                  >
                    Status
                  </th>
                  <th
                    className="text-left p-3 font-medium cursor-pointer select-none"
                    onClick={() => handleSort('totalPlaytime')}
                  >
                    Total Playtime
                  </th>
                  <th
                    className="text-left p-3 font-medium cursor-pointer select-none"
                    onClick={() => handleSort('lastActiveAt')}
                  >
                    Last Active
                  </th>
                  <th className="text-left p-3 font-medium">Actions</th>
                </tr>
                <tr className="border-b bg-muted/30">
                  <th className="p-2">
                    {/* No filter for Player ID */}
                  </th>
                  <th className="p-2">
                    <Input
                      placeholder="Search..."
                      value={filters.search}
                      onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                      className="h-8 text-sm"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </th>
                  <th className="p-2">
                    <Select
                      value={filters.status || 'all'}
                      onValueChange={(val) =>
                        setFilters({ ...filters, status: val === 'all' ? '' : val })
                      }
                    >
                      <SelectTrigger className="h-8 text-sm" onClick={(e) => e.stopPropagation()}>
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="FADING">Fading</SelectItem>
                        <SelectItem value="CHURNED">Churned</SelectItem>
                      </SelectContent>
                    </Select>
                  </th>
                  <th className="p-2">
                    {/* No filter for Total Playtime */}
                  </th>
                  <th className="p-2">
                    {/* No filter for Last Active */}
                  </th>
                  <th className="p-2">
                    {/* No filter for Actions */}
                  </th>
                </tr>
              </thead>
              <tbody>
                {safePlayers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No players found
                    </td>
                  </tr>
                ) : (
                  // Apply client-side sort for totalPlaytime, otherwise rely on server sort
                  [...safePlayers]
                    .sort((a, b) => {
                      if (sortBy === 'totalPlaytime') {
                        const aVal = a.totalPlaytime || 0
                        const bVal = b.totalPlaytime || 0
                        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal
                      }
                      if (sortBy === 'playerID') {
                        const aVal = (a.playerID || '').localeCompare(b.playerID || '')
                        return sortOrder === 'asc' ? aVal : -aVal
                      }
                      if (sortBy === 'name') {
                        const aName = (a.ginzaUsername || (a as any).name || a.telegramHandle || '').toLowerCase()
                        const bName = (b.ginzaUsername || (b as any).name || b.telegramHandle || '').toLowerCase()
                        const cmp = aName.localeCompare(bName)
                        return sortOrder === 'asc' ? cmp : -cmp
                      }
                      if (sortBy === 'status') {
                        const cmp = (a.status || '').localeCompare(b.status || '')
                        return sortOrder === 'asc' ? cmp : -cmp
                      }
                      if (sortBy === 'lastActiveAt') {
                        const aTime = a.lastActiveAt ? new Date(a.lastActiveAt).getTime() : 0
                        const bTime = b.lastActiveAt ? new Date(b.lastActiveAt).getTime() : 0
                        return sortOrder === 'asc' ? aTime - bTime : bTime - aTime
                      }
                      return 0
                    })
                    .map((player) => {
                    const isExpanded = expandedRows.has(player.id)
                    return (
                      <React.Fragment key={player.id}>
                        <tr
                          className="border-b hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => navigateToPlayer(player.id)}
                        >
                          <td className="p-3">
                            {player.playerID || '-'}
                          </td>
                          <td className="p-3">
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {capitalizeFirst(player.ginzaUsername) || (player as any).name || capitalizeFirst(player.telegramHandle)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {capitalizeFirst(player.ginzaUsername)}
                                {(!player.ginzaUsername && player.telegramHandle) && ` • ${capitalizeFirst(player.telegramHandle)}`}
                              </span>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex flex-wrap gap-1">
                              <Badge
                                className={
                                  player.status === 'ACTIVE'
                                    ? 'bg-green-500'
                                    : player.status === 'FADING'
                                    ? 'bg-yellow-500'
                                    : 'bg-red-500'
                                }
                              >
                                {player.status}
                              </Badge>
                              {player.isRunner && (
                                <Badge className="bg-green-500 text-white">Runner</Badge>
                              )}
                              {player.isAgent && (
                                <Badge className="bg-purple-500 text-white">Agent</Badge>
                              )}
                            </div>
                          </td>
                          <td className="p-3">{formatMinutes(player.totalPlaytime || 0)}</td>
                          <td className="p-3 text-sm">
                            {player.lastActiveAt
                              ? new Date(player.lastActiveAt).toLocaleDateString()
                              : '-'}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => toggleRow(player.id, e)}
                                title="Toggle quick details"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  navigateToPlayer(player.id)
                                }}
                                title="View full details"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-muted/30">
                            <td colSpan={6} className="p-4">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <p className="text-muted-foreground">Ginza Username</p>
                                  <p className="font-medium">{capitalizeFirst(player.ginzaUsername) || '-'}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Preferred Time Zones</p>
                                  <p className="font-medium">
                                    {(() => {
                                      try {
                                        const parsed = JSON.parse((player as any).preferredTimeZones || '[]')
                                        return Array.isArray(parsed) && parsed.length > 0 ? parsed.join(', ') : '-'
                                      } catch {
                                        return '-'
                                      }
                                    })()}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Player Type</p>
                                  <p className="font-medium">{player.skillLevel}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Churn Risk</p>
                                  <p className="font-medium">{player.churnRisk}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">VIP Tier</p>
                                  <p className="font-medium">{player.vipTier}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Most Active Times (EST)</p>
                                  <p className="font-medium">{player.mostActiveTimes || '-'}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Assigned Runner</p>
                                  <p className="font-medium">
                                    {player.assignedRunner ? (
                                      <Link
                                        href={`/runners/${player.assignedRunner.id}`}
                                        className="hover:underline"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {player.assignedRunner.name}
                                      </Link>
                                    ) : (
                                      '-'
                                    )}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Referred By Agent</p>
                                  <p className="font-medium">
                                    {player.referredByAgent ? (
                                      <Link
                                        href={`/agents/${player.referredByAgent.id}`}
                                        className="hover:underline"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {player.referredByAgent.name}
                                      </Link>
                                    ) : (
                                      '-'
                                    )}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Assigned Community Manager</p>
                                  <p className="font-medium">{(player as any).assignedCommunityManager || '-'}</p>
                                </div>
                                {player.walletAddress && (
                                  <div>
                                    <p className="text-muted-foreground">Wallet Address</p>
                                    <p className="font-medium text-xs truncate">
                                      {player.walletAddress}
                                    </p>
                                  </div>
                                )}
                                {player.notes && (
                                  <div className="col-span-2 md:col-span-4">
                                    <p className="text-muted-foreground">Notes</p>
                                    <p className="font-medium">{player.notes}</p>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
