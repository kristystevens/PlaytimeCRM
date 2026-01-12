'use client'

import { useState, useEffect, useMemo, Fragment, type MouseEvent, useCallback, startTransition, useRef } from 'react'
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
import { ChevronDown, ChevronUp, ExternalLink, Pencil, Check, X } from 'lucide-react'
import { Player, Runner, Agent } from '@prisma/client'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

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
  // ALWAYS default to sorting by totalPlaytime descending (most to least)
  const [sortBy, setSortBy] = useState<'lastActiveAt' | 'totalPlaytime'>('totalPlaytime')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
  // Ensure sortBy is always 'totalPlaytime' on mount and after data loads
  useEffect(() => {
    if (sortBy !== 'totalPlaytime' && safePlayers.length > 0) {
      // Reset to totalPlaytime if it was changed but we want default behavior
      // Only do this if user hasn't explicitly clicked a column header
    }
  }, [])
  const [runners, setRunners] = useState<Runner[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState<PlayerWithRelations | null>(null)
  const [editingField, setEditingField] = useState<string>('')
  const [dialogEditValue, setDialogEditValue] = useState<any>('')
  const [columnFilters, setColumnFilters] = useState({
    playerID: '',
    playerName: '',
    status: '',
    totalPlaytime: '',
    lastActive: '',
    country: '',
    skillLevel: '',
    churnRisk: '',
    vipTier: '',
    isRunner: '',
    isAgent: '',
  })

  const safeRunners = Array.isArray(runners) ? runners : []
  const safeAgents = Array.isArray(agents) ? agents : []
  const safePlayers = Array.isArray(players) ? players : []

  // Filter and apply user sorting - ALWAYS default to totalPlaytime descending
  const sortedAndFilteredPlayers = useMemo(() => {
    // Start with players array
    let result = [...safePlayers]

    // Apply column filters
    if (columnFilters.playerID) {
      result = result.filter(p => 
        (p.playerID || '').toLowerCase().includes(columnFilters.playerID.toLowerCase())
      )
    }
    if (columnFilters.playerName) {
      result = result.filter(p => 
        (p.telegramHandle || '').toLowerCase().includes(columnFilters.playerName.toLowerCase()) ||
        (p.ginzaUsername || '').toLowerCase().includes(columnFilters.playerName.toLowerCase())
      )
    }
    if (columnFilters.status) {
      result = result.filter(p => p.status === columnFilters.status)
    }
    if (columnFilters.totalPlaytime) {
      const playtimeFilter = columnFilters.totalPlaytime
      if (playtimeFilter === 'most') {
        // Show top 20 players by playtime
        const sortedByPlaytime = [...result].sort((a, b) => {
          const aPlaytime = parseFloat(String(a.totalPlaytime || 0))
          const bPlaytime = parseFloat(String(b.totalPlaytime || 0))
          return bPlaytime - aPlaytime
        })
        const top20Playtime = sortedByPlaytime.slice(0, 20).map(p => p.id)
        result = result.filter(p => top20Playtime.includes(p.id))
      } else if (playtimeFilter === 'high') {
        result = result.filter(p => (p.totalPlaytime || 0) >= 1000)
      } else if (playtimeFilter === 'medium') {
        result = result.filter(p => (p.totalPlaytime || 0) >= 500 && (p.totalPlaytime || 0) < 1000)
      } else if (playtimeFilter === 'low') {
        result = result.filter(p => (p.totalPlaytime || 0) < 500)
      }
    }
    if (columnFilters.lastActive) {
      const now = new Date()
      const daysAgo = parseInt(columnFilters.lastActive)
      if (!isNaN(daysAgo)) {
        const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)
        result = result.filter(p => {
          if (!p.lastActiveAt) return false
          return new Date(p.lastActiveAt) >= cutoffDate
        })
      }
    }
    if (columnFilters.country) {
      result = result.filter(p => 
        (p.country || '').toLowerCase().includes(columnFilters.country.toLowerCase())
      )
    }
    if (columnFilters.skillLevel) {
      result = result.filter(p => p.skillLevel === columnFilters.skillLevel)
    }
    if (columnFilters.churnRisk) {
      result = result.filter(p => p.churnRisk === columnFilters.churnRisk)
    }
    if (columnFilters.vipTier) {
      result = result.filter(p => p.vipTier === columnFilters.vipTier)
    }
    if (columnFilters.isRunner === 'yes') {
      result = result.filter(p => p.isRunner === true)
    } else if (columnFilters.isRunner === 'no') {
      result = result.filter(p => !p.isRunner)
    }
    if (columnFilters.isAgent === 'yes') {
      result = result.filter(p => p.isAgent === true)
    } else if (columnFilters.isAgent === 'no') {
      result = result.filter(p => !p.isAgent)
    }

    // DEFAULT: Always sort by totalPlaytime descending (most to least)
    // Only override if user explicitly clicked to sort by lastActiveAt
    if (sortBy === 'lastActiveAt') {
      result.sort((a, b) => {
        const aDate = a.lastActiveAt ? new Date(a.lastActiveAt).getTime() : 0
        const bDate = b.lastActiveAt ? new Date(b.lastActiveAt).getTime() : 0
        return sortOrder === 'desc' ? bDate - aDate : aDate - bDate
      })
    } else {
      // Default: sort by totalPlaytime descending (most to least)
      // This ensures players are ALWAYS organized by playtime from most to least
      result.sort((a, b) => {
        const aPlaytime = parseFloat(String(a.totalPlaytime || 0))
        const bPlaytime = parseFloat(String(b.totalPlaytime || 0))
        const diff = bPlaytime - aPlaytime // Descending: most to least
        if (diff !== 0) {
          return diff
        }
        // If playtime is equal, sort by name for consistency
        return (a.telegramHandle || '').localeCompare(b.telegramHandle || '')
      })
      
      // If user wants ascending, reverse it
      if (sortOrder === 'asc') {
        result.reverse()
      }
    }

    return result
  }, [safePlayers, columnFilters, sortBy, sortOrder])

  useEffect(() => {
    fetchPlayers()
    fetchRunners()
    fetchAgents()
  }, [sortBy, sortOrder])

  const fetchPlayers = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/players`)
      if (!res.ok) {
        const errorText = await res.text()
        console.error('Failed to fetch players:', {
          status: res.status,
          statusText: res.statusText,
          url: `/api/players`,
          error: errorText,
        })
        setPlayers([])
        return
      }
      const data = await res.json()
      if (Array.isArray(data)) {
        // FORCE sort by totalPlaytime descending (most to least) - this is the default
        const sortedData = [...data].sort((a, b) => {
          const aPlaytime = parseFloat(String(a.totalPlaytime || 0))
          const bPlaytime = parseFloat(String(b.totalPlaytime || 0))
          // Always sort descending: highest playtime first
          const diff = bPlaytime - aPlaytime
          if (diff !== 0) {
            return diff
          }
          // If playtime is equal, sort by name for consistency
          return (a.telegramHandle || '').localeCompare(b.telegramHandle || '')
        })
        
        // Verify sorting worked - log first few players
        if (sortedData.length > 0) {
          const top5 = sortedData.slice(0, 5).map((p, idx) => 
            `#${idx + 1}: ${p.telegramHandle} = ${p.totalPlaytime || 0} min`
          )
          console.log('✅ Players organized by playtime (MOST to LEAST):', top5)
          
          // Verify the sort is correct
          const isSorted = sortedData.every((p, idx) => {
            if (idx === 0) return true
            const prevPlaytime = sortedData[idx - 1].totalPlaytime || 0
            const currPlaytime = p.totalPlaytime || 0
            return prevPlaytime >= currPlaytime
          })
          if (!isSorted) {
            console.warn('⚠️ WARNING: Players are NOT sorted correctly!')
          }
        }
        
        setPlayers(sortedData)
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

  const renderEditableField = (label: string, value: any, player: PlayerWithRelations, field: string) => {
    return (
      <div>
        <p className="text-muted-foreground mb-1">{label}</p>
        <div className="flex items-center gap-2 group">
          <p className="font-medium">{value || '-'}</p>
          <Button
            size="sm"
            variant="ghost"
            className="opacity-70 hover:opacity-100 h-6 w-6 p-0"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleStartEdit(player, field, value, e)
            }}
            onMouseDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
          >
            <Pencil className="h-3 w-3" />
          </Button>
        </div>
      </div>
    )
  }

  const handleStartEdit = (player: PlayerWithRelations, field: string, currentValue: any, e?: MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    setEditingPlayer(player)
    setEditingField(field)
    setDialogEditValue(currentValue ?? '')
    setEditDialogOpen(true)
  }

  const handleSaveDialogEdit = async () => {
    if (!editingPlayer || !editingField) return

    // Prevent editing playerID - it's auto-assigned and read-only
    if (editingField === 'playerID') {
      alert('Player ID cannot be edited. It is automatically assigned.')
      setEditDialogOpen(false)
      return
    }
    
    setSaving(true)
    try {
      const updateData: any = { [editingField]: dialogEditValue || null }
      
      const res = await fetch(`/api/players/${editingPlayer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })

      if (!res.ok) {
        const errorText = await res.text()
        let error
        try {
          error = JSON.parse(errorText)
        } catch {
          error = { error: errorText || `HTTP ${res.status}: ${res.statusText}` }
        }
        console.error('API Error:', {
          status: res.status,
          statusText: res.statusText,
          url: `/api/players/${editingPlayer.id}`,
          error,
        })
        alert(`Error: ${error.error || 'Failed to update player'} (Status: ${res.status})`)
        return
      }

      await fetchPlayers()
      setEditDialogOpen(false)
      setEditingPlayer(null)
      setEditingField('')
      setDialogEditValue('')
    } catch (error: any) {
      console.error('Error saving edit:', error)
      alert('Failed to save changes. Please try again.')
    } finally {
      setSaving(false)
    }
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
                  <th className="text-left p-3 font-medium">Player ID</th>
                  <th className="text-left p-3 font-medium">Player</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th 
                    className="text-left p-3 font-medium cursor-pointer hover:bg-muted/50 select-none"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (sortBy === 'totalPlaytime') {
                        setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')
                      } else {
                        setSortBy('totalPlaytime')
                        setSortOrder('desc')
                      }
                    }}
                  >
                    <div className="flex items-center gap-2">
                      Total Playtime
                      {sortBy === 'totalPlaytime' && (
                        <span className="text-xs">
                          {sortOrder === 'desc' ? '↓' : '↑'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="text-left p-3 font-medium cursor-pointer hover:bg-muted/50 select-none"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (sortBy === 'lastActiveAt') {
                        setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')
                      } else {
                        setSortBy('lastActiveAt')
                        setSortOrder('desc')
                      }
                    }}
                  >
                    <div className="flex items-center gap-2">
                      Last Active
                      {sortBy === 'lastActiveAt' && (
                        <span className="text-xs">
                          {sortOrder === 'desc' ? '↓' : '↑'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="text-left p-3 font-medium">Actions</th>
                </tr>
                <tr className="border-b bg-muted/30">
                  <td className="p-2">
                    <Input
                      placeholder="Filter ID..."
                      value={columnFilters.playerID}
                      onChange={(e) => {
                        e.stopPropagation()
                        setColumnFilters({ ...columnFilters, playerID: e.target.value })
                      }}
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="h-8 text-xs"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      placeholder="Filter name..."
                      value={columnFilters.playerName}
                      onChange={(e) => {
                        e.stopPropagation()
                        setColumnFilters({ ...columnFilters, playerName: e.target.value })
                      }}
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="h-8 text-xs"
                    />
                  </td>
                  <td className="p-2">
                    <Select
                      value={columnFilters.status || 'all'}
                      onValueChange={(val) => {
                        setColumnFilters({ ...columnFilters, status: val === 'all' ? '' : val })
                      }}
                    >
                      <SelectTrigger 
                        className="h-8 text-xs" 
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="FADING">Fading</SelectItem>
                        <SelectItem value="CHURNED">Churned</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-2">
                    <Select
                      value={columnFilters.totalPlaytime || 'all'}
                      onValueChange={(val) => {
                        setColumnFilters({ ...columnFilters, totalPlaytime: val === 'all' ? '' : val })
                      }}
                    >
                      <SelectTrigger 
                        className="h-8 text-xs" 
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        <SelectValue placeholder="All Playtime" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Playtime</SelectItem>
                        <SelectItem value="most">Most Playtime (Top 20)</SelectItem>
                        <SelectItem value="high">High (1000+ min)</SelectItem>
                        <SelectItem value="medium">Medium (500-999 min)</SelectItem>
                        <SelectItem value="low">Low (&lt;500 min)</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-2">
                    <Select
                      value={columnFilters.lastActive || 'all'}
                      onValueChange={(val) => {
                        setColumnFilters({ ...columnFilters, lastActive: val === 'all' ? '' : val })
                      }}
                    >
                      <SelectTrigger 
                        className="h-8 text-xs" 
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        <SelectValue placeholder="All Time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="1">Last 24 hours</SelectItem>
                        <SelectItem value="7">Last 7 days</SelectItem>
                        <SelectItem value="30">Last 30 days</SelectItem>
                        <SelectItem value="90">Last 90 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-2"></td>
                </tr>
              </thead>
              <tbody>
                {sortedAndFilteredPlayers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No players found
                    </td>
                  </tr>
                ) : (
                  sortedAndFilteredPlayers.map((player) => {
                    const isExpanded = expandedRows.has(player.id)
                    return (
                      <Fragment key={player.id}>
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
                                <Badge className="bg-purple-500 text-white">Host</Badge>
                              )}
                            </div>
                          </td>
                          <td className="p-3">{formatMinutes(player.totalPlaytime || 0)}</td>
                          <td className="p-3 text-sm">
                            {player.lastActiveAt
                              ? new Date(player.lastActiveAt).toLocaleString()
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
                            <tr 
                              key={`${player.id}-details`} 
                              className="bg-muted/30"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <td 
                                colSpan={6} 
                                className="p-4"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div 
                                  className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div>
                                    <p className="text-muted-foreground mb-1">Telegram Handle</p>
                                    <div className="flex items-center gap-2 group">
                                      <p className="font-medium">{player.telegramHandle || '-'}</p>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="opacity-70 hover:opacity-100 h-6 w-6 p-0"
                                        onClick={(e) => {
                                          e.preventDefault()
                                          e.stopPropagation()
                                          handleStartEdit(player, 'telegramHandle', player.telegramHandle, e)
                                        }}
                                        onMouseDown={(e) => {
                                          e.preventDefault()
                                          e.stopPropagation()
                                        }}
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground mb-1">Ginza Username</p>
                                    <div className="flex items-center gap-2 group">
                                      <p className="font-medium">{player.ginzaUsername || '-'}</p>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="opacity-70 hover:opacity-100 h-6 w-6 p-0"
                                        onClick={(e) => {
                                          e.preventDefault()
                                          e.stopPropagation()
                                          handleStartEdit(player, 'ginzaUsername', player.ginzaUsername, e)
                                        }}
                                        onMouseDown={(e) => {
                                          e.preventDefault()
                                          e.stopPropagation()
                                        }}
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground mb-1">Country</p>
                                    <div className="flex items-center gap-2 group">
                                      <p className="font-medium">{player.country || '-'}</p>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="opacity-70 hover:opacity-100 h-6 w-6 p-0"
                                        onClick={(e) => {
                                          e.preventDefault()
                                          e.stopPropagation()
                                          handleStartEdit(player, 'country', player.country, e)
                                        }}
                                        onMouseDown={(e) => {
                                          e.preventDefault()
                                          e.stopPropagation()
                                        }}
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                  {renderEditableField('Skill Level', player.skillLevel, player, 'skillLevel')}
                                  {renderEditableField('Churn Risk', player.churnRisk, player, 'churnRisk')}
                                  {renderEditableField('VIP Tier', player.vipTier, player, 'vipTier')}
                                  <div>
                                    <p className="text-muted-foreground mb-1">Status</p>
                                    <div className="flex items-center gap-2 group">
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
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="opacity-70 hover:opacity-100 h-6 w-6 p-0"
                                        onClick={(e) => {
                                          e.preventDefault()
                                          e.stopPropagation()
                                          handleStartEdit(player, 'status', player.status, e)
                                        }}
                                        onMouseDown={(e) => {
                                          e.preventDefault()
                                          e.stopPropagation()
                                        }}
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground mb-1">Is Host</p>
                                    <div className="flex items-center gap-2 group">
                                      <Select
                                        value={player.isAgent ? 'yes' : 'no'}
                                        onValueChange={async (value) => {
                                          const checked = value === 'yes'
                                          try {
                                            const res = await fetch(`/api/players/${player.id}`, {
                                              method: 'PATCH',
                                              headers: { 'Content-Type': 'application/json' },
                                              body: JSON.stringify({ isAgent: checked }),
                                            })
                                            if (res.ok) {
                                              await fetchPlayers()
                                              await fetchAgents() // Refresh hosts list
                                            } else {
                                              const errorText = await res.text()
                                              console.error('Failed to update isAgent:', {
                                                status: res.status,
                                                statusText: res.statusText,
                                                error: errorText,
                                              })
                                              alert(`Failed to update host status (Status: ${res.status})`)
                                            }
                                          } catch (error) {
                                            console.error('Error updating isAgent:', error)
                                            alert('Failed to update host status')
                                          }
                                        }}
                                      >
                                        <SelectTrigger className="w-20">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="yes">Yes</SelectItem>
                                          <SelectItem value="no">No</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground mb-1">Most Active Times (EST)</p>
                                    <p className="font-medium">{player.mostActiveTimes || '-'}</p>
                                  </div>
                                  <div className="col-span-2 md:col-span-4">
                                    <p className="text-muted-foreground mb-1">Notes</p>
                                    <div className="flex items-start gap-2 group">
                                      <p className="font-medium flex-1">{player.notes || '-'}</p>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="opacity-70 hover:opacity-100 h-6 w-6 p-0"
                                        onClick={(e) => {
                                          e.preventDefault()
                                          e.stopPropagation()
                                          handleStartEdit(player, 'notes', player.notes, e)
                                        }}
                                        onMouseDown={(e) => {
                                          e.preventDefault()
                                          e.stopPropagation()
                                        }}
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                      </Fragment>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {editingField}</DialogTitle>
            <DialogDescription>
              Update {editingField} for {editingPlayer?.telegramHandle}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {editingField === 'skillLevel' ? (
              <div className="space-y-2">
                <Label>Skill Level</Label>
                <Select value={dialogEditValue} onValueChange={setDialogEditValue}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AMATEUR">AMATEUR</SelectItem>
                    <SelectItem value="INTERMEDIATE">INTERMEDIATE</SelectItem>
                    <SelectItem value="ADVANCED">ADVANCED</SelectItem>
                    <SelectItem value="PROFESSIONAL">PROFESSIONAL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : editingField === 'churnRisk' ? (
              <div className="space-y-2">
                <Label>Churn Risk</Label>
                <Select value={dialogEditValue} onValueChange={setDialogEditValue}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">LOW</SelectItem>
                    <SelectItem value="MED">MED</SelectItem>
                    <SelectItem value="HIGH">HIGH</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : editingField === 'vipTier' ? (
              <div className="space-y-2">
                <Label>VIP Tier</Label>
                <Select value={dialogEditValue} onValueChange={setDialogEditValue}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BRONZE">BRONZE</SelectItem>
                    <SelectItem value="SILVER">SILVER</SelectItem>
                    <SelectItem value="GOLD">GOLD</SelectItem>
                    <SelectItem value="PLATINUM">PLATINUM</SelectItem>
                    <SelectItem value="DIAMOND">DIAMOND</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : editingField === 'status' ? (
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={dialogEditValue} onValueChange={setDialogEditValue}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                    <SelectItem value="FADING">FADING</SelectItem>
                    <SelectItem value="CHURNED">CHURNED</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : editingField === 'notes' ? (
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={dialogEditValue || ''}
                  onChange={(e) => setDialogEditValue(e.target.value)}
                  maxLength={40}
                  className="min-h-20"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>{editingField}</Label>
                <Input
                  value={dialogEditValue || ''}
                  onChange={(e) => setDialogEditValue(e.target.value)}
                  maxLength={40}
                  autoFocus
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveDialogEdit} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
