'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import ActivityExportButton from './export-button'

export default function ActivityPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    entityType: '',
    action: '',
    startDate: '',
    endDate: '',
  })

  useEffect(() => {
    fetchLogs()
  }, [filters])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.entityType) params.append('entityType', filters.entityType)
      if (filters.action) params.append('action', filters.action)
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)

      const res = await fetch(`/api/activity?${params}`)
      const data = await res.json()
      setLogs(data)
    } catch (error) {
      console.error('Error fetching activity logs:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Activity Log</h1>
          <p className="text-muted-foreground">Audit trail of all system activities</p>
        </div>
        <ActivityExportButton />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select value={filters.entityType || "all"} onValueChange={(val) => setFilters({ ...filters, entityType: val === "all" ? "" : val })}>
              <SelectTrigger>
                <SelectValue placeholder="Entity Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="PLAYER">Player</SelectItem>
                <SelectItem value="RUNNER">Runner</SelectItem>
                <SelectItem value="AGENT">Agent</SelectItem>
                <SelectItem value="PAYOUT">Payout</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.action || "all"} onValueChange={(val) => setFilters({ ...filters, action: val === "all" ? "" : val })}>
              <SelectTrigger>
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="CREATE">Create</SelectItem>
                <SelectItem value="UPDATE">Update</SelectItem>
                <SelectItem value="DELETE">Delete</SelectItem>
                <SelectItem value="ASSIGN">Assign</SelectItem>
                <SelectItem value="TAG">Tag</SelectItem>
                <SelectItem value="PAYOUT">Payout</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              placeholder="Start Date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            />
            <Input
              type="date"
              placeholder="End Date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity Logs</CardTitle>
          <CardDescription>{logs.length} entries</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {logs.map((log) => (
              <div key={log.id} className="border rounded p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">
                      {log.action} {log.entityType} ({log.entityId.slice(0, 8)}...)
                    </div>
                    <div className="text-sm text-muted-foreground">
                      by {log.actor.name} ({log.actor.email}) on {new Date(log.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
                {log.changes && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    Changes: {JSON.stringify(log.changes)}
                  </div>
                )}
              </div>
            ))}
            {logs.length === 0 && (
              <div className="text-center text-muted-foreground py-8">No activity logs found</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

