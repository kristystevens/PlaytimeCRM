'use client'

import { useRouter } from 'next/navigation'
import { Runner, Player, Payout, Agent } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

type PlayerWithAgent = Player & {
  referredByAgent: Pick<Agent, 'id' | 'name' | 'telegramHandle'> | null
}

type RunnerWithRelations = Runner & {
  player: Player | null
  assignedPlayers: PlayerWithAgent[]
  payouts: Payout[]
}

export default function RunnerDetail({ runner }: { runner: RunnerWithRelations }) {
  const router = useRouter()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{runner.name}</h1>
          <p className="text-muted-foreground">Runner Details</p>
        </div>
        <Button variant="outline" onClick={() => router.push('/runners')}>
          Back to Runners
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground">Telegram Handle</div>
              <div className="font-medium">{runner.telegramHandle}</div>
            </div>
            {runner.ginzaUsername && (
              <div>
                <div className="text-sm text-muted-foreground">Ginza Username</div>
                <div className="font-medium">{runner.ginzaUsername}</div>
              </div>
            )}
            <div>
              <div className="text-sm text-muted-foreground">Status</div>
              <Badge variant={runner.status === 'TRUSTED' ? 'default' : runner.status === 'WATCH' ? 'secondary' : 'destructive'}>
                {runner.status}
              </Badge>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Timezone</div>
              <div>{runner.timezone || 'Not set'}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Languages</div>
              <div>{(() => {
                try {
                  const langs = JSON.parse(runner.languages || '[]')
                  return Array.isArray(langs) && langs.length > 0 ? langs.join(', ') : 'None'
                } catch {
                  return 'None'
                }
              })()}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Bankroll Access</div>
              <div>{runner.bankrollAccess ? 'Yes' : 'No'}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Max Table Size</div>
              <div>{runner.maxTableSize}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Strike Count</div>
              <div>{runner.strikeCount}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Comp Type</div>
              <div>{runner.compType}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Comp Value</div>
              <div>${Number(runner.compValue).toLocaleString()}</div>
            </div>
            {runner.player && (
              <div>
                <div className="text-sm text-muted-foreground">Last Active</div>
                <div>{runner.player.lastActiveAt ? new Date(runner.player.lastActiveAt).toLocaleString() : 'Never'}</div>
              </div>
            )}
            {runner.notes && (
              <div>
                <div className="text-sm text-muted-foreground">Notes</div>
                <div>{runner.notes}</div>
              </div>
            )}
          </CardContent>
        </Card>

        {runner.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm whitespace-pre-wrap">{runner.notes}</div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Financials</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground">Total Paid</div>
              <div className="text-2xl font-bold">${Number(runner.totalPaid).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Outstanding Balance</div>
              <div className="text-xl">${Number(runner.outstandingBalance).toLocaleString()}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Assigned Players ({runner.assignedPlayers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {runner.assignedPlayers.map((player) => (
                <div key={player.id} className="flex items-center justify-between p-2 border rounded">
                  <Link href={`/players/${player.id}`} className="hover:underline">
                    {player.telegramHandle}
                  </Link>
                  <div className="text-sm text-muted-foreground">
                    {player.referredByAgent?.name && `Referred by ${player.referredByAgent.name}`}
                  </div>
                </div>
              ))}
              {runner.assignedPlayers.length === 0 && (
                <div className="text-sm text-muted-foreground">No assigned players</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Payout History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {runner.payouts.map((payout) => (
                <div key={payout.id} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <div className="font-medium">${Number(payout.amount).toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(payout.periodStart).toLocaleDateString()} - {new Date(payout.periodEnd).toLocaleDateString()}
                    </div>
                  </div>
                  <Badge variant={payout.status === 'PAID' ? 'default' : payout.status === 'PENDING' ? 'secondary' : 'destructive'}>
                    {payout.status}
                  </Badge>
                </div>
              ))}
              {runner.payouts.length === 0 && (
                <div className="text-sm text-muted-foreground">No payouts yet</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

