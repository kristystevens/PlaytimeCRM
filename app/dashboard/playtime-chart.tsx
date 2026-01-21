'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  label: string
  totalMinutes: number
  data: Array<{ date: string; minutes: number }>
}

type TimePeriod = 'day' | 'week' | 'month' | 'year'

export default function PlaytimeChart() {
  const [topPlayers, setTopPlayers] = useState<TopPlayerData[]>([])
  const [loading, setLoading] = useState(true)
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('month')

  useEffect(() => {
    loadData()
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

  // Prepare data for bar chart (total playtime per player)
  const chartData = topPlayers
    .filter(player => player.totalMinutes > 0) // Only include players with playtime
    .map(player => {
      const displayName = player.label
      const shortName =
        displayName.length > 15 ? displayName.substring(0, 15) + '...' : displayName
      return {
        name: shortName,
        fullName: displayName,
        minutes: player.totalMinutes,
        formatted: formatMinutes(player.totalMinutes),
      }
    })

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
    </>
  )
}
