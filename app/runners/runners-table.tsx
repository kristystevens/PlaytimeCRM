'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Runner } from '@prisma/client'
import { Pencil, Check, X } from 'lucide-react'

type RunnerWithMetrics = Runner & {
  metrics?: {
    assignedPlayers: number
    lastActive: Date | null
  }
}

type EditingCell = {
  rowId: string
  field: string
}

export default function RunnersTable() {
  const [runners, setRunners] = useState<RunnerWithMetrics[]>([])
  const [loading, setLoading] = useState(true)
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null)
  const [editValues, setEditValues] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchRunners()
  }, [])

  const fetchRunners = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/runners')
      const data = await res.json()
      setRunners(data)
    } catch (error) {
      console.error('Error fetching runners:', error)
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

      const res = await fetch(`/api/runners/${rowId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })

      if (!res.ok) {
        throw new Error('Failed to update runner')
      }

      await fetchRunners()
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
          {runners.map((runner) => {
            const isEditingName = editingCell?.rowId === runner.id && editingCell?.field === 'name'
            const isEditingTelegram = editingCell?.rowId === runner.id && editingCell?.field === 'telegramHandle'
            const isEditingGinza = editingCell?.rowId === runner.id && editingCell?.field === 'ginzaUsername'

            return (
              <tr key={runner.id} className="border-b hover:bg-muted/50">
                <td className="px-4 py-2">
                  {isEditingName ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editValues.name ?? runner.name}
                        onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                        className="h-8"
                        autoFocus
                      />
                      <Button size="sm" variant="ghost" onClick={() => handleSaveEdit(runner.id)} disabled={saving}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 group">
                      <Link href={`/runners/${runner.id}`} className="hover:underline font-medium">
                        {runner.name}
                      </Link>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                        onClick={() => handleStartEdit(runner.id, 'name', runner.name)}
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
                        value={editValues.telegramHandle ?? runner.telegramHandle}
                        onChange={(e) => setEditValues({ ...editValues, telegramHandle: e.target.value })}
                        className="h-8"
                        autoFocus
                      />
                      <Button size="sm" variant="ghost" onClick={() => handleSaveEdit(runner.id)} disabled={saving}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 group">
                      <span>{runner.telegramHandle}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                        onClick={() => handleStartEdit(runner.id, 'telegramHandle', runner.telegramHandle)}
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
                        value={editValues.ginzaUsername ?? runner.ginzaUsername || ''}
                        onChange={(e) => setEditValues({ ...editValues, ginzaUsername: e.target.value || null })}
                        className="h-8"
                        autoFocus
                      />
                      <Button size="sm" variant="ghost" onClick={() => handleSaveEdit(runner.id)} disabled={saving}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 group">
                      <span>{runner.ginzaUsername || '-'}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                        onClick={() => handleStartEdit(runner.id, 'ginzaUsername', runner.ginzaUsername)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </td>
                <td className="px-4 py-2">{runner.metrics?.assignedPlayers || 0}</td>
                <td className="px-4 py-2">
                  {runner.metrics?.lastActive 
                    ? new Date(runner.metrics.lastActive).toLocaleString()
                    : 'Never'
                  }
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {runners.length === 0 && (
        <div className="p-8 text-center text-muted-foreground">No runners found</div>
      )}
    </div>
  )
}

