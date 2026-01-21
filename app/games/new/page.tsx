'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Agent } from '@prisma/client'
import { capitalizeFirst } from '@/lib/utils'

type LedgerEntry = {
  player: string
  buyIn: string
  cashout: string
  pnl: string
  timeRanges: string[]
}

export default function NewGamePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [ledgerText, setLedgerText] = useState('')
  const [parsedEntries, setParsedEntries] = useState<LedgerEntry[]>([])
  const [hostId, setHostId] = useState<string>('')
  const [playedAt, setPlayedAt] = useState('')
  const [playedTime, setPlayedTime] = useState('')
  const [agents, setAgents] = useState<Agent[]>([])

  // Fetch agents on mount
  useEffect(() => {
    fetch('/api/agents')
      .then(r => r.json())
      .then(data => setAgents(Array.isArray(data) ? data : []))
      .catch(err => {
        console.error('Error fetching agents:', err)
        setAgents([])
      })

    // If there is a draft ledger from the dashboard, load it once
    if (typeof window !== 'undefined') {
      const draft = window.localStorage.getItem('gameLedgerDraft')
      if (draft && !ledgerText) {
        setLedgerText(draft)
        window.localStorage.removeItem('gameLedgerDraft')
      }
    }
  }, [ledgerText])

  const parseLedger = () => {
    if (!ledgerText.trim()) {
      alert('Please paste the ledger data')
      return
    }

    const lines = ledgerText.split('\n').map(line => line.trim())
    const entries: LedgerEntry[] = []
    
    // Header keywords to ignore
    const headerKeywords = ['player', 'buy-in', 'buyin', 'cashout', 'pnl', 'p&l']
    
    // Parse vertical format: player name, buy-in, cashout, pnl (each on separate lines)
    let i = 0
    while (i < lines.length) {
      // Skip empty lines
      while (i < lines.length && !lines[i]) {
        i++
      }
      if (i >= lines.length) break

      const player = lines[i]
      
      // Skip header rows (case-insensitive)
      const lowerPlayer = player.toLowerCase()
      if (headerKeywords.includes(lowerPlayer)) {
        i++
        continue
      }

      // Check if this looks like a player name (not a number)
      if (!player || /^[\d,+\-.\s$]+$/.test(player)) {
        i++
        continue
      }

      // Find the next 3 non-empty, non-header lines for buy-in, cashout, pnl
      let buyIn = ''
      let cashout = ''
      let pnl = ''
      let found = 0
      let j = i + 1
      
      while (j < lines.length && found < 3) {
        const line = lines[j]
        if (!line) {
          // Empty line, skip
          j++
          continue
        }
        
        const lowerLine = line.toLowerCase()
        if (headerKeywords.includes(lowerLine)) {
          // Header keyword, skip
          j++
          continue
        }
        
        // This should be a number (buy-in, cashout, or pnl)
        if (found === 0) {
          buyIn = line
        } else if (found === 1) {
          cashout = line
        } else if (found === 2) {
          pnl = line
        }
        found++
        j++
      }

      // If we didn't find all 3 values, this isn't a valid entry
      if (found < 3) {
        i++
        continue
      }

      // Validate that buy-in, cashout, and pnl are numbers
      const buyInNum = parseFloat(buyIn.replace(/[,$+\-\s]/g, ''))
      const cashoutNum = parseFloat(cashout.replace(/[,$+\-\s]/g, ''))
      const pnlNum = parseFloat(pnl.replace(/[,$+\-\s]/g, ''))

      if (isNaN(buyInNum) || isNaN(cashoutNum) || isNaN(pnlNum)) {
        // This doesn't look like a valid entry, skip it
        i++
        continue
      }

      entries.push({
        player: player.trim(),
        buyIn: buyIn.trim(),
        cashout: cashout.trim(),
        pnl: pnl.trim(),
        // Start with a single empty time range input; user can add more
        timeRanges: [''],
      })

      // Move to next potential player (after the 3 values we just processed)
      i = j
    }

    if (entries.length === 0) {
      alert('No valid entries found. Please check the format. Expected format: Player name on one line, Buy-In on next line, Cashout on next line, PnL on next line, then repeat for each player.')
      return
    }

    setParsedEntries(entries)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (parsedEntries.length === 0) {
      alert('Please parse the ledger data first')
      return
    }

    if (!playedAt) {
      alert('Please enter the date and time of the game')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ledgerData: parsedEntries,
          hostId: hostId && hostId !== 'none' ? hostId : null,
          playedAt: playedAt,
          playedTime: playedTime,
        }),
      })

      if (res.ok) {
        router.push('/games')
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to create game')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Import Game Ledger</CardTitle>
          <CardDescription>
            Paste the game ledger data below. Format: Each player should have 4 lines in order:
            <br />1. Player name
            <br />2. Buy-In
            <br />3. Cashout
            <br />4. PnL
            <br />Then repeat for the next player. Empty lines between players are fine.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ledgerText">Ledger Data</Label>
            <Textarea
              id="ledgerText"
              value={ledgerText}
              onChange={(e) => setLedgerText(e.target.value)}
              placeholder="Paste ledger data here..."
              className="min-h-32 font-mono text-sm"
            />
          </div>
          <Button type="button" onClick={parseLedger} variant="outline">
            Parse Ledger
          </Button>
        </CardContent>
      </Card>

      {parsedEntries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Review & Enter Details</CardTitle>
            <CardDescription>
              Review the parsed entries and enter playtime for each player, plus game details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hostId">Host (Agent)</Label>
                  <Select value={hostId || undefined} onValueChange={(val) => setHostId(val === 'none' ? '' : val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select host" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Host</SelectItem>
                      {agents.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {capitalizeFirst(agent.ginzaUsername) || agent.name || capitalizeFirst(agent.telegramHandle)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="playedAt">Date & Time</Label>
                  <Input
                    id="playedAt"
                    type="datetime-local"
                    value={playedAt}
                    onChange={(e) => setPlayedAt(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="playedTime">Game Time Range (optional)</Label>
                <Input
                  id="playedTime"
                  value={playedTime}
                  onChange={(e) => setPlayedTime(e.target.value)}
                  placeholder="e.g., 7:00 PM - 9:30 PM"
                />
                <p className="text-xs text-muted-foreground">
                  Optional: Enter the time range for the game to help calculate playtime
                </p>
              </div>

              <div className="space-y-4">
                <Label>Player Entries</Label>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-2 text-left">Player</th>
                        <th className="p-2 text-left">Buy-In</th>
                        <th className="p-2 text-left">Cashout</th>
                        <th className="p-2 text-left">PnL</th>
                        <th className="p-2 text-left">Playtime Ranges (EST)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedEntries.map((entry, index) => (
                        <tr key={index} className="border-b align-top">
                          <td className="p-2">{entry.player}</td>
                          <td className="p-2">{entry.buyIn}</td>
                          <td className="p-2">{entry.cashout}</td>
                          <td className="p-2">{entry.pnl}</td>
                          <td className="p-2">
                            <div className="space-y-2">
                              {(entry.timeRanges && entry.timeRanges.length > 0 ? entry.timeRanges : ['']).map(
                                (range, rIdx) => (
                                  <div key={rIdx} className="flex items-center gap-2">
                                    <Input
                                      value={range}
                                      onChange={(e) => {
                                        const newEntries = [...parsedEntries]
                                        const ranges = newEntries[index].timeRanges || []
                                        ranges[rIdx] = e.target.value
                                        newEntries[index].timeRanges = ranges
                                        setParsedEntries(newEntries)
                                      }}
                                      placeholder={rIdx === 0 ? 'e.g., 2pm-5pm' : 'e.g., 6pm-7pm'}
                                      maxLength={50}
                                    />
                                    {rIdx === (entry.timeRanges?.length || 1) - 1 && (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={() => {
                                          const newEntries = [...parsedEntries]
                                          const ranges = newEntries[index].timeRanges || []
                                          newEntries[index].timeRanges = [...ranges, '']
                                          setParsedEntries(newEntries)
                                        }}
                                      >
                                        +
                                      </Button>
                                    )}
                                    {entry.timeRanges && entry.timeRanges.length > 1 && (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={() => {
                                          const newEntries = [...parsedEntries]
                                          const ranges = newEntries[index].timeRanges || []
                                          ranges.splice(rIdx, 1)
                                          newEntries[index].timeRanges = ranges.length ? ranges : ['']
                                          setParsedEntries(newEntries)
                                        }}
                                      >
                                        -
                                      </Button>
                                    )}
                                  </div>
                                ),
                              )}
                              <p className="text-xs text-muted-foreground">
                                Enter one or more time ranges in EST (e.g., 2pm-5pm, then add another like 6pm-7pm)
                              </p>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Entering...' : 'Enter Game'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
