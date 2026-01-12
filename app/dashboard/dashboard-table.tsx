'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { formatMinutes } from '@/lib/playtime-utils'
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Player = {
  id: string
  telegramHandle: string
  ginzaUsername: string | null
  playerID?: string | null
  status: string
  country: string | null
  skillLevel: string
  churnRisk: string
  vipTier: string
  totalPlaytime: number
  lastActiveAt: Date | null
  assignedRunner: { id: string; name: string } | null
  referredByAgent: { id: string; name: string } | null
  isRunner?: boolean
  isAgent?: boolean
  mostActiveTimes?: string | null
  notes?: string | null
  walletAddress?: string | null
}

type Agent = {
  id: string
  name: string
  telegramHandle: string
  active7d: number
  referredPlayers: any[]
}

type Runner = {
  id: string
  name: string
  telegramHandle: string
  active7d: number
  retention: number
  assignedPlayers: any[]
}

export default function DashboardTable({
  players,
  agents,
  runners,
}: {
  players: Player[]
  agents: Agent[]
  runners: Runner[]
}) {
  // Ensure all props are arrays
  const router = useRouter()
  const safePlayers = Array.isArray(players) ? players : []
  const safeAgents = Array.isArray(agents) ? agents : []
  const safeRunners = Array.isArray(runners) ? runners : []
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const toggleRow = (id: string, e?: React.MouseEvent) => {
    // Stop propagation if called from a button click
    if (e) {
      e.stopPropagation()
    }
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedRows(newExpanded)
  }

  const navigateToPlayer = (playerId: string) => {
    router.push(`/players/${playerId}`)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top 10 Players by Playtime</CardTitle>
        <CardDescription>Click on a row to view player details, or use the buttons to toggle quick view / view full page</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 font-medium">Rank</th>
                <th className="text-left p-3 font-medium">Player</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Total Playtime</th>
                <th className="text-left p-3 font-medium">Last Active</th>
                <th className="text-left p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {safePlayers.map((player, idx) => {
                const isExpanded = expandedRows.has(player.id)
                return (
                  <>
                    <tr
                      key={player.id}
                      className="border-b hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => navigateToPlayer(player.id)}
                    >
                      <td className="p-3">#{idx + 1}</td>
                      <td className="p-3">
                        <div className="flex flex-col">
                          <span className="font-medium">{player.telegramHandle}</span>
                          {player.playerID && (
                            <span className="text-xs text-muted-foreground">ID: {player.playerID}</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          <Badge
                            className={
                              player.status === 'ACTIVE'
                                ? 'bg-green-500'
                                : player.status === 'FADING'
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                            }
                          >
                            {player.status}
                          </Badge>
                          {player.isAgent && (
                            <Badge className="bg-purple-500 text-white">Host</Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-3">{formatMinutes(player.totalPlaytime)}</td>
                      <td className="p-3 text-sm">
                        {player.lastActiveAt
                          ? new Date(player.lastActiveAt).toLocaleString()
                          : '-'}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => toggleRow(player.id, e)}
                            title="Toggle quick details"
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              navigateToPlayer(player.id)
                            }}
                            title="View full details"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${player.id}-details`} className="bg-muted/30">
                        <td colSpan={6} className="p-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Ginza Username</p>
                              <p className="font-medium">{player.ginzaUsername || '-'}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Country</p>
                              <p className="font-medium">{player.country || '-'}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Skill Level</p>
                              <p className="font-medium">{player.skillLevel}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Churn Risk</p>
                              <p className="font-medium">{player.churnRisk}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">VIP Tier</p>
                              <p className="font-medium">{player.vipTier}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Most Active Times (EST)</p>
                              <p className="font-medium">{player.mostActiveTimes || '-'}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Assigned Runner</p>
                              <p className="font-medium">
                                {player.assignedRunner ? (
                                  <Link
                                    href={`/runners/${player.assignedRunner.id}`}
                                    className="hover:underline"
                                  >
                                    {player.assignedRunner.name}
                                  </Link>
                                ) : (
                                  '-'
                                )}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Referred By Agent</p>
                              <p className="font-medium">
                                {player.referredByAgent ? (
                                  <Link
                                    href={`/agents/${player.referredByAgent.id}`}
                                    className="hover:underline"
                                  >
                                    {player.referredByAgent.name}
                                  </Link>
                                ) : (
                                  '-'
                                )}
                              </p>
                            </div>
                            {player.notes && (
                              <div className="col-span-2 md:col-span-4">
                                <p className="text-muted-foreground">Notes</p>
                                <p className="font-medium">{player.notes}</p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
