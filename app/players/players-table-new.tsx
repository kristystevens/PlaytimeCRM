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
    playerType: '',
    status: '',
    churnRisk: '',
    assignedRunnerId: '',
    referredByAgentId: '',
    country: '',
    search: '',
  })
  const [runners, setRunners] = useState<Runner[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)

  const safeRunners = Array.isArray(runners) ? runners : []
  const safeAgents = Array.isArray(agents) ? agents : []
  const safePlayers = Array.isArray(players) ? players : []

  useEffect(() => {
    fetchPlayers()
    fetchRunners()
    fetchAgents()
  }, [filters])

  const fetchPlayers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.playerType) params.append('playerType', filters.playerType)
      if (filters.status) params.append('status', filters.status)
      if (filters.churnRisk) params.append('churnRisk', filters.churnRisk)
      if (filters.assignedRunnerId) params.append('assignedRunnerId', filters.assignedRunnerId)
      if (filters.referredByAgentId) params.append('referredByAgentId', filters.referredByAgentId)
      if (filters.country) params.append('country', filters.country)
      if (filters.search) params.append('search', filters.search)
      params.append('sortBy', 'lastActiveAt')
      params.append('sortOrder', 'desc')

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
      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Filters</CardTitle>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="md:hidden"
            >
              {showFilters ? 'Hide' : 'Show'} Filters
            </Button>
          </div>
        </CardHeader>
        <CardContent className={showFilters ? 'block' : 'hidden md:block'}>
          <div className="space-y-4">
            <Input
              placeholder="Search telegram/wallet..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="max-w-md"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Select
                value={filters.playerType || 'all'}
                onValueChange={(val) =>
                  setFilters({ ...filters, playerType: val === 'all' ? '' : val })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="PLAYER">Player</SelectItem>
                  <SelectItem value="RUNNER">Runner</SelectItem>
                  <SelectItem value="AGENT">Agent</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filters.status || 'all'}
                onValueChange={(val) =>
                  setFilters({ ...filters, status: val === 'all' ? '' : val })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="FADING">Fading</SelectItem>
                  <SelectItem value="CHURNED">Churned</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filters.churnRisk || 'all'}
                onValueChange={(val) =>
                  setFilters({ ...filters, churnRisk: val === 'all' ? '' : val })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Churn Risk" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Risks</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MED">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filters.assignedRunnerId || 'all'}
                onValueChange={(val) =>
                  setFilters({ ...filters, assignedRunnerId: val === 'all' ? '' : val })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Runner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Runners</SelectItem>
                  {safeRunners.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name || r.telegramHandle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filters.referredByAgentId || 'all'}
                onValueChange={(val) =>
                  setFilters({ ...filters, referredByAgentId: val === 'all' ? '' : val })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Agent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Agents</SelectItem>
                  {safeAgents.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name || a.telegramHandle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

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
                  <th className="text-left p-3 font-medium">Player ID</th>
                  <th className="text-left p-3 font-medium">Player</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Total Playtime</th>
                  <th className="text-left p-3 font-medium">Last Active</th>
                  <th className="text-left p-3 font-medium">Actions</th>
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
                  safePlayers.map((player) => {
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
                              <span className="font-medium">{player.telegramHandle}</span>
                              {player.ginzaUsername && (
                                <span className="text-xs text-muted-foreground">
                                  {player.ginzaUsername}
                                </span>
                              )}
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
                                  <p className="font-medium">{player.ginzaUsername || '-'}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Country</p>
                                  <p className="font-medium">{player.country || '-'}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Skill Level</p>
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
