'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function MessagesPage() {
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    fetchTasks()
  }, [filter])

  const fetchTasks = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter) params.append('status', filter)

      const res = await fetch(`/api/messages?${params}`)
      const data = await res.json()
      setTasks(data)
    } catch (error) {
      console.error('Error fetching message tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsSent = async (taskId: string) => {
    try {
      const res = await fetch(`/api/messages/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'SENT' }),
      })

      if (res.ok) {
        fetchTasks()
      }
    } catch (error) {
      console.error('Error updating task:', error)
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Message Queue</h1>
          <p className="text-muted-foreground">Manage communication tasks</p>
        </div>
        <Select value={filter || "all"} onValueChange={(val) => setFilter(val === "all" ? "" : val)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="TODO">Todo</SelectItem>
            <SelectItem value="SENT">Sent</SelectItem>
            <SelectItem value="SKIPPED">Skipped</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Message Tasks</CardTitle>
          <CardDescription>{tasks.length} tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {tasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between p-3 border rounded">
                <div className="flex-1">
                  <div className="font-medium">
                    {task.template} - {task.channel}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {task.player?.telegramHandle && `Player: ${task.player.telegramHandle}`}
                    {task.agent?.name && `Host: ${task.agent.name}`}
                    {task.dueAt && ` | Due: ${new Date(task.dueAt).toLocaleString()}`}
                  </div>
                  {task.notes && (
                    <div className="text-sm text-muted-foreground mt-1">{task.notes}</div>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={task.status === 'SENT' ? 'default' : task.status === 'SKIPPED' ? 'secondary' : 'outline'}>
                    {task.status}
                  </Badge>
                  {task.status === 'TODO' && (
                    <Button size="sm" onClick={() => markAsSent(task.id)}>
                      Mark Sent
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {tasks.length === 0 && (
              <div className="text-center text-muted-foreground py-8">No message tasks found</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

