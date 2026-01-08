import { Suspense } from 'react'
import PlayersTable from './players-table'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import PlayersTableExportButton from './export-button'

export default function PlayersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Players</h1>
          <p className="text-muted-foreground">Manage your player base</p>
        </div>
        <div className="flex gap-2">
          <PlayersTableExportButton />
          <Link href="/players/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Player
            </Button>
          </Link>
        </div>
      </div>
      <Suspense fallback={<div>Loading...</div>}>
        <PlayersTable />
      </Suspense>
    </div>
  )
}

