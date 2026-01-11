'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

// Accept any agent type - we'll handle the optional player field safely
export default function AgentDetail({ agent }: { agent: any }) {
  const router = useRouter()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{agent.name}</h1>
          <p className="text-muted-foreground">Agent Details</p>
        </div>
        <Button variant="outline" onClick={() => router.push('/agents')}>
          Back to Agents
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
              <div className="font-medium">{agent.telegramHandle}</div>
            </div>
            {agent.ginzaUsername && (
              <div>
                <div className="text-sm text-muted-foreground">Ginza Username</div>
                <div className="font-medium">{agent.ginzaUsername}</div>
              </div>
            )}
            <div>
              <div className="text-sm text-muted-foreground">Status</div>
              <Badge variant={agent.status === 'ACTIVE' ? 'default' : agent.status === 'INACTIVE' ? 'destructive' : 'secondary'}>
                {agent.status}
              </Badge>
            </div>
            {agent.timezone && (
              <div>
                <div className="text-sm text-muted-foreground">Timezone</div>
                <div>{agent.timezone}</div>
              </div>
            )}
            {agent.player && (
              <div>
                <div className="text-sm text-muted-foreground">Last Active</div>
                <div>{agent.player.lastActiveAt ? new Date(agent.player.lastActiveAt).toLocaleString() : 'Never'}</div>
              </div>
            )}
            {agent.notes && (
              <div>
                <div className="text-sm text-muted-foreground">Notes</div>
                <div>{agent.notes}</div>
              </div>
            )}
          </CardContent>
        </Card>

        {agent.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm whitespace-pre-wrap">{agent.notes}</div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Financials</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground">Total Earned</div>
              <div className="text-2xl font-bold">${Number(agent.totalEarned).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Total Paid</div>
              <div className="text-xl">${Number(agent.totalPaid).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Unpaid Balance</div>
              <div className="text-xl">${Number(agent.unpaidBalance).toLocaleString()}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Referred Players ({agent.referredPlayers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {agent.referredPlayers.map((player: any) => (
                <div key={player.id} className="flex items-center justify-between p-2 border rounded">
                  <Link href={`/players/${player.id}`} className="hover:underline">
                    {player.telegramHandle}
                  </Link>
                  <div className="text-sm text-muted-foreground">
                    {player.assignedRunner?.name && `Runner: ${player.assignedRunner.name}`}
                  </div>
                </div>
              ))}
              {agent.referredPlayers.length === 0 && (
                <div className="text-sm text-muted-foreground">No referred players</div>
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
              {agent.payouts.map((payout: any) => (
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
              {agent.payouts.length === 0 && (
                <div className="text-sm text-muted-foreground">No payouts yet</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

