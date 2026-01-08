'use client'

import { useState, useEffect } from 'react'
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
  const [loading, setLoading] = useState(false)
  const [runners, setRunners] = useState<Runner[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [activityLogs, setActivityLogs] = useState<any[]>([])

  useEffect(() => {
    fetch('/api/runners').then(r => r.json()).then(setRunners)
    fetch('/api/agents').then(r => r.json()).then(setAgents)
    fetch(`/api/activity?entityType=PLAYER&entityId=${player.id}`).then(r => r.json()).then(setActivityLogs)
  }, [player.id])

  const handleUpdate = async (field: string, value: any) => {
    setLoading(true)
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
      setLoading(false)
    }
  }

  const valueScore = calculateValueScore(player.totalDeposited, player.totalWagered, player.netPnL)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{player.telegramHandle}</h1>
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
              <Label>Telegram Handle</Label>
              <Input value={player.telegramHandle} disabled />
            </div>
            <div className="space-y-2">
              <Label>Ginza Username</Label>
              <Input 
                value={player.ginzaUsername || ''} 
                onChange={(e) => handleUpdate('ginzaUsername', e.target.value)}
                placeholder="Enter Ginza username"
              />
            </div>
            <div className="space-y-2">
              <Label>Wallet Address</Label>
              <Input value={player.walletAddress || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label>Country</Label>
              <Input value={player.country || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label>Player Type</Label>
              <Select value={player.playerType || 'PLAYER'} onValueChange={(val) => handleUpdate('playerType', val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PLAYER">Player</SelectItem>
                  <SelectItem value="RUNNER">Runner</SelectItem>
                  <SelectItem value="AGENT">Agent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>VIP Tier</Label>
              <Select value={player.vipTier} onValueChange={(val) => handleUpdate('vipTier', val)}>
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
              <Select value={player.status} onValueChange={(val) => handleUpdate('status', val)}>
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
              <Select value={player.churnRisk} onValueChange={(val) => handleUpdate('churnRisk', val)}>
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
              <Select value={player.skillLevel || 'AMATEUR'} onValueChange={(val) => handleUpdate('skillLevel', val)}>
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
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="tiltRisk"
                checked={player.tiltRisk}
                onChange={(e) => handleUpdate('tiltRisk', e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="tiltRisk">Tilt Risk</Label>
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
              <Label>Total Deposited</Label>
              <Input
                type="number"
                value={Number(player.totalDeposited)}
                onChange={(e) => handleUpdate('totalDeposited', parseFloat(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Total Wagered</Label>
              <Input
                type="number"
                value={Number(player.totalWagered)}
                onChange={(e) => handleUpdate('totalWagered', parseFloat(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Net PnL</Label>
              <Input
                type="number"
                value={Number(player.netPnL)}
                onChange={(e) => handleUpdate('netPnL', parseFloat(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Avg Buy-In</Label>
              <Input
                type="number"
                value={Number(player.avgBuyIn)}
                onChange={(e) => handleUpdate('avgBuyIn', parseFloat(e.target.value))}
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
              <Label>Assigned Runner</Label>
              <Select
                value={player.assignedRunnerId || 'none'}
                onValueChange={(val) => handleUpdate('assignedRunnerId', val === 'none' ? null : val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select runner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {runners.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {player.assignedRunner && (
                <div className="text-sm text-muted-foreground">
                  Current: {player.assignedRunner.name}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Referred By Agent</Label>
              <Select
                value={player.referredByAgentId || 'none'}
                onValueChange={(val) => handleUpdate('referredByAgentId', val === 'none' ? null : val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select agent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {agents.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {player.referredByAgent && (
                <div className="text-sm text-muted-foreground">
                  Current: {player.referredByAgent.name}
                </div>
              )}
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

