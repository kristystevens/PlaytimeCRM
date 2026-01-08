import { prisma } from './prisma'

export async function logActivity(
  actorUserId: string,
  entityType: string,
  entityId: string,
  action: string,
  changes?: Record<string, any>
) {
  try {
    await prisma.activityLog.create({
      data: {
        actorUserId,
        entityType,
        entityId,
        action,
        changes: changes ? JSON.stringify(changes) : null,
      },
    })
  } catch (error) {
    // Log error but don't throw - activity logging should not break main operations
    console.error('Failed to log activity:', error)
  }
}

