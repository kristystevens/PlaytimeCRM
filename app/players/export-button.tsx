'use client'

import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

export default function PlayersTableExportButton() {
  const handleExport = async () => {
    try {
      // Fetch all players without filters
      const res = await fetch('/api/players')
      if (!res.ok) {
        throw new Error('Failed to fetch players')
      }
      const data = await res.json()
      
      // Ensure players is an array
      if (!Array.isArray(data)) {
        throw new Error('Invalid response: expected array of players')
      }
      
      const players = data

      // Convert to CSV
      const headers = [
        'Telegram',
        'Ginza Username',
        'Type',
        'Status',
        'Churn Risk',
        'Skill Level',
        'Country',
        'Last Active',
        'Most Active Times (EST)',
        'Total Playtime',
        'Is Host',
        'Notes',
      ]

      const rows = players.map((player: any) => {
        const formatDate = (date: string | Date | null) => {
          if (!date) return ''
          const d = new Date(date)
          return d.toLocaleDateString() + ' ' + d.toLocaleTimeString()
        }

        const formatMinutes = (minutes: number) => {
          if (!minutes) return '0m'
          const hours = Math.floor(minutes / 60)
          const mins = minutes % 60
          if (hours === 0) return `${mins}m`
          if (mins === 0) return `${hours}h`
          return `${hours}h ${mins}m`
        }

        return [
          player.telegramHandle || '',
          player.ginzaUsername || '',
          player.playerType || 'PLAYER',
          player.status || '',
          player.churnRisk || '',
          player.skillLevel || '',
          player.country || '',
          formatDate(player.lastActiveAt),
          player.mostActiveTimes || '',
          formatMinutes(player.totalPlaytime || 0),
          player.isAgent ? 'Yes' : 'No',
          player.notes || '',
        ]
      })

      // Escape CSV values
      const escapeCSV = (value: string) => {
        if (value === null || value === undefined) return ''
        const str = String(value)
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`
        }
        return str
      }

      // Create CSV content
      const csvContent = [
        headers.map(escapeCSV).join(','),
        ...rows.map((row: any[]) => row.map(escapeCSV).join(',')),
      ].join('\n')

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `players-export-${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Error exporting players:', error)
      alert('Failed to export players data')
    }
  }

  return (
    <Button variant="outline" onClick={handleExport}>
      <Download className="mr-2 h-4 w-4" />
      Export CSV
    </Button>
  )
}

