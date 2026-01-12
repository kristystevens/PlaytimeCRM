import { Suspense } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import AgentsTable from './agents-table'
import AgentsExportButton from './export-button'
import { AgentsErrorBoundary } from './error-boundary'

export default function AgentsPage() {
  return (
    <AgentsErrorBoundary>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Hosts</h1>
            <p className="text-muted-foreground">Manage affiliates and hosts</p>
          </div>
          <div className="flex gap-2">
            <AgentsExportButton />
            <Link href="/agents/new">
              <Button>Add Host</Button>
            </Link>
          </div>
        </div>
        <Suspense fallback={<div>Loading...</div>}>
          <AgentsTable />
        </Suspense>
      </div>
    </AgentsErrorBoundary>
  )
}

