'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { formatMinutes } from '@/lib/playtime-utils'
import { format, parse, differenceInMinutes } from 'date-fns'
import { Pencil, Check, X } from 'lucide-react'

type PlaytimeEntry = {
  id: string
  playedOn: string
  startTime: string | null
  endTime: string | null
  minutes: number
}

type PlaytimeSummary = {
  last7DaysMinutes: number
  last30DaysMinutes: number
  thisMonthMinutes: number
  lifetimeMinutes: number
}

type PlaytimeSeriesPoint = {
  period: string
  minutes: number
}

type Granularity = 'daily' | 'weekly' | 'monthly'

export default function PlaytimeSection({ playerId }: { playerId: string }) {
  const [entries, setEntries] = useState<PlaytimeEntry[]>([])
  const [summary, setSummary] = useState<PlaytimeSummary | null>(null)
  const [series, setSeries] = useState<PlaytimeSeriesPoint[]>([])
  const [granularity, setGranularity] = useState<Granularity>('daily')
  const [loading, setLoading] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<PlaytimeEntry | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null)

  // Form state
  const [formDate, setFormDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [formStartTime, setFormStartTime] = useState('')
  const [formEndTime, setFormEndTime] = useState('')
  const [formMinutes, setFormMinutes] = useState('')
  const [editFormDate, setEditFormDate] = useState('')
  const [editFormStartTime, setEditFormStartTime] = useState('')
  const [editFormEndTime, setEditFormEndTime] = useState('')
  const [editFormMinutes, setEditFormMinutes] = useState('')
  const [editingCell, setEditingCell] = useState<{ entryId: string; field: string } | null>(null)
  const [inlineEditValues, setInlineEditValues] = useState<Record<string, any>>({})
  const [savingInline, setSavingInline] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [entriesRes, summaryRes, seriesRes] = await Promise.all([
        fetch(`/api/players/${playerId}/playtime`),
        fetch(`/api/players/${playerId}/playtime/summary`),
        fetch(`/api/players/${playerId}/playtime/series?granularity=${granularity}`),
      ])

      const entriesData = await entriesRes.json()
      const summaryData = await summaryRes.json()
      const seriesData = await seriesRes.json()

      setEntries(entriesData)
      setSummary(summaryData)
      setSeries(seriesData)
    } catch (error) {
      console.error('Error loading playtime data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [playerId, granularity])

  const calculateMinutesFromTimes = (date: string, startTime: string, endTime: string): number => {
    if (!date || !startTime || !endTime) return 0
    try {
      const startDateTime = parse(`${date} ${startTime}`, 'yyyy-MM-dd HH:mm', new Date())
      let endDateTime = parse(`${date} ${endTime}`, 'yyyy-MM-dd HH:mm', new Date())
      
      // Handle next day (e.g., 11:30pm to 12:30am)
      if (endDateTime < startDateTime) {
        endDateTime = new Date(endDateTime.getTime() + 24 * 60 * 60 * 1000)
      }
      
      return Math.max(0, differenceInMinutes(endDateTime, startDateTime))
    } catch (error) {
      console.error("Error calculating minutes:", error)
      return 0
    }
  }

  const calculatedFormMinutes = useMemo(() => {
    return calculateMinutesFromTimes(formDate, formStartTime, formEndTime)
  }, [formDate, formStartTime, formEndTime])

  const calculatedEditFormMinutes = useMemo(() => {
    return calculateMinutesFromTimes(editFormDate, editFormStartTime, editFormEndTime)
  }, [editFormDate, editFormStartTime, editFormEndTime])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      // Calculate minutes from start/end time if provided, otherwise use manual minutes
      let minutes = 0
      let startTime: string | undefined = undefined
      let endTime: string | undefined = undefined

      if (formStartTime && formEndTime) {
        minutes = calculatedFormMinutes
        startTime = formStartTime // Send as HH:mm format
        endTime = formEndTime     // Send as HH:mm format
      } else if (formMinutes) {
        minutes = parseInt(formMinutes)
      } else {
        alert('Please provide either start/end time or minutes')
        setLoading(false)
        return
      }

      const res = await fetch(`/api/players/${playerId}/playtime`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playedOn: formDate,
          startTime,
          endTime,
          minutes,
        }),
      })

      if (res.ok) {
        setFormDate(format(new Date(), 'yyyy-MM-dd'))
        setFormStartTime('')
        setFormEndTime('')
        setFormMinutes('')
        loadData()
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to save entry')
      }
    } catch (error) {
      console.error('Error saving entry:', error)
      alert('Failed to save entry')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (entry: PlaytimeEntry) => {
    setEditingEntry(entry)
    setEditFormDate(format(new Date(entry.playedOn), 'yyyy-MM-dd'))
    setEditFormStartTime(entry.startTime || '')
    setEditFormEndTime(entry.endTime || '')
    setEditFormMinutes(entry.minutes.toString())
    setEditDialogOpen(true)
  }

  const handleUpdate = async () => {
    if (!editingEntry) return

    setLoading(true)
    try {
      // Calculate minutes from start/end time if provided, otherwise use manual minutes
      let minutes = 0
      let startTime: string | undefined = undefined
      let endTime: string | undefined = undefined

      if (editFormStartTime && editFormEndTime) {
        // Calculate minutes from HH:mm times
        const startDateTime = parse(`${editFormDate} ${editFormStartTime}`, 'yyyy-MM-dd HH:mm', new Date())
        let endDateTime = parse(`${editFormDate} ${editFormEndTime}`, 'yyyy-MM-dd HH:mm', new Date())
        
        // Handle next day (e.g., 11:30pm to 12:30am)
        if (endDateTime < startDateTime) {
          endDateTime = new Date(endDateTime.getTime() + 24 * 60 * 60 * 1000)
        }
        
        minutes = differenceInMinutes(endDateTime, startDateTime)
        startTime = editFormStartTime // Send as HH:mm format
        endTime = editFormEndTime     // Send as HH:mm format
      } else if (editFormMinutes) {
        minutes = parseInt(editFormMinutes)
      } else {
        alert('Please provide either start/end time or minutes')
        setLoading(false)
        return
      }

      const res = await fetch(`/api/playtime/${editingEntry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playedOn: editFormDate,
          startTime,
          endTime,
          minutes,
        }),
      })

      if (res.ok) {
        setEditDialogOpen(false)
        setEditingEntry(null)
        loadData()
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to update entry')
      }
    } catch (error) {
      console.error('Error updating entry:', error)
      alert('Failed to update entry')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = (entryId: string) => {
    setDeletingEntryId(entryId)
    setDeleteConfirmOpen(true)
  }

  const confirmDelete = async () => {
    if (!deletingEntryId) return

    setLoading(true)
    try {
      const res = await fetch(`/api/playtime/${deletingEntryId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setDeleteConfirmOpen(false)
        setDeletingEntryId(null)
        loadData()
      } else {
        alert('Failed to delete entry')
      }
    } catch (error) {
      console.error('Error deleting entry:', error)
      alert('Failed to delete entry')
    } finally {
      setLoading(false)
    }
  }

  const handleStartInlineEdit = (entryId: string, field: string, currentValue: any) => {
    setEditingCell({ entryId, field })
    setInlineEditValues({ [field]: currentValue })
  }

  const handleCancelInlineEdit = () => {
    setEditingCell(null)
    setInlineEditValues({})
  }

  const handleSaveInlineEdit = async (entryId: string) => {
    if (!editingCell) return
    
    setSavingInline(true)
    try {
      const updateData: any = {}
      Object.keys(inlineEditValues).forEach(key => {
        if (inlineEditValues[key] !== undefined) {
          updateData[key] = inlineEditValues[key]
        }
      })

      // If startTime and endTime are both provided, calculate minutes
      if (updateData.startTime && updateData.endTime && !updateData.minutes) {
        const entry = entries.find(e => e.id === entryId)
        if (entry) {
          const dateStr = updateData.playedOn || format(new Date(entry.playedOn), 'yyyy-MM-dd')
          const startDateTime = parse(`${dateStr} ${updateData.startTime}`, 'yyyy-MM-dd HH:mm', new Date())
          let endDateTime = parse(`${dateStr} ${updateData.endTime}`, 'yyyy-MM-dd HH:mm', new Date())
          
          if (endDateTime < startDateTime) {
            endDateTime = new Date(endDateTime.getTime() + 24 * 60 * 60 * 1000)
          }
          
          updateData.minutes = Math.max(0, differenceInMinutes(endDateTime, startDateTime))
        }
      }

      const res = await fetch(`/api/playtime/${entryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })

      if (!res.ok) {
        throw new Error('Failed to update entry')
      }

      await loadData()
      setEditingCell(null)
      setInlineEditValues({})
    } catch (error) {
      console.error('Error saving inline edit:', error)
      alert('Failed to save changes')
    } finally {
      setSavingInline(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Last 7 Days</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatMinutes(summary.last7DaysMinutes)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Last 30 Days</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatMinutes(summary.last30DaysMinutes)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatMinutes(summary.thisMonthMinutes)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Lifetime</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatMinutes(summary.lifetimeMinutes)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Entry Form */}
      <Card>
        <CardHeader>
          <CardTitle>Log Playtime Entry</CardTitle>
          <CardDescription>Record playtime with date and time, or enter minutes manually</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formStartTime}
                  onChange={(e) => setFormStartTime(e.target.value)}
                  placeholder="HH:MM"
                />
              </div>
              <div>
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formEndTime}
                  onChange={(e) => setFormEndTime(e.target.value)}
                  placeholder="HH:MM"
                />
              </div>
              <div>
                <Label htmlFor="minutes">Or Minutes (manual)</Label>
                <Input
                  id="minutes"
                  type="number"
                  min="0"
                  value={formMinutes}
                  onChange={(e) => setFormMinutes(e.target.value)}
                  placeholder="120"
                />
              </div>
            </div>
            {(formStartTime && formEndTime) && calculatedFormMinutes > 0 && (
              <div className="text-sm text-muted-foreground">
                Calculated: {formatMinutes(calculatedFormMinutes)}
              </div>
            )}
            <div className="flex justify-end">
              <Button type="submit" disabled={loading || (!formStartTime && !formEndTime && !formMinutes)}>
                {loading ? 'Adding...' : 'Add Entry'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Playtime Over Time</CardTitle>
              <CardDescription>Track playtime trends</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant={granularity === 'daily' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setGranularity('daily')}
              >
                Daily
              </Button>
              <Button
                variant={granularity === 'weekly' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setGranularity('weekly')}
              >
                Weekly
              </Button>
              <Button
                variant={granularity === 'monthly' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setGranularity('monthly')}
              >
                Monthly
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {series.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={series}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="minutes" stroke="#8884d8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Entries Table */}
      <Card>
        <CardHeader>
          <CardTitle>Playtime Entries</CardTitle>
          <CardDescription>All recorded playtime entries</CardDescription>
        </CardHeader>
        <CardContent>
          {loading && entries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : entries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No entries yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Start Time</th>
                    <th className="text-left p-2">End Time</th>
                    <th className="text-left p-2">Minutes</th>
                    <th className="text-left p-2">Hours:Minutes</th>
                    <th className="text-right p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => {
                    const isEditingDate = editingCell?.entryId === entry.id && editingCell?.field === 'playedOn'
                    const isEditingStartTime = editingCell?.entryId === entry.id && editingCell?.field === 'startTime'
                    const isEditingEndTime = editingCell?.entryId === entry.id && editingCell?.field === 'endTime'
                    const isEditingMinutes = editingCell?.entryId === entry.id && editingCell?.field === 'minutes'

                    return (
                      <tr key={entry.id} className="border-b">
                        <td className="p-2">
                          {isEditingDate ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type="date"
                                value={inlineEditValues.playedOn ?? format(new Date(entry.playedOn), 'yyyy-MM-dd')}
                                onChange={(e) => setInlineEditValues({ ...inlineEditValues, playedOn: e.target.value })}
                                className="h-8"
                                autoFocus
                              />
                              <Button size="sm" variant="ghost" onClick={() => handleSaveInlineEdit(entry.id)} disabled={savingInline}>
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={handleCancelInlineEdit}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 group">
                              <span>{format(new Date(entry.playedOn), 'MMM dd, yyyy')}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                                onClick={() => handleStartInlineEdit(entry.id, 'playedOn', format(new Date(entry.playedOn), 'yyyy-MM-dd'))}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </td>
                        <td className="p-2">
                          {isEditingStartTime ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type="time"
                                value={(inlineEditValues.startTime ?? entry.startTime) || ''}
                                onChange={(e) => setInlineEditValues({ ...inlineEditValues, startTime: e.target.value || null })}
                                className="h-8"
                                autoFocus
                              />
                              <Button size="sm" variant="ghost" onClick={() => handleSaveInlineEdit(entry.id)} disabled={savingInline}>
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={handleCancelInlineEdit}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 group">
                              <span>{entry.startTime || '-'}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                                onClick={() => handleStartInlineEdit(entry.id, 'startTime', entry.startTime)}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </td>
                        <td className="p-2">
                          {isEditingEndTime ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type="time"
                                value={(inlineEditValues.endTime ?? entry.endTime) || ''}
                                onChange={(e) => setInlineEditValues({ ...inlineEditValues, endTime: e.target.value || null })}
                                className="h-8"
                                autoFocus
                              />
                              <Button size="sm" variant="ghost" onClick={() => handleSaveInlineEdit(entry.id)} disabled={savingInline}>
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={handleCancelInlineEdit}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 group">
                              <span>{entry.endTime || '-'}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                                onClick={() => handleStartInlineEdit(entry.id, 'endTime', entry.endTime)}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </td>
                        <td className="p-2">
                          {isEditingMinutes ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                value={inlineEditValues.minutes ?? entry.minutes}
                                onChange={(e) => setInlineEditValues({ ...inlineEditValues, minutes: parseInt(e.target.value) || 0 })}
                                className="h-8 w-20"
                                autoFocus
                              />
                              <Button size="sm" variant="ghost" onClick={() => handleSaveInlineEdit(entry.id)} disabled={savingInline}>
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={handleCancelInlineEdit}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 group">
                              <span>{entry.minutes}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                                onClick={() => handleStartInlineEdit(entry.id, 'minutes', entry.minutes)}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </td>
                        <td className="p-2">{formatMinutes(entry.minutes)}</td>
                        <td className="p-2 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(entry.id)}
                            className="text-red-600"
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Playtime Entry</DialogTitle>
            <DialogDescription>Update the date, time, and minutes for this entry</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-date">Date</Label>
              <Input
                id="edit-date"
                type="date"
                value={editFormDate}
                onChange={(e) => setEditFormDate(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-start-time">Start Time</Label>
                <Input
                  id="edit-start-time"
                  type="time"
                  value={editFormStartTime}
                  onChange={(e) => setEditFormStartTime(e.target.value)}
                  placeholder="HH:MM"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-end-time">End Time</Label>
                <Input
                  id="edit-end-time"
                  type="time"
                  value={editFormEndTime}
                  onChange={(e) => setEditFormEndTime(e.target.value)}
                  placeholder="HH:MM"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-minutes">Or Minutes (manual)</Label>
              <Input
                id="edit-minutes"
                type="number"
                min="0"
                value={editFormMinutes}
                onChange={(e) => setEditFormMinutes(e.target.value)}
                placeholder="120"
              />
            </div>
            {(editFormStartTime && editFormEndTime) && calculatedEditFormMinutes > 0 && (
              <div className="text-sm text-muted-foreground">
                Calculated: {formatMinutes(calculatedEditFormMinutes)}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={loading}>
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Entry</DialogTitle>
            <DialogDescription>Are you sure you want to delete this playtime entry? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={loading}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}






