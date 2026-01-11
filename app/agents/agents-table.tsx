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

  useEffect(() => {
    fetchAgents()
  }, [])

  const fetchAgents = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/agents')
      const data = await res.json()
      setAgents(data)
    } catch (error) {
      console.error('Error fetching agents:', error)
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
            <th className="px-4 py-2 text-left font-medium">Referred Players</th>
            <th className="px-4 py-2 text-left font-medium">Last Active</th>
          </tr>
        </thead>
        <tbody>
          {agents.map((agent) => {
            const isEditingName = editingCell?.rowId === agent.id && editingCell?.field === 'name'
            const isEditingTelegram = editingCell?.rowId === agent.id && editingCell?.field === 'telegramHandle'
            const isEditingGinza = editingCell?.rowId === agent.id && editingCell?.field === 'ginzaUsername'
            const isEditingStatus = editingCell?.rowId === agent.id && editingCell?.field === 'status'

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
      {agents.length === 0 && (
        <div className="p-8 text-center text-muted-foreground">No agents found</div>
      )}
    </div>
  )
}

