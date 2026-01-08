'use client'

import { useState, useEffect } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
} from '@tanstack/react-table'
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
import { Player, Runner, Agent } from '@prisma/client'
import { Pencil, Check, X } from 'lucide-react'
import { formatMinutes } from '@/lib/playtime-utils'
import { Textarea } from '@/components/ui/textarea'

type PlayerWithRelations = Player & {
  assignedRunner: Runner | null
  referredByAgent: Agent | null
  mostActiveTimes?: string
  totalPlaytime?: number
}

const columnHelper = createColumnHelper<PlayerWithRelations>()

type EditingCell = {
  rowId: string
  field: string
}

export default function PlayersTable() {
  const [players, setPlayers] = useState<PlayerWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [sorting, setSorting] = useState<SortingState>([{ id: 'lastActiveAt', desc: true }])
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
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null)
  const [editValues, setEditValues] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchPlayers()
    fetchRunners()
    fetchAgents()
  }, [filters, sorting])

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
      if (sorting[0]) {
        params.append('sortBy', sorting[0].id)
        params.append('sortOrder', sorting[0].desc ? 'desc' : 'asc')
      }

      const res = await fetch(`/api/players?${params}`)
      const data = await res.json()
      setPlayers(data)
    } catch (error) {
      console.error('Error fetching players:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRunners = async () => {
    const res = await fetch('/api/runners')
    const data = await res.json()
    setRunners(data)
  }

  const fetchAgents = async () => {
    const res = await fetch('/api/agents')
    const data = await res.json()
    setAgents(data)
  }

  const handleStartEdit = (rowId: string, field: string, currentValue: any) => {
    setEditingCell({ rowId, field })
    setEditValues({ [field]: currentValue })
  }

  const handleCancelEdit = () => {
    setEditingCell(null)
    setEditValues({})
  }

  const handleSaveEdit = async (rowId: string) => {
    if (!editingCell) return
    
    setSaving(true)
    try {
      const updateData: any = {}
      Object.keys(editValues).forEach(key => {
        if (editValues[key] !== undefined) {
          updateData[key] = editValues[key]
        }
      })

      const res = await fetch(`/api/players/${rowId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })

      if (!res.ok) {
        throw new Error('Failed to update player')
      }

      await fetchPlayers()
      setEditingCell(null)
      setEditValues({})
    } catch (error) {
      console.error('Error saving edit:', error)
      alert('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    columnHelper.accessor('telegramHandle', {
      header: 'Telegram',
      cell: (info) => {
        const rowId = info.row.original.id
        const isEditing = editingCell?.rowId === rowId && editingCell?.field === 'telegramHandle'
        const value = info.getValue()

        if (isEditing) {
          return (
            <div className="flex items-center gap-2">
              <Input
                value={editValues.telegramHandle ?? value}
                onChange={(e) => setEditValues({ ...editValues, telegramHandle: e.target.value })}
                className="h-8"
                autoFocus
              />
              <Button size="sm" variant="ghost" onClick={() => handleSaveEdit(rowId)} disabled={saving}>
                <Check className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )
        }

        return (
          <div className="flex items-center gap-2 group">
            <Link href={`/players/${rowId}`} className="hover:underline">
              {value}
            </Link>
            <Button
              size="sm"
              variant="ghost"
              className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
              onClick={() => handleStartEdit(rowId, 'telegramHandle', value)}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          </div>
        )
      },
    }),
    columnHelper.accessor('ginzaUsername', {
      header: 'Ginza Username',
      cell: (info) => {
        const rowId = info.row.original.id
        const isEditing = editingCell?.rowId === rowId && editingCell?.field === 'ginzaUsername'
        const value = info.getValue() || ''

        if (isEditing) {
          return (
            <div className="flex items-center gap-2">
              <Input
                value={editValues.ginzaUsername ?? value}
                onChange={(e) => setEditValues({ ...editValues, ginzaUsername: e.target.value || null })}
                className="h-8"
                autoFocus
              />
              <Button size="sm" variant="ghost" onClick={() => handleSaveEdit(rowId)} disabled={saving}>
                <Check className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )
        }

        return (
          <div className="flex items-center gap-2 group">
            <span>{value || '-'}</span>
            <Button
              size="sm"
              variant="ghost"
              className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
              onClick={() => handleStartEdit(rowId, 'ginzaUsername', value)}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          </div>
        )
      },
    }),
    columnHelper.accessor('playerType', {
      header: 'Type',
      cell: (info) => {
        const rowId = info.row.original.id
        const isEditing = editingCell?.rowId === rowId && editingCell?.field === 'playerType'
        const type = info.getValue() || 'PLAYER'
        const colors: Record<string, string> = {
          PLAYER: 'bg-blue-500',
          RUNNER: 'bg-green-500',
          AGENT: 'bg-purple-500',
        }

        if (isEditing) {
          return (
            <div className="flex items-center gap-2">
              <Select
                value={editValues.playerType ?? type}
                onValueChange={(val) => setEditValues({ ...editValues, playerType: val })}
              >
                <SelectTrigger className="h-8 w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PLAYER">Player</SelectItem>
                  <SelectItem value="RUNNER">Runner</SelectItem>
                  <SelectItem value="AGENT">Agent</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" variant="ghost" onClick={() => handleSaveEdit(rowId)} disabled={saving}>
                <Check className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )
        }

        return (
          <div className="flex items-center gap-2 group">
            <Badge className={colors[type] || 'bg-gray-500'}>
              {type}
            </Badge>
            <Button
              size="sm"
              variant="ghost"
              className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
              onClick={() => handleStartEdit(rowId, 'playerType', type)}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          </div>
        )
      },
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: (info) => {
        const rowId = info.row.original.id
        const isEditing = editingCell?.rowId === rowId && editingCell?.field === 'status'
        const value = info.getValue()

        if (isEditing) {
          return (
            <div className="flex items-center gap-2">
              <Select
                value={editValues.status ?? value}
                onValueChange={(val) => setEditValues({ ...editValues, status: val })}
              >
                <SelectTrigger className="h-8 w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="FADING">Fading</SelectItem>
                  <SelectItem value="CHURNED">Churned</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" variant="ghost" onClick={() => handleSaveEdit(rowId)} disabled={saving}>
                <Check className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )
        }

        return (
          <div className="flex items-center gap-2 group">
            <Badge variant={value === 'ACTIVE' ? 'default' : 'secondary'}>{value}</Badge>
            <Button
              size="sm"
              variant="ghost"
              className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
              onClick={() => handleStartEdit(rowId, 'status', value)}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          </div>
        )
      },
    }),
    columnHelper.accessor('churnRisk', {
      header: 'Churn Risk',
      cell: (info) => {
        const rowId = info.row.original.id
        const isEditing = editingCell?.rowId === rowId && editingCell?.field === 'churnRisk'
        const risk = info.getValue()

        if (isEditing) {
          return (
            <div className="flex items-center gap-2">
              <Select
                value={editValues.churnRisk ?? risk}
                onValueChange={(val) => setEditValues({ ...editValues, churnRisk: val })}
              >
                <SelectTrigger className="h-8 w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MED">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" variant="ghost" onClick={() => handleSaveEdit(rowId)} disabled={saving}>
                <Check className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )
        }

        return (
          <div className="flex items-center gap-2 group">
            <Badge variant={risk === 'HIGH' ? 'destructive' : risk === 'MED' ? 'secondary' : 'default'}>
              {risk}
            </Badge>
            <Button
              size="sm"
              variant="ghost"
              className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
              onClick={() => handleStartEdit(rowId, 'churnRisk', risk)}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          </div>
        )
      },
    }),
    columnHelper.accessor('skillLevel', {
      header: 'Skill Level',
      cell: (info) => {
        const rowId = info.row.original.id
        const isEditing = editingCell?.rowId === rowId && editingCell?.field === 'skillLevel'
        const level = info.getValue() || 'AMATEUR'
        const colors: Record<string, string> = {
          WHALE: 'bg-purple-500',
          PRO: 'bg-blue-500',
          NIT: 'bg-green-500',
          AMATEUR: 'bg-yellow-500',
          PUNTER: 'bg-gray-500',
        }

        if (isEditing) {
          return (
            <div className="flex items-center gap-2">
              <Select
                value={editValues.skillLevel ?? level}
                onValueChange={(val) => setEditValues({ ...editValues, skillLevel: val })}
              >
                <SelectTrigger className="h-8 w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WHALE">Whale</SelectItem>
                  <SelectItem value="PRO">Pro</SelectItem>
                  <SelectItem value="NIT">Nit</SelectItem>
                  <SelectItem value="AMATEUR">Amateur</SelectItem>
                  <SelectItem value="PUNTER">Punter</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" variant="ghost" onClick={() => handleSaveEdit(rowId)} disabled={saving}>
                <Check className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )
        }

        return (
          <div className="flex items-center gap-2 group">
            <Badge className={colors[level] || 'bg-gray-500'}>
              {level}
            </Badge>
            <Button
              size="sm"
              variant="ghost"
              className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
              onClick={() => handleStartEdit(rowId, 'skillLevel', level)}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          </div>
        )
      },
    }),
    columnHelper.accessor('country', {
      header: 'Country',
      cell: (info) => {
        const rowId = info.row.original.id
        const isEditing = editingCell?.rowId === rowId && editingCell?.field === 'country'
        const value = info.getValue() || ''

        if (isEditing) {
          return (
            <div className="flex items-center gap-2">
              <Input
                value={editValues.country ?? value}
                onChange={(e) => setEditValues({ ...editValues, country: e.target.value || null })}
                className="h-8"
                autoFocus
              />
              <Button size="sm" variant="ghost" onClick={() => handleSaveEdit(rowId)} disabled={saving}>
                <Check className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )
        }

        return (
          <div className="flex items-center gap-2 group">
            <span>{value || '-'}</span>
            <Button
              size="sm"
              variant="ghost"
              className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
              onClick={() => handleStartEdit(rowId, 'country', value)}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          </div>
        )
      },
    }),
    columnHelper.accessor('lastActiveAt', {
      header: 'Last Active',
      cell: (info) => {
        const rowId = info.row.original.id
        const isEditing = editingCell?.rowId === rowId && editingCell?.field === 'lastActiveAt'
        const date = info.getValue()
        const dateStr = date ? new Date(date).toISOString().split('T')[0] : ''

        if (isEditing) {
          return (
            <div className="flex items-center gap-2">
              <Input
                type="datetime-local"
                value={editValues.lastActiveAt ?? (date ? new Date(date).toISOString().slice(0, 16) : '')}
                onChange={(e) => setEditValues({ ...editValues, lastActiveAt: e.target.value ? new Date(e.target.value).toISOString() : null })}
                className="h-8"
                autoFocus
              />
              <Button size="sm" variant="ghost" onClick={() => handleSaveEdit(rowId)} disabled={saving}>
                <Check className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )
        }

        return (
          <div className="flex items-center gap-2 group">
            <span className="text-sm">
              {date 
                ? `${new Date(date).toLocaleDateString()} ${new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : 'Never'}
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
              onClick={() => handleStartEdit(rowId, 'lastActiveAt', date)}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          </div>
        )
      },
    }),
    columnHelper.display({
      id: 'mostActiveTimes',
      header: 'Most Active Times (EST)',
      cell: (info) => {
        const rowId = info.row.original.id
        const isEditing = editingCell?.rowId === rowId && editingCell?.field === 'mostActiveTimes'
        const times = info.row.original.mostActiveTimes || '-'

        if (isEditing) {
          return (
            <div className="flex items-center gap-2">
              <Input
                value={editValues.mostActiveTimes ?? times}
                onChange={(e) => setEditValues({ ...editValues, mostActiveTimes: e.target.value })}
                className="h-8 min-w-[200px]"
                placeholder="e.g., 2pm-4pm, 6pm-8pm"
                autoFocus
              />
              <Button size="sm" variant="ghost" onClick={() => handleSaveEdit(rowId)} disabled={saving}>
                <Check className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )
        }

        return (
          <div className="flex items-center gap-2 group">
            <span className="text-sm">{times}</span>
            <Button
              size="sm"
              variant="ghost"
              className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
              onClick={() => handleStartEdit(rowId, 'mostActiveTimes', times)}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          </div>
        )
      },
    }),
    columnHelper.display({
      id: 'totalPlaytime',
      header: 'Total Playtime',
      cell: (info) => {
        const rowId = info.row.original.id
        const isEditing = editingCell?.rowId === rowId && editingCell?.field === 'totalPlaytime'
        const minutes = info.row.original.totalPlaytime || 0

        if (isEditing) {
          return (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={editValues.totalPlaytime ?? minutes}
                onChange={(e) => setEditValues({ ...editValues, totalPlaytime: parseInt(e.target.value) || 0 })}
                className="h-8 w-24"
                placeholder="Minutes"
                autoFocus
              />
              <Button size="sm" variant="ghost" onClick={() => handleSaveEdit(rowId)} disabled={saving}>
                <Check className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )
        }

        return (
          <div className="flex items-center gap-2 group">
            <span className="text-sm">{formatMinutes(minutes)}</span>
            <Button
              size="sm"
              variant="ghost"
              className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
              onClick={() => handleStartEdit(rowId, 'totalPlaytime', minutes)}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          </div>
        )
      },
    }),
    columnHelper.accessor('assignedRunner', {
      header: 'Runner',
      cell: (info) => {
        const rowId = info.row.original.id
        const isEditing = editingCell?.rowId === rowId && editingCell?.field === 'assignedRunnerId'
        const runner = info.getValue()
        const currentRunnerId = runner?.id || ''

        if (isEditing) {
          return (
            <div className="flex items-center gap-2">
              <Select
                value={editValues.assignedRunnerId ?? currentRunnerId}
                onValueChange={(val) => setEditValues({ ...editValues, assignedRunnerId: val === 'none' ? null : val })}
              >
                <SelectTrigger className="h-8 w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {runners.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" variant="ghost" onClick={() => handleSaveEdit(rowId)} disabled={saving}>
                <Check className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )
        }

        return (
          <div className="flex items-center gap-2 group">
            {runner ? (
              <Link href={`/runners/${runner.id}`} className="hover:underline">
                {runner.name}
              </Link>
            ) : (
              <span>-</span>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
              onClick={() => handleStartEdit(rowId, 'assignedRunnerId', currentRunnerId)}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          </div>
        )
      },
    }),
    columnHelper.accessor('referredByAgent', {
      header: 'Agent',
      cell: (info) => {
        const rowId = info.row.original.id
        const isEditing = editingCell?.rowId === rowId && editingCell?.field === 'referredByAgentId'
        const agent = info.getValue()
        const currentAgentId = agent?.id || ''

        if (isEditing) {
          return (
            <div className="flex items-center gap-2">
              <Select
                value={editValues.referredByAgentId ?? currentAgentId}
                onValueChange={(val) => setEditValues({ ...editValues, referredByAgentId: val === 'none' ? null : val })}
              >
                <SelectTrigger className="h-8 w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {agents.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" variant="ghost" onClick={() => handleSaveEdit(rowId)} disabled={saving}>
                <Check className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )
        }

        return (
          <div className="flex items-center gap-2 group">
            {agent ? (
              <Link href={`/agents/${agent.id}`} className="hover:underline">
                {agent.name}
              </Link>
            ) : (
              <span>-</span>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
              onClick={() => handleStartEdit(rowId, 'referredByAgentId', currentAgentId)}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          </div>
        )
      },
    }),
    columnHelper.accessor('notes', {
      header: 'Notes',
      cell: (info) => {
        const rowId = info.row.original.id
        const isEditing = editingCell?.rowId === rowId && editingCell?.field === 'notes'
        const value = info.getValue() || ''

        if (isEditing) {
          return (
            <div className="flex items-start gap-2">
              <Textarea
                value={editValues.notes ?? value}
                onChange={(e) => setEditValues({ ...editValues, notes: e.target.value || null })}
                className="h-20 min-w-[200px]"
                placeholder="Enter notes..."
                autoFocus
              />
              <div className="flex flex-col gap-1">
                <Button size="sm" variant="ghost" onClick={() => handleSaveEdit(rowId)} disabled={saving}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )
        }

        return (
          <div className="flex items-start gap-2 group">
            <span className="text-sm max-w-[300px] truncate" title={value || undefined}>
              {value || '-'}
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 mt-1"
              onClick={() => handleStartEdit(rowId, 'notes', value)}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          </div>
        )
      },
    }),
  ]

  const table = useReactTable({
    data: players,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
  })

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Input
          placeholder="Search telegram/wallet..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
            <Select value={filters.playerType || "all"} onValueChange={(val) => setFilters({ ...filters, playerType: val === "all" ? "" : val })}>
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
            <Select value={filters.status || "all"} onValueChange={(val) => setFilters({ ...filters, status: val === "all" ? "" : val })}>
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
            <Select value={filters.churnRisk || "all"} onValueChange={(val) => setFilters({ ...filters, churnRisk: val === "all" ? "" : val })}>
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
            <Select value={filters.assignedRunnerId || "all"} onValueChange={(val) => setFilters({ ...filters, assignedRunnerId: val === "all" ? "" : val })}>
              <SelectTrigger>
                <SelectValue placeholder="Runner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Runners</SelectItem>
                {runners.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.referredByAgentId || "all"} onValueChange={(val) => setFilters({ ...filters, referredByAgentId: val === "all" ? "" : val })}>
              <SelectTrigger>
                <SelectValue placeholder="Agent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents</SelectItem>
                {agents.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full min-w-[1400px]">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-2 text-left font-medium cursor-pointer hover:bg-muted"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getIsSorted() && (
                      <span className="ml-2">
                        {header.column.getIsSorted() === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-b hover:bg-muted/50">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-2">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {players.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">No players found</div>
        )}
      </div>
    </div>
  )
}

