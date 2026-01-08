'use client'

import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

export default function ActivityExportButton() {
  const handleExport = async () => {
    try {
      // Fetch all activity logs (with a high limit to get all)
      const res = await fetch('/api/activity?limit=10000')
      const logs = await res.json()

      // Convert to CSV
      const headers = [
        'ID',
        'Action',
        'Entity Type',
        'Entity ID',
        'Actor Name',
        'Actor Email',
        'Actor Role',
        'Changes',
        'Created At',
      ]

      const rows = logs.map((log: any) => {
        const formatDate = (date: string | Date | null) => {
          if (!date) return ''
          const d = new Date(date)
          return d.toLocaleDateString() + ' ' + d.toLocaleTimeString()
        }

        // Parse changes if it's a JSON string
        let changesStr = ''
        if (log.changes) {
          try {
            const changes = typeof log.changes === 'string' ? JSON.parse(log.changes) : log.changes
            changesStr = JSON.stringify(changes)
          } catch {
            changesStr = String(log.changes)
          }
        }

        return [
          log.id || '',
          log.action || '',
          log.entityType || '',
          log.entityId || '',
          log.actor?.name || '',
          log.actor?.email || '',
          log.actor?.role || '',
          changesStr,
          formatDate(log.createdAt),
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
      link.setAttribute('download', `activity-export-${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Error exporting activity logs:', error)
      alert('Failed to export activity logs')
    }
  }

  return (
    <Button variant="outline" onClick={handleExport}>
      <Download className="mr-2 h-4 w-4" />
      Export CSV
    </Button>
  )
}

