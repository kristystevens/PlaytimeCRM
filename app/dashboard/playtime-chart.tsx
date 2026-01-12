'use client'

import { useState, useEffect } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from 'recharts'
import { formatMinutes } from '@/lib/playtime-utils'
import { format, parse, differenceInMinutes } from 'date-fns'

type TopPlayerData = {
  playerId: string
  telegramHandle: string
  totalMinutes: number
  data: Array<{ date: string; minutes: number }>
}

type Player = {
  id: string
  telegramHandle: string
}

type TimePeriod = 'day' | 'week' | 'month' | 'year'

export default function PlaytimeChart() {
  const [topPlayers, setTopPlayers] = useState<TopPlayerData[]>([])
  const [loading, setLoading] = useState(true)
  const [inputDialogOpen, setInputDialogOpen] = useState(false)
  const [players, setPlayers] = useState<any[]>([])
  
  // Ensure players is always an array
  const safePlayers = Array.isArray(players) ? players : []
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('')
  const [inputDate, setInputDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [inputStartTime, setInputStartTime] = useState('')
  const [inputEndTime, setInputEndTime] = useState('')
  const [inputMinutes, setInputMinutes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('month')

  useEffect(() => {
    loadData()
    loadPlayers()
  }, [timePeriod])

  const getPeriodDescription = (period: TimePeriod): string => {
    switch (period) {
      case 'day':
        return 'Top 10 players by playtime today'
      case 'week':
        return 'Top 10 players by playtime this week'
      case 'month':
        return 'Top 10 players by playtime this month'
      case 'year':
        return 'Top 10 players by playtime this year'
      default:
        return 'Top 10 players by playtime this month'
    }
  }

  const calculateMinutes = (date: string, startTime: string, endTime: string): number => {
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

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/playtime/top-players?period=${timePeriod}`)
      if (!res.ok) {
        throw new Error(`API error: ${res.status}`)
      }
      const data = await res.json()
      console.log('Loaded playtime data:', data) // Debug log
      setTopPlayers(data)
    } catch (error) {
      console.error('Error loading top players playtime:', error)
      setTopPlayers([]) // Set empty array on error
    } finally {
      setLoading(false)
    }
  }

  const loadPlayers = async () => {
    try {
      const res = await fetch('/api/players')
      if (!res.ok) {
        console.error('Failed to fetch players:', res.status, res.statusText)
        setPlayers([])
        return
      }
      const data = await res.json()
      // Ensure data is always an array
      if (Array.isArray(data)) {
        setPlayers(data)
      } else {
        console.error('API returned non-array data:', data)
        setPlayers([])
      }
    } catch (error) {
      console.error('Error loading players:', error)
      setPlayers([]) // Set to empty array on error
    }
  }

  const handleSubmitPlaytime = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPlayerId) {
      alert('Please select a player')
      return
    }

    // Calculate minutes from start/end time if provided, otherwise use manual minutes
    let minutes = 0
    let startTime: string | undefined = undefined
    let endTime: string | undefined = undefined

    let requestBody: any = {
      playedOn: inputDate,
    }

    if (inputStartTime && inputEndTime) {
      // If times are provided, send times only (minutes will be calculated on server)
      requestBody.startTime = inputStartTime
      requestBody.endTime = inputEndTime
    } else if (inputMinutes && inputMinutes.trim() !== '') {
      // If minutes are provided, send minutes only
      const parsedMinutes = parseInt(inputMinutes)
      if (isNaN(parsedMinutes) || parsedMinutes < 0) {
        alert('Please enter a valid number of minutes')
        return
      }
      requestBody.minutes = parsedMinutes
    } else {
      alert('Please provide either start/end time or minutes')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/players/${selectedPlayerId}/playtime`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      if (res.ok) {
        setInputDialogOpen(false)
        setSelectedPlayerId('')
        setInputDate(format(new Date(), 'yyyy-MM-dd'))
        setInputStartTime('')
        setInputEndTime('')
        setInputMinutes('')
        loadData() // Refresh the chart
        alert('Playtime entry added successfully!')
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to add playtime entry')
      }
    } catch (error) {
      console.error('Error adding playtime entry:', error)
      alert('Failed to add playtime entry')
    } finally {
      setSubmitting(false)
    }
  }

  // Prepare data for bar chart (total playtime per player)
  const chartData = topPlayers
    .filter(player => player.totalMinutes > 0) // Only include players with playtime
    .map(player => ({
      name: player.telegramHandle.length > 15 ? player.telegramHandle.substring(0, 15) + '...' : player.telegramHandle,
      fullName: player.telegramHandle,
      minutes: player.totalMinutes,
      formatted: formatMinutes(player.totalMinutes),
    }))

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Top 10 Most Active Players</CardTitle>
              <CardDescription>
                {getPeriodDescription(timePeriod)}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={timePeriod} onValueChange={(value: TimePeriod) => setTimePeriod(value)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Day</SelectItem>
                  <SelectItem value="week">Week</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                  <SelectItem value="year">Year</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => setInputDialogOpen(true)}>
                Add Playtime Entry
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-[400px] flex items-center justify-center text-muted-foreground">
              Loading...
            </div>
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis 
                  label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  formatter={(value: number) => formatMinutes(value)}
                  labelFormatter={(label, payload) => {
                    if (payload && payload[0]) {
                      return payload[0].payload.fullName
                    }
                    return label
                  }}
                />
                <Bar dataKey="minutes" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[400px] flex items-center justify-center text-muted-foreground">
              No playtime data available for the selected period
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Playtime Entry Dialog */}
      <Dialog open={inputDialogOpen} onOpenChange={setInputDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Playtime Entry</DialogTitle>
            <DialogDescription>Record playtime with date and time, or enter minutes manually</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitPlaytime}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="player-select">Player</Label>
                <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId} required>
                  <SelectTrigger id="player-select">
                    <SelectValue placeholder="Select a player" />
                  </SelectTrigger>
                  <SelectContent>
                    {safePlayers.map((player) => (
                      <SelectItem key={player.id} value={player.id}>
                        {player.telegramHandle}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date-input">Date</Label>
                  <Input
                    id="date-input"
                    type="date"
                    value={inputDate}
                    onChange={(e) => setInputDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="start-time-input">Start Time</Label>
                  <Input
                    id="start-time-input"
                    type="time"
                    value={inputStartTime}
                    onChange={(e) => setInputStartTime(e.target.value)}
                    placeholder="HH:MM"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-time-input">End Time</Label>
                  <Input
                    id="end-time-input"
                    type="time"
                    value={inputEndTime}
                    onChange={(e) => setInputEndTime(e.target.value)}
                    placeholder="HH:MM"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minutes-input">Or Minutes (manual)</Label>
                  <Input
                    id="minutes-input"
                    type="number"
                    min="0"
                    value={inputMinutes}
                    onChange={(e) => setInputMinutes(e.target.value)}
                    placeholder="120"
                  />
                </div>
              </div>
              {(inputStartTime && inputEndTime) && (
                <div className="text-sm text-muted-foreground">
                  Calculated: {formatMinutes(calculateMinutes(inputDate, inputStartTime, inputEndTime))}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setInputDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || (!inputStartTime && !inputEndTime && !inputMinutes)}>
                {submitting ? 'Adding...' : 'Add Entry'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
