'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { capitalizeFirst } from '@/lib/utils'

// Parse time string like "2pm", "2:30 pm", "14:00" into a Date on the given base date (assumed EST)
function parseTimeStringToDate(timeStr: string, baseDate: Date): Date | null {
  if (!timeStr) return null
  const trimmed = timeStr.trim().toLowerCase()
  const match = trimmed.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/)
  if (!match) return null

  let hour = parseInt(match[1], 10)
  const minute = match[2] ? parseInt(match[2], 10) : 0
  const ampm = match[3]

  if (ampm) {
    if (ampm === 'pm' && hour < 12) hour += 12
    if (ampm === 'am' && hour === 12) hour = 0
  }

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null

  const d = new Date(baseDate)
  d.setHours(hour, minute, 0, 0)
  return d
}

// Convert time range string (e.g., "2pm-5pm" or "2pm-5pm, 6pm-7pm") to total minutes
function parseTimeRangesToMinutes(rangeStr: string, baseDate: Date): number {
  if (!rangeStr || !rangeStr.trim()) return 0
  
  // Split by comma to handle multiple ranges
  const ranges = rangeStr.split(',').map(r => r.trim()).filter(r => r)
  let totalMinutes = 0

  for (const range of ranges) {
    const parts = range.split('-')
    if (parts.length < 2) continue

    const start = parseTimeStringToDate(parts[0], baseDate)
    const end = parseTimeStringToDate(parts[1], baseDate)
    if (!start || !end) continue

    let endTime = end
    if (endTime.getTime() <= start.getTime()) {
      // Handle ranges that cross midnight
      endTime = new Date(endTime.getTime() + 24 * 60 * 60 * 1000)
    }

    const diffMs = endTime.getTime() - start.getTime()
    const diffMinutes = Math.max(0, Math.round(diffMs / 60000))
    totalMinutes += diffMinutes
  }

  return totalMinutes
}

// Convert minutes to a simple time range estimate (e.g., "2pm-5pm")
function minutesToTimeRange(minutes: number): string {
  if (!minutes || minutes <= 0) return ''
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  // Return a simple estimate like "2h 30m" or just return empty to let user input their own
  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

type GamePlayer = {
  id: string
  buyIn: number
  cashout: number
  pnl: number
  playtimeMinutes: number
  player: {
    id: string
    telegramHandle: string
    ginzaUsername: string | null
    name: string | null
  }
}

type Game = {
  id: string
  playedAt: string
  host: {
    id: string
    name: string
    telegramHandle: string
  } | null
  gamePlayers: GamePlayer[]
}

export default function GamesTable() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingPlaytimeId, setEditingPlaytimeId] = useState<string | null>(null)
  const [editingPlaytimeValue, setEditingPlaytimeValue] = useState<string>('')
  const [savingPlaytimeId, setSavingPlaytimeId] = useState<string | null>(null)
  const [expandedGameId, setExpandedGameId] = useState<string | null>(null)

  useEffect(() => {
    fetchGames()
  }, [])

  const fetchGames = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/games')
      if (!res.ok) {
        console.error('Failed to fetch games:', res.status)
        setGames([])
        return
      }
      const data = await res.json()
      if (Array.isArray(data)) {
        setGames(data)
        // Open the most recent game (first in the list) by default
        if (data.length > 0 && !expandedGameId) {
          setExpandedGameId(data[0].id)
        }
      } else {
        console.error('Invalid response format:', data)
        setGames([])
      }
    } catch (error) {
      console.error('Error fetching games:', error)
      setGames([])
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteGame = async (gameId: string) => {
    if (!window.confirm('Are you sure you want to delete this game? This cannot be undone.')) {
      return
    }

    setDeletingId(gameId)
    try {
      const res = await fetch(`/api/games/${gameId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        console.error('Failed to delete game:', error)
        alert(error.error || 'Failed to delete game')
        return
      }

      // Remove deleted game from local state
      setGames((prev) => prev.filter((g) => g.id !== gameId))
    } catch (error) {
      console.error('Error deleting game:', error)
      alert('An error occurred while deleting the game')
    } finally {
      setDeletingId(null)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const formatMinutes = (minutes: number) => {
    if (!minutes) return '0m'
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours === 0) return `${mins}m`
    if (mins === 0) return `${hours}h`
    return `${hours}h ${mins}m`
  }

  const startEditPlaytime = (gp: GamePlayer, game: Game) => {
    setEditingPlaytimeId(gp.id)
    // Start with empty value so user can input time range format
    setEditingPlaytimeValue('')
  }

  const cancelEditPlaytime = () => {
    setEditingPlaytimeId(null)
    setEditingPlaytimeValue('')
  }

  const saveEditPlaytime = async (gameId: string, gp: GamePlayer, game: Game) => {
    // Try to parse as time range first, then fall back to minutes if it's just a number
    const inputValue = editingPlaytimeValue.trim()
    let minutes: number

    if (!inputValue) {
      alert('Please enter a playtime (e.g., "2pm-5pm" or "180" for minutes)')
      return
    }

    // Check if it's a number (minutes)
    const numericValue = Number(inputValue)
    if (!isNaN(numericValue) && isFinite(numericValue) && numericValue >= 0) {
      minutes = numericValue
    } else {
      // Try to parse as time range
      const baseDate = new Date(game.playedAt)
      minutes = parseTimeRangesToMinutes(inputValue, baseDate)
      
      if (minutes === 0) {
        alert('Invalid format. Please enter time range (e.g., "2pm-5pm" or "2pm-5pm, 6pm-7pm") or minutes (e.g., "180")')
        return
      }
    }

    setSavingPlaytimeId(gp.id)
    try {
      const res = await fetch(`/api/game-players/${gp.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playtimeMinutes: minutes }),
      })

      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        console.error('Failed to update playtime:', error)
        alert(error.error || 'Failed to update playtime')
        return
      }

      // Update local state so the table reflects the new value
      setGames((prev) =>
        prev.map((g) =>
          g.id === gameId
            ? {
                ...g,
                gamePlayers: g.gamePlayers.map((p) =>
                  p.id === gp.id ? { ...p, playtimeMinutes: minutes } : p,
                ),
              }
            : g,
        ),
      )

      setEditingPlaytimeId(null)
      setEditingPlaytimeValue('')
    } catch (error) {
      console.error('Error updating playtime:', error)
      alert('An error occurred while updating playtime')
    } finally {
      setSavingPlaytimeId(null)
    }
  }

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>
  }

  return (
    <div className="space-y-4">
      {games.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No games found. Create your first game to get started.
          </CardContent>
        </Card>
      ) : (
        games.map((game) => {
          const isExpanded = expandedGameId === game.id
          return (
            <Card key={game.id}>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between gap-4 text-left"
                    onClick={() =>
                      setExpandedGameId((current) => (current === game.id ? null : game.id))
                    }
                  >
                    <div>
                      <h3 className="text-lg font-semibold">
                        Game on {format(new Date(game.playedAt), 'MMM d, yyyy h:mm a')}
                      </h3>
                      {game.host && (
                        <p className="text-sm text-muted-foreground">
                          Host: {game.host.name || capitalizeFirst(game.host.telegramHandle)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">
                        {game.gamePlayers.length}{' '}
                        {game.gamePlayers.length === 1 ? 'Player' : 'Players'}
                      </Badge>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteGame(game.id)
                        }}
                        disabled={deletingId === game.id}
                      >
                        {deletingId === game.id ? 'Deleting...' : 'Delete'}
                      </Button>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-muted">
                          <tr>
                            <th className="p-3 text-left font-medium">Player (Ginza username)</th>
                            <th className="p-3 text-left font-medium">Buy-In</th>
                            <th className="p-3 text-left font-medium">Cashout</th>
                            <th className="p-3 text-left font-medium">PnL</th>
                            <th className="p-3 text-left font-medium">Playtime</th>
                          </tr>
                        </thead>
                        <tbody>
                          {game.gamePlayers.map((gp) => {
                            const isEditing = editingPlaytimeId === gp.id
                            const isSaving = savingPlaytimeId === gp.id
                            return (
                              <tr key={gp.id} className="border-b">
                                <td className="p-3">
                                  {capitalizeFirst(gp.player.ginzaUsername) || gp.player.name || capitalizeFirst(gp.player.telegramHandle)}
                                </td>
                                <td className="p-3">{formatCurrency(gp.buyIn)}</td>
                                <td className="p-3">{formatCurrency(gp.cashout)}</td>
                                <td className="p-3">
                                  <span
                                    className={
                                      gp.pnl >= 0 ? 'text-green-600' : 'text-red-600'
                                    }
                                  >
                                    {gp.pnl >= 0 ? '+' : ''}
                                    {formatCurrency(gp.pnl)}
                                  </span>
                                </td>
                                <td className="p-3">
                                  {isEditing ? (
                                    <div className="flex flex-col gap-2">
                                      <input
                                        type="text"
                                        placeholder="e.g., 2pm-5pm or 2pm-5pm, 6pm-7pm"
                                        className="w-full border rounded px-2 py-1 text-sm"
                                        value={editingPlaytimeValue}
                                        onChange={(e) =>
                                          setEditingPlaytimeValue(e.target.value)
                                        }
                                      />
                                      <div className="flex items-center gap-2">
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          onClick={() => saveEditPlaytime(game.id, gp, game)}
                                          disabled={isSaving}
                                        >
                                          {isSaving ? 'Saving...' : 'Save'}
                                        </Button>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="ghost"
                                          onClick={cancelEditPlaytime}
                                          disabled={isSaving}
                                        >
                                          Cancel
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      <span>{formatMinutes(gp.playtimeMinutes)}</span>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => startEditPlaytime(gp, game)}
                                      >
                                        Edit
                                      </Button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                        <tfoot className="bg-muted/50">
                          <tr>
                            <td className="p-3 font-semibold">Total</td>
                            <td className="p-3 font-semibold">
                              {formatCurrency(
                                game.gamePlayers.reduce(
                                  (sum, gp) => sum + gp.buyIn,
                                  0,
                                ),
                              )}
                            </td>
                            <td className="p-3 font-semibold">
                              {formatCurrency(
                                game.gamePlayers.reduce(
                                  (sum, gp) => sum + gp.cashout,
                                  0,
                                ),
                              )}
                            </td>
                            <td className="p-3 font-semibold">
                              {formatCurrency(
                                game.gamePlayers.reduce((sum, gp) => sum + gp.pnl, 0),
                              )}
                            </td>
                            <td className="p-3 font-semibold">
                              {formatMinutes(
                                game.gamePlayers.reduce(
                                  (sum, gp) => sum + gp.playtimeMinutes,
                                  0,
                                ),
                              )}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })
      )}
    </div>
  )
}
