import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { payoutSchema } from '@/lib/validations'
import { logActivity } from '@/lib/activity-log'

export async function GET(request: NextRequest) {
  try {

    const searchParams = request.nextUrl.searchParams
    const payeeType = searchParams.get('payeeType')
    const payeeId = searchParams.get('payeeId')
    const status = searchParams.get('status')

    const where: any = {}
    if (payeeType) where.payeeType = payeeType
    if (payeeId) where.payeeId = payeeId
    if (status) where.status = status

    const payouts = await prisma.payout.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        runner: {
          select: {
            id: true,
            name: true,
            telegramHandle: true,
          },
        },
        agent: {
          select: {
            id: true,
            name: true,
            telegramHandle: true,
          },
        },
      },
    })

    return NextResponse.json(payouts)
  } catch (error) {
    console.error('Error fetching payouts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = payoutSchema.parse(body)

    const payout = await prisma.payout.create({
      data: {
        payeeType: validated.payeeType,
        payeeId: validated.payeeId,
        runnerId: validated.payeeType === 'RUNNER' ? validated.payeeId : null,
        agentId: validated.payeeType === 'AGENT' ? validated.payeeId : null,
        amount: validated.amount,
        periodStart: new Date(validated.periodStart),
        periodEnd: new Date(validated.periodEnd),
        status: validated.status || 'PENDING',
      },
    })

    const systemUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
    if (systemUser) {
      await logActivity(systemUser.id, 'PAYOUT', payout.id, 'CREATE', {
        payeeType: validated.payeeType,
        payeeId: validated.payeeId,
        amount: validated.amount,
      })
    }

    return NextResponse.json(payout, { status: 201 })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    console.error('Error creating payout:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

