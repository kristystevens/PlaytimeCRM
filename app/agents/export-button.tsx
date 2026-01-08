'use client'

import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

export default function AgentsExportButton() {
  const handleExport = async () => {
    try {
      // Fetch all agents
      const res = await fetch('/api/agents')
      const agents = await res.json()

      // Convert to CSV
      const headers = [
        'Name',
        'Telegram Handle',
        'Ginza Username',
        'Status',
        'Timezone',
        'Referred Players',
        'Last Active',
        'Notes',
        'Created At',
      ]

      const rows = agents.map((agent: any) => {
        const formatDate = (date: string | Date | null) => {
          if (!date) return ''
          const d = new Date(date)
          return d.toLocaleDateString() + ' ' + d.toLocaleTimeString()
        }

        return [
          agent.name || '',
          agent.telegramHandle || '',
          agent.ginzaUsername || '',
          agent.status || '',
          agent.timezone || '',
          agent.metrics?.totalPlayers || 0,
          formatDate(agent.metrics?.lastActive),
          agent.notes || '',
          formatDate(agent.createdAt),
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
      link.setAttribute('download', `agents-export-${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Error exporting agents:', error)
      alert('Failed to export agents data')
    }
  }

  return (
    <Button variant="outline" onClick={handleExport}>
      <Download className="mr-2 h-4 w-4" />
      Export CSV
    </Button>
  )
}

