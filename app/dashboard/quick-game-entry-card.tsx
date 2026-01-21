'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

export default function QuickGameEntryCard() {
  const router = useRouter()
  const [ledgerText, setLedgerText] = useState('')

  useEffect(() => {
    // If there's a draft in localStorage (e.g., user came back), load it
    if (typeof window === 'undefined') return
    const draft = window.localStorage.getItem('gameLedgerDraft')
    if (draft) {
      setLedgerText(draft)
    }
  }, [])

  const handleEnterGame = () => {
    if (!ledgerText.trim()) {
      alert('Please paste the game ledger first')
      return
    }

    if (typeof window !== 'undefined') {
      window.localStorage.setItem('gameLedgerDraft', ledgerText)
    }
    router.push('/games/new')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Enter Game from Ledger</CardTitle>
        <CardDescription>
          Paste a game ledger here (Player, Buy-In, Cashout, PnL). You&apos;ll confirm details on the next screen.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          value={ledgerText}
          onChange={(e) => setLedgerText(e.target.value)}
          placeholder={`Example:\n\nPlayer\n\nBuy-In\n\nCashout\n\nPnL\n\ngingjongun\n\n2,000.00\n\n3,693.09\n\n+1,693.10`}
          className="min-h-32 font-mono text-sm"
        />
        <div className="flex justify-end">
          <Button type="button" onClick={handleEnterGame}>
            Enter Game
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

