import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  // Check DATABASE_URL at runtime, not at module load time
  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL environment variable is not set. ' +
      'Please set it in your environment variables or .env.local file. ' +
      `Current env keys: ${Object.keys(process.env).filter(k => k.includes('DATABASE')).join(', ') || 'none'}`
    )
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    // Configure for serverless environments
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })
}

// Use singleton pattern for both development and production (important for serverless)
export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma
}

// Handle graceful shutdown in serverless environments
if (process.env.NODE_ENV === 'production') {
  // Disconnect on process termination
  process.on('beforeExit', async () => {
    await prisma.$disconnect()
  })
}

