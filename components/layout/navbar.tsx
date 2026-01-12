'use client'

import Link from 'next/link'

export function Navbar() {
  return (
    <nav className="border-b bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-6">
            <Link href="/dashboard" className="text-xl font-bold">
              Playtime CRM
            </Link>
            <Link href="/dashboard" className="text-sm hover:text-primary">
              Dashboard
            </Link>
            <Link href="/players" className="text-sm hover:text-primary">
              Players
            </Link>
            <Link href="/agents" className="text-sm hover:text-primary">
              Hosts
            </Link>
            <Link href="/activity" className="text-sm hover:text-primary">
              Activity
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}

