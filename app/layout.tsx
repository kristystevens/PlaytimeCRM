import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ErrorFilter } from '@/components/error-filter'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Playtime CRM',
  description: 'CRM for managing Players, Runners, and Agents',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ErrorFilter />
        {children}
      </body>
    </html>
  )
}

