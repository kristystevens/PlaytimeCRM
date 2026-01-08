'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function NewRunnerPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    telegramHandle: '',
    ginzaUsername: '',
    timezone: '',
    status: 'TRUSTED',
    notes: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/runners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          timezone: formData.timezone || null,
          notes: formData.notes || null,
          ginzaUsername: formData.ginzaUsername || null,
        }),
      })

      if (res.ok) {
        router.push('/runners')
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to create runner')
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
          <CardTitle>New Runner</CardTitle>
          <CardDescription>Add a new runner to the system</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
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
              <Label htmlFor="timezone">Timezone</Label>
              <Select
                value={formData.timezone}
                onValueChange={(val) => setFormData({ ...formData, timezone: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTC">UTC</SelectItem>
                  <SelectItem value="EST">EST (Eastern Standard Time)</SelectItem>
                  <SelectItem value="PST">PST (Pacific Standard Time)</SelectItem>
                  <SelectItem value="CST">CST (Central Standard Time)</SelectItem>
                  <SelectItem value="MST">MST (Mountain Standard Time)</SelectItem>
                  <SelectItem value="ICT">ICT (Indochina Time)</SelectItem>
                  <SelectItem value="GMT">GMT (Greenwich Mean Time)</SelectItem>
                  <SelectItem value="CET">CET (Central European Time)</SelectItem>
                  <SelectItem value="JST">JST (Japan Standard Time)</SelectItem>
                  <SelectItem value="AEST">AEST (Australian Eastern Standard Time)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(val) => setFormData({ ...formData, status: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRUSTED">Trusted</SelectItem>
                  <SelectItem value="WATCH">Watch</SelectItem>
                  <SelectItem value="CUT">Cut</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
              />
            </div>
            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Runner'}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.push('/runners')}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

