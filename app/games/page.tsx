import { Suspense } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import GamesTable from './games-table'

export default function GamesPage() {
  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold">Games</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            View all game ledgers and player participation
          </p>
          <Link href="/" className="inline-block text-sm text-primary hover:underline">
            ← Back to Home
          </Link>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center">
          <Link href="/">
            <Button variant="outline" className="w-full sm:w-auto">
              Home
            </Button>
          </Link>
          <Link href="/games/new">
            <Button className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">New Game</span>
              <span className="sm:hidden">New</span>
            </Button>
          </Link>
        </div>
      </div>
      <Suspense fallback={<div>Loading...</div>}>
        <GamesTable />
      </Suspense>
    </div>
  )
}
