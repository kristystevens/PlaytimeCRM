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
import PlaytimeSection from './playtime-section'

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
    country: initialPlayer.country || '',
    totalDeposited: Number(initialPlayer.totalDeposited),
    totalWagered: Number(initialPlayer.totalWagered),
    netPnL: Number(initialPlayer.netPnL),
    avgBuyIn: Number(initialPlayer.avgBuyIn),
  })
  const [saving, setSaving] = useState(false)
  const [runners, setRunners] = useState<Runner[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [activityLogs, setActivityLogs] = useState<any[]>([])
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pendingUpdatesRef = useRef<Record<string, any>>({})

  // Update local values when player changes
  useEffect(() => {
    setLocalValues({
      telegramHandle: player.telegramHandle || '',
      ginzaUsername: player.ginzaUsername || '',
      country: player.country || '',
      totalDeposited: Number(player.totalDeposited),
      totalWagered: Number(player.totalWagered),
      netPnL: Number(player.netPnL),
      avgBuyIn: Number(player.avgBuyIn),
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{localValues.telegramHandle || player.telegramHandle}</h1>
          <p className="text-muted-foreground">Player Details</p>
        </div>
        <Button variant="outline" onClick={() => router.push('/players')}>
          Back to Players
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
              <Label>Ginza Username {saving && <span className="text-xs text-muted-foreground">(Saving...)</span>}</Label>
              <Input 
                value={localValues.ginzaUsername} 
                onChange={(e) => handleInputChange('ginzaUsername', e.target.value)}
                placeholder="Enter Ginza username"
                maxLength={40}
              />
            </div>
            <div className="space-y-2">
              <Label>Country {saving && <span className="text-xs text-muted-foreground">(Saving...)</span>}</Label>
              <Input 
                value={localValues.country} 
                onChange={(e) => handleInputChange('country', e.target.value)}
                placeholder="Enter country"
                maxLength={40}
              />
            </div>
            <div className="space-y-2">
              <Label>Player Type</Label>
              <Select value={player.playerType || 'PLAYER'} onValueChange={(val) => handleSelectChange('playerType', val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PLAYER">Player</SelectItem>
                  <SelectItem value="RUNNER">Runner</SelectItem>
                  <SelectItem value="AGENT">Host</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
              <Label>Skill Level</Label>
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
                      // Refresh hosts list if needed
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

      {/* Playtime Section */}
      <Card>
        <CardHeader>
          <CardTitle>Playtime Tracking</CardTitle>
          <CardDescription>Track and analyze player playtime over time</CardDescription>
        </CardHeader>
        <CardContent>
          <PlaytimeSection playerId={player.id} />
        </CardContent>
      </Card>
    </div>
  )
}

