'use client'

import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

export default function RunnersExportButton() {
  const handleExport = async () => {
    try {
      // Fetch all runners
      const res = await fetch('/api/runners')
      const runners = await res.json()

      // Convert to CSV
      const headers = [
        'Name',
        'Telegram Handle',
        'Ginza Username',
        'Status',
        'Referred Players',
        'Last Active',
        'Notes',
        'Created At',
      ]

      const rows = runners.map((runner: any) => {
        const formatDate = (date: string | Date | null) => {
          if (!date) return ''
          const d = new Date(date)
          return d.toLocaleDateString() + ' ' + d.toLocaleTimeString()
        }

        return [
          runner.name || '',
          runner.telegramHandle || '',
          runner.ginzaUsername || '',
          runner.status || '',
          runner.metrics?.assignedPlayers || 0,
          formatDate(runner.metrics?.lastActive),
          runner.notes || '',
          formatDate(runner.createdAt),
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
      link.setAttribute('download', `runners-export-${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Error exporting runners:', error)
      alert('Failed to export runners data')
    }
  }

  return (
    <Button variant="outline" onClick={handleExport}>
      <Download className="mr-2 h-4 w-4" />
      Export CSV
    </Button>
  )
}

