import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { messageTaskSchema } from '@/lib/validations'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {

    const body = await request.json()
    const validated = messageTaskSchema.partial().parse(body)

    const task = await prisma.messageTask.update({
      where: { id: params.id },
      data: {
        status: validated.status,
        notes: validated.notes,
      },
    })

    return NextResponse.json(task)
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    console.error('Error updating message task:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

