'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Player, Runner, Agent } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { calculateValueScore } from '@/lib/metrics'
import { format } from 'date-fns'
import { formatMinutes } from '@/lib/playtime-utils'
import { capitalizeFirst } from '@/lib/utils'
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
}

export default function PlayerDetail({ player: initialPlayer }: { player: PlayerWithRelations }) {
  const router = useRouter()
  const [player, setPlayer] = useState(initialPlayer)
  const [localValues, setLocalValues] = useState({
    telegramHandle: initialPlayer.telegramHandle || '',
    ginzaUsername: initialPlayer.ginzaUsername || '',
    name: (initialPlayer as any).name || '',
    preferredTimeZones: (() => {
      try {
        const parsed = JSON.parse((initialPlayer as any).preferredTimeZones || '[]')
        return Array.isArray(parsed) ? parsed.join(', ') : ''
      } catch {
        return ''
      }
    })(),
    totalDeposited: Number(initialPlayer.totalDeposited),
    totalWagered: Number(initialPlayer.totalWagered),
    netPnL: Number(initialPlayer.netPnL),
    avgBuyIn: Number(initialPlayer.avgBuyIn),
    preferredPlaytimes: (() => {
      try {
        const parsed = JSON.parse((initialPlayer as any).preferredPlaytimes || '[]')
        return Array.isArray(parsed) ? parsed.join(', ') : ''
      } catch {
        return ''
      }
    })(),
    preferredStakes: (() => {
      try {
        const parsed = JSON.parse((initialPlayer as any).preferredStakes || '[]')
        return Array.isArray(parsed) ? parsed.join(', ') : ''
      } catch {
        return ''
      }
    })(),
  })
  const [saving, setSaving] = useState(false)
  const [runners, setRunners] = useState<Runner[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [activityLogs, setActivityLogs] = useState<any[]>([])
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pendingUpdatesRef = useRef<Record<string, any>>({})

  // Update local values when player changes
  useEffect(() => {
    setLocalValues({
      telegramHandle: player.telegramHandle || '',
      ginzaUsername: player.ginzaUsername || '',
      name: (player as any).name || '',
      preferredTimeZones: (() => {
        try {
          const parsed = JSON.parse((player as any).preferredTimeZones || '[]')
          return Array.isArray(parsed) ? parsed.join(', ') : ''
        } catch {
          return ''
        }
      })(),
      totalDeposited: Number(player.totalDeposited),
      totalWagered: Number(player.totalWagered),
      netPnL: Number(player.netPnL),
      avgBuyIn: Number(player.avgBuyIn),
      preferredPlaytimes: (() => {
        try {
          const parsed = JSON.parse((player as any).preferredPlaytimes || '[]')
          return Array.isArray(parsed) ? parsed.join(', ') : ''
        } catch {
          return ''
        }
      })(),
      preferredStakes: (() => {
        try {
          const parsed = JSON.parse((player as any).preferredStakes || '[]')
          return Array.isArray(parsed) ? parsed.join(', ') : ''
        } catch {
          return ''
        }
      })(),
    })
  }, [player.id])

  useEffect(() => {
    fetch('/api/runners')
      .then(r => r.json())
      .then(data => setRunners(Array.isArray(data) ? data : []))
      .catch(err => {
        console.error('Error fetching runners:', err)
        setRunners([])
      })
    fetch('/api/agents')
      .then(r => r.json())
      .then(data => setAgents(Array.isArray(data) ? data : []))
      .catch(err => {
        console.error('Error fetching agents:', err)
        setAgents([])
      })
    fetch(`/api/activity?entityType=PLAYER&entityId=${player.id}`)
      .then(r => r.json())
      .then(data => setActivityLogs(Array.isArray(data) ? data : []))
      .catch(err => {
        console.error('Error fetching activity logs:', err)
        setActivityLogs([])
      })
  }, [player.id])

  // Debounced save function
  const debouncedSave = (field: string, value: any) => {
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Store the pending update
    pendingUpdatesRef.current[field] = value

    // Set new timeout to save after 800ms of no typing
    saveTimeoutRef.current = setTimeout(async () => {
      const updates = { ...pendingUpdatesRef.current }
      pendingUpdatesRef.current = {}
      
      // Convert preferredPlaytimes from comma-separated string to array
      if (updates.preferredPlaytimes !== undefined) {
        updates.preferredPlaytimes = updates.preferredPlaytimes
          ? updates.preferredPlaytimes.split(',').map((t: string) => t.trim()).filter((t: string) => t)
          : []
      }
      // Convert preferredStakes from comma-separated string to array
      if (updates.preferredStakes !== undefined) {
        updates.preferredStakes = updates.preferredStakes
          ? updates.preferredStakes.split(',').map((t: string) => t.trim()).filter((t: string) => t)
          : []
      }
      
      // Convert preferredTimeZones from comma-separated string to array
      if (updates.preferredTimeZones !== undefined) {
        updates.preferredTimeZones = updates.preferredTimeZones
          ? updates.preferredTimeZones.split(',').map((t: string) => t.trim()).filter((t: string) => t)
          : []
      }
      
      setSaving(true)
      try {
        const res = await fetch(`/api/players/${player.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        })

        if (res.ok) {
          const updated = await res.json()
          setPlayer(updated)
        } else {
          console.error('Failed to update player:', res.status)
        }
      } catch (error) {
        console.error('Error updating player:', error)
      } finally {
        setSaving(false)
      }
    }, 800)
  }

  const handleInputChange = (field: string, value: any) => {
    setLocalValues(prev => ({ ...prev, [field]: value }))
    debouncedSave(field, value)
  }

  const handleSelectChange = async (field: string, value: any) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/players/${player.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      })

      if (res.ok) {
        const updated = await res.json()
        setPlayer(updated)
      }
    } catch (error) {
      console.error('Error updating player:', error)
    } finally {
      setSaving(false)
    }
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  const valueScore = calculateValueScore(player.totalDeposited, player.totalWagered, player.netPnL)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/players/${player.id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        router.push('/players')
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to delete player')
        setDeleting(false)
      }
    } catch (error) {
      console.error('Error deleting player:', error)
      alert('An error occurred while deleting the player')
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {capitalizeFirst((player as any).ginzaUsername) || localValues.name || capitalizeFirst(localValues.telegramHandle) || capitalizeFirst(player.telegramHandle)}
          </h1>
          <p className="text-muted-foreground">
            {(player as any).ginzaUsername && `Ginza: ${capitalizeFirst((player as any).ginzaUsername)}`}{" "}
            {!((player as any).ginzaUsername) && 'Player Details'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push('/players')}>
            Back to Players
          </Button>
          <Button 
            variant="destructive" 
            onClick={() => setDeleteDialogOpen(true)}
          >
            Delete Player
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Ginza Username {saving && <span className="text-xs text-muted-foreground">(Saving...)</span>}</Label>
              <Input 
                value={localValues.ginzaUsername} 
                onChange={(e) => handleInputChange('ginzaUsername', e.target.value)}
                placeholder="Enter Ginza username"
                maxLength={40}
              />
            </div>
            <div className="space-y-2">
              <Label>Telegram Handle {saving && <span className="text-xs text-muted-foreground">(Saving...)</span>}</Label>
              <Input 
                value={localValues.telegramHandle} 
                onChange={(e) => handleInputChange('telegramHandle', e.target.value)}
                placeholder="Enter Telegram handle"
                maxLength={40}
              />
            </div>
            <div className="space-y-2">
              <Label>Name {saving && <span className="text-xs text-muted-foreground">(Saving...)</span>}</Label>
              <Input 
                value={localValues.name} 
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter player name"
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label>Preferred Time Zones {saving && <span className="text-xs text-muted-foreground">(Saving...)</span>}</Label>
              <Input 
                value={localValues.preferredTimeZones} 
                onChange={(e) => handleInputChange('preferredTimeZones', e.target.value)}
                placeholder="e.g., EST, PST, UTC"
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground">Enter comma-separated time zones (e.g., EST, PST, UTC)</p>
            </div>
            {/* Player Type field removed from UI */}
            <div className="space-y-2">
              <Label>VIP Tier</Label>
              <Select value={player.vipTier} onValueChange={(val) => handleSelectChange('vipTier', val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={player.status} onValueChange={(val) => handleSelectChange('status', val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="FADING">Fading</SelectItem>
                  <SelectItem value="CHURNED">Churned</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Churn Risk</Label>
              <Select value={player.churnRisk} onValueChange={(val) => handleSelectChange('churnRisk', val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MED">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Player Type</Label>
              <Select value={player.skillLevel || 'AMATEUR'} onValueChange={(val) => handleSelectChange('skillLevel', val)}>
                <SelectTrigger>
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
            </div>
            <div className="space-y-2">
              <Label>Assigned Community Manager</Label>
              <Select 
                value={(player as any).assignedCommunityManager || 'none'} 
                onValueChange={(val) => handleSelectChange('assignedCommunityManager', val === 'none' ? null : val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="MIA">Mia</SelectItem>
                  <SelectItem value="KRISTY">Kristy</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Community managers help build relationships and reduce churn. Assignments are based on who onboarded the player or alternating.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Preferred Playtimes {saving && <span className="text-xs text-muted-foreground">(Saving...)</span>}</Label>
              <Input 
                value={localValues.preferredPlaytimes} 
                onChange={(e) => handleInputChange('preferredPlaytimes', e.target.value)}
                placeholder="e.g., 7pm-9pm, 5am-7am"
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground">Enter comma-separated time ranges (e.g., 7pm-9pm, 5am-7am)</p>
            </div>
            <div className="space-y-2">
              <Label>Preferred Stakes {saving && <span className="text-xs text-muted-foreground">(Saving...)</span>}</Label>
              <Input 
                value={localValues.preferredStakes} 
                onChange={(e) => handleInputChange('preferredStakes', e.target.value)}
                placeholder="e.g., 1/2 NL, 2/5 NL"
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground">Enter comma-separated stakes (e.g., 1/2 NL, 2/5 NL)</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Financial Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Value Score</Label>
              <div className="text-2xl font-bold">{valueScore.toFixed(2)}</div>
            </div>
            <div className="space-y-2">
              <Label>Total Deposited {saving && <span className="text-xs text-muted-foreground">(Saving...)</span>}</Label>
              <Input
                type="number"
                value={localValues.totalDeposited}
                onChange={(e) => handleInputChange('totalDeposited', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label>Total Wagered {saving && <span className="text-xs text-muted-foreground">(Saving...)</span>}</Label>
              <Input
                type="number"
                value={localValues.totalWagered}
                onChange={(e) => handleInputChange('totalWagered', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label>Net PnL {saving && <span className="text-xs text-muted-foreground">(Saving...)</span>}</Label>
              <Input
                type="number"
                value={localValues.netPnL}
                onChange={(e) => handleInputChange('netPnL', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label>Avg Buy-In {saving && <span className="text-xs text-muted-foreground">(Saving...)</span>}</Label>
              <Input
                type="number"
                value={localValues.avgBuyIn}
                onChange={(e) => handleInputChange('avgBuyIn', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label>Last Active</Label>
              <div className="text-sm text-muted-foreground">
                {player.lastActiveAt ? new Date(player.lastActiveAt).toLocaleString() : 'Never'}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assignments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Is Host</Label>
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
                      const updated = await res.json()
                      setPlayer(updated)
                      // Refresh agents list if needed
                      const agentsRes = await fetch('/api/agents')
                      if (agentsRes.ok) {
                        const agentsData = await agentsRes.json()
                        setAgents(Array.isArray(agentsData) ? agentsData : [])
                      }
                    } else {
                      const error = await res.json()
                      alert(error.error || 'Failed to update host status')
                    }
                  } catch (error) {
                    console.error('Error updating isAgent:', error)
                    alert('Failed to update host status')
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activity Log</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {activityLogs.map((log) => (
                <div key={log.id} className="border rounded p-2 text-sm">
                  <div className="font-medium">{log.action}</div>
                  <div className="text-muted-foreground">
                    by {log.actor.name} on {new Date(log.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
              {activityLogs.length === 0 && (
                <div className="text-sm text-muted-foreground">No activity yet</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Play sessions sourced from game data */}
      <Card>
        <CardHeader>
          <CardTitle>Play Sessions</CardTitle>
          <CardDescription>
            Sessions for this player, based on entered games. Edit or delete games from the Games page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {Array.isArray((player as any).gamePlayers) && (player as any).gamePlayers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Date / Time</th>
                    <th className="text-left p-2">Host</th>
                    <th className="text-left p-2">Buy-In</th>
                    <th className="text-left p-2">Cashout</th>
                    <th className="text-left p-2">PnL</th>
                    <th className="text-left p-2">Playtime</th>
                  </tr>
                </thead>
                <tbody>
                  {(player as any).gamePlayers
                    .slice()
                    .sort((a: any, b: any) => {
                      const aDate = a.game?.playedAt ? new Date(a.game.playedAt).getTime() : 0
                      const bDate = b.game?.playedAt ? new Date(b.game.playedAt).getTime() : 0
                      return bDate - aDate
                    })
                    .map((gp: any) => {
                      const game = gp.game
                      const host = game?.host
                      const pnl = gp.pnl ?? 0
                      return (
                        <tr key={gp.id} className="border-b">
                          <td className="p-2">
                            {game?.playedAt
                              ? format(new Date(game.playedAt), 'MMM d, yyyy h:mm a')
                              : '-'}
                          </td>
                          <td className="p-2">
                            {host ? host.name || capitalizeFirst(host.telegramHandle) : '-'}
                          </td>
                          <td className="p-2">
                            {gp.buyIn != null
                              ? gp.buyIn.toLocaleString('en-US', {
                                  style: 'currency',
                                  currency: 'USD',
                                })
                              : '-'}
                          </td>
                          <td className="p-2">
                            {gp.cashout != null
                              ? gp.cashout.toLocaleString('en-US', {
                                  style: 'currency',
                                  currency: 'USD',
                                })
                              : '-'}
                          </td>
                          <td className="p-2">
                            <span className={pnl >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {pnl >= 0 ? '+' : ''}
                              {pnl.toLocaleString('en-US', {
                                style: 'currency',
                                currency: 'USD',
                              })}
                            </span>
                          </td>
                          <td className="p-2">
                            {formatMinutes(gp.playtimeMinutes || 0)}
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              No play sessions yet. Enter games on the Games page to see them here.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Player</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {capitalizeFirst(player.telegramHandle)}?
              {player.isAgent && (
                <span className="block mt-2 font-semibold text-red-600">
                  This player is also a host. Deleting will remove them from both the Players and Agents pages.
                </span>
              )}
              This action cannot be undone. All associated data (games, playtime, etc.) will also be removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete Player'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

