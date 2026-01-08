'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function NewPlayerPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    telegramHandle: '',
    ginzaUsername: '',
    walletAddress: '',
    country: '',
    vipTier: 'MEDIUM',
    status: 'ACTIVE',
    churnRisk: 'LOW',
    skillLevel: 'AMATEUR',
    tiltRisk: false,
    notes: '',
    assignedRunnerId: '',
    referredByAgentId: '',
  })
  const [runners, setRunners] = useState<any[]>([])
  const [agents, setAgents] = useState<any[]>([])

  useEffect(() => {
    fetch('/api/runners').then(r => r.json()).then(setRunners)
    fetch('/api/agents').then(r => r.json()).then(setAgents)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          assignedRunnerId: formData.assignedRunnerId || null,
          referredByAgentId: formData.referredByAgentId || null,
          walletAddress: formData.walletAddress || null,
          ginzaUsername: formData.ginzaUsername || null,
        }),
      })

      if (res.ok) {
        router.push('/players')
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to create player')
      }
    } catch (error) {
      alert('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>New Player</CardTitle>
          <CardDescription>Add a new player to the system</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="telegramHandle">Telegram Handle *</Label>
              <Input
                id="telegramHandle"
                value={formData.telegramHandle}
                onChange={(e) => setFormData({ ...formData, telegramHandle: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ginzaUsername">Ginza Username</Label>
              <Input
                id="ginzaUsername"
                value={formData.ginzaUsername}
                onChange={(e) => setFormData({ ...formData, ginzaUsername: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vipTier">VIP Tier</Label>
                <Select value={formData.vipTier} onValueChange={(val) => setFormData({ ...formData, vipTier: val })}>
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
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
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
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="churnRisk">Churn Risk</Label>
                <Select value={formData.churnRisk} onValueChange={(val) => setFormData({ ...formData, churnRisk: val })}>
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
                <Label htmlFor="skillLevel">Skill Level</Label>
                <Select value={formData.skillLevel} onValueChange={(val) => setFormData({ ...formData, skillLevel: val })}>
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
            </div>
            <div className="space-y-2">
              <Label htmlFor="assignedRunnerId">Assigned Runner</Label>
              <Select value={formData.assignedRunnerId || "none"} onValueChange={(val) => setFormData({ ...formData, assignedRunnerId: val === "none" ? "" : val })}>
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
            </div>
            <div className="space-y-2">
              <Label htmlFor="referredByAgentId">Referred By Agent</Label>
              <Select value={formData.referredByAgentId || "none"} onValueChange={(val) => setFormData({ ...formData, referredByAgentId: val === "none" ? "" : val })}>
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
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Player'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

