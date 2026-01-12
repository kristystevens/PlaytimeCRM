import { Navbar } from '@/components/layout/navbar'

export default function PlayersLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Navbar />
      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">{children}</main>
    </>
  )
}

