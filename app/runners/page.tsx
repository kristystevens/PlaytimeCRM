import { Suspense } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import RunnersTable from './runners-table'
import RunnersExportButton from './export-button'

export default function RunnersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Runners</h1>
          <p className="text-muted-foreground">Manage game runners</p>
        </div>
        <div className="flex gap-2">
          <RunnersExportButton />
          <Link href="/runners/new">
            <Button>Add Runner</Button>
          </Link>
        </div>
      </div>
      <Suspense fallback={<div>Loading...</div>}>
        <RunnersTable />
      </Suspense>
    </div>
  )
}

