'use client'

import { useState, useEffect } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import Link from 'next/link'
import { Agent } from '@prisma/client'
import { Pencil, Check, X } from 'lucide-react'

type AgentWithMetrics = Agent & {
  player?: {
    lastActiveAt: Date | null
  }
  metrics?: {
    totalPlayers: number
    lastActive: Date | null
  }
}

type EditingCell = {
  rowId: string
  field: string
}

export default function AgentsTable() {
  const [agents, setAgents] = useState<AgentWithMetrics[]>([])
  const [loading, setLoading] = useState(true)
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null)
  const [editValues, setEditValues] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)

  // Ensure agents is always an array (defensive check)
  const safeAgents = Array.isArray(agents) ? agents : []

  useEffect(() => {
    fetchAgents()
  }, [])

  // Safety check: ensure agents is always an array
  useEffect(() => {
    if (!Array.isArray(agents)) {
      console.error('Agents state is not an array, resetting to empty array:', agents)
      setAgents([])
    }
  }, [agents])

  const fetchAgents = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/agents')
      if (!res.ok) {
        console.error('Failed to fetch agents:', res.status, res.statusText)
        setAgents([])
        return
      }
      const data = await res.json()
      // Ensure data is always an array
      if (Array.isArray(data)) {
        setAgents(data)
      } else {
        console.error('API returned non-array data:', data)
        setAgents([])
      }
    } catch (error) {
      console.error('Error fetching agents:', error)
      setAgents([]) // Set to empty array on error
    } finally {
      setLoading(false)
    }
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

      const res = await fetch(`/api/agents/${rowId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })

      if (!res.ok) {
        throw new Error('Failed to update agent')
      }

      await fetchAgents()
      setEditingCell(null)
      setEditValues({})
    } catch (error) {
      console.error('Error saving edit:', error)
      alert('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="border rounded-lg">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="px-4 py-2 text-left font-medium">Name</th>
            <th className="px-4 py-2 text-left font-medium">Telegram</th>
            <th className="px-4 py-2 text-left font-medium">Ginza Username</th>
            <th className="px-4 py-2 text-left font-medium">Status</th>
            <th className="px-4 py-2 text-left font-medium">Timezone</th>
            <th className="px-4 py-2 text-left font-medium">Notes</th>
            <th className="px-4 py-2 text-left font-medium">Referred Players</th>
            <th className="px-4 py-2 text-left font-medium">Last Active</th>
          </tr>
        </thead>
        <tbody>
          {safeAgents.map((agent) => {
            const isEditingName = editingCell?.rowId === agent.id && editingCell?.field === 'name'
            const isEditingTelegram = editingCell?.rowId === agent.id && editingCell?.field === 'telegramHandle'
            const isEditingGinza = editingCell?.rowId === agent.id && editingCell?.field === 'ginzaUsername'
            const isEditingStatus = editingCell?.rowId === agent.id && editingCell?.field === 'status'
            const isEditingTimezone = editingCell?.rowId === agent.id && editingCell?.field === 'timezone'
            const isEditingNotes = editingCell?.rowId === agent.id && editingCell?.field === 'notes'

            return (
              <tr key={agent.id} className="border-b hover:bg-muted/50">
                <td className="px-4 py-2">
                  {isEditingName ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editValues.name ?? agent.name}
                        onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                        className="h-8"
                        autoFocus
                      />
                      <Button size="sm" variant="ghost" onClick={() => handleSaveEdit(agent.id)} disabled={saving}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 group">
                      <Link href={`/agents/${agent.id}`} className="hover:underline font-medium">
                        {agent.name}
                      </Link>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                        onClick={() => handleStartEdit(agent.id, 'name', agent.name)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </td>
                <td className="px-4 py-2">
                  {isEditingTelegram ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editValues.telegramHandle ?? agent.telegramHandle}
                        onChange={(e) => setEditValues({ ...editValues, telegramHandle: e.target.value })}
                        className="h-8"
                        autoFocus
                      />
                      <Button size="sm" variant="ghost" onClick={() => handleSaveEdit(agent.id)} disabled={saving}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 group">
                      <span>{agent.telegramHandle}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                        onClick={() => handleStartEdit(agent.id, 'telegramHandle', agent.telegramHandle)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </td>
                <td className="px-4 py-2">
                  {isEditingGinza ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={(editValues.ginzaUsername ?? agent.ginzaUsername) || ''}
                        onChange={(e) => setEditValues({ ...editValues, ginzaUsername: e.target.value || null })}
                        className="h-8"
                        autoFocus
                      />
                      <Button size="sm" variant="ghost" onClick={() => handleSaveEdit(agent.id)} disabled={saving}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 group">
                      <span>{agent.ginzaUsername || '-'}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                        onClick={() => handleStartEdit(agent.id, 'ginzaUsername', agent.ginzaUsername)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </td>
                <td className="px-4 py-2">
                  {isEditingStatus ? (
                    <div className="flex items-center gap-2">
                      <Select
                        value={editValues.status ?? agent.status}
                        onValueChange={(value) => setEditValues({ ...editValues, status: value })}
                      >
                        <SelectTrigger className="h-8 w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                          <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                          <SelectItem value="APPROACHING">APPROACHING</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant="ghost" onClick={() => handleSaveEdit(agent.id)} disabled={saving}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 group">
                      <Badge variant={
                        agent.status === 'ACTIVE' ? 'default' : 
                        agent.status === 'INACTIVE' ? 'destructive' : 
                        agent.status === 'APPROACHING' ? 'secondary' : 
                        'secondary'
                      }>
                        {agent.status}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                        onClick={() => handleStartEdit(agent.id, 'status', agent.status)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </td>
                <td className="px-4 py-2">
                  {isEditingTimezone ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={(editValues.timezone ?? agent.timezone) || ''}
                        onChange={(e) => setEditValues({ ...editValues, timezone: e.target.value || null })}
                        className="h-8 w-32"
                        placeholder="e.g., EST, PST"
                        autoFocus
                      />
                      <Button size="sm" variant="ghost" onClick={() => handleSaveEdit(agent.id)} disabled={saving}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 group">
                      <span className="text-sm">{agent.timezone || '-'}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                        onClick={() => handleStartEdit(agent.id, 'timezone', agent.timezone)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </td>
                <td className="px-4 py-2 max-w-xs">
                  {isEditingNotes ? (
                    <div className="flex items-start gap-2">
                      <Textarea
                        value={(editValues.notes ?? agent.notes) || ''}
                        onChange={(e) => setEditValues({ ...editValues, notes: e.target.value || null })}
                        className="h-16 min-w-[200px]"
                        autoFocus
                      />
                      <div className="flex flex-col gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleSaveEdit(agent.id)} disabled={saving}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 group">
                      <span className="text-sm truncate max-w-[200px]">{agent.notes || '-'}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                        onClick={() => handleStartEdit(agent.id, 'notes', agent.notes)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </td>
                <td className="px-4 py-2">{agent.metrics?.totalPlayers || 0}</td>
                <td className="px-4 py-2">
                  {agent.metrics?.lastActive 
                    ? new Date(agent.metrics.lastActive).toLocaleString()
                    : 'Never'
                  }
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {safeAgents.length === 0 && (
        <div className="p-8 text-center text-muted-foreground">No hosts found</div>
      )}
    </div>
  )
}

