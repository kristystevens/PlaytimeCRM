import { Suspense } from 'react'
import PlayersTableNew from './players-table-new'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import PlayersTableExportButton from './export-button'

export default function PlayersPage() {
  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Players</h1>
          <p className="text-sm md:text-base text-muted-foreground">Manage your player base</p>
        </div>
        <div className="flex gap-2">
          <PlayersTableExportButton />
          <Link href="/players/new">
            <Button className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">New Player</span>
              <span className="sm:hidden">New</span>
            </Button>
          </Link>
        </div>
      </div>
      <Suspense fallback={<div>Loading...</div>}>
        <PlayersTableNew />
      </Suspense>
    </div>
  )
}

