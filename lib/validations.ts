import { z } from 'zod'

export const playerSchema = z.object({
  telegramHandle: z.string().min(1, 'Telegram handle is required'),
  ginzaUsername: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  playerType: z.enum(['PLAYER', 'RUNNER', 'AGENT']).optional(),
  isRunner: z.boolean().optional(),
  isAgent: z.boolean().optional(),
  // playerID is auto-assigned and cannot be updated by users
  vipTier: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional(),
  status: z.enum(['ACTIVE', 'FADING', 'CHURNED']).optional(),
  churnRisk: z.enum(['LOW', 'MED', 'HIGH']).optional(),
  skillLevel: z.enum(['WHALE', 'PRO', 'NIT', 'AMATEUR', 'PUNTER', 'INTERMEDIATE', 'ADVANCED', 'PROFESSIONAL']).optional(),
  tiltRisk: z.boolean().optional(),
  preferredGames: z.array(z.string()).optional(),
  notes: z.string().optional().nullable(),
  assignedRunnerId: z.string().uuid().optional().nullable(),
  referredByAgentId: z.string().uuid().optional().nullable(),
  lastActiveAt: z.string().datetime().optional().nullable(),
  totalDeposited: z.number().optional(),
  totalWagered: z.number().optional(),
  netPnL: z.number().optional(),
  avgBuyIn: z.number().optional(),
})

export const runnerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  telegramHandle: z.string().min(1, 'Telegram handle is required'),
  ginzaUsername: z.string().optional().nullable(),
  timezone: z.string().optional().nullable(),
  languages: z.array(z.string()).optional(),
  status: z.enum(['TRUSTED', 'WATCH', 'CUT']).optional(),
  bankrollAccess: z.boolean().optional(),
  maxTableSize: z.number().int().positive().optional(),
  strikeCount: z.number().int().min(0).optional(),
  compType: z.enum(['PERCENT', 'FLAT']).optional(),
  compValue: z.number().optional(),
  notes: z.string().optional().nullable(),
})

export const agentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  telegramHandle: z.string().min(1, 'Telegram handle is required'),
  ginzaUsername: z.string().optional().nullable(),
  timezone: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'APPROACHING']).optional(),
  notes: z.string().optional().nullable(),
})

export const payoutSchema = z.object({
  payeeType: z.enum(['RUNNER', 'AGENT']),
  payeeId: z.string().uuid(),
  amount: z.number().positive(),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  status: z.enum(['PENDING', 'PAID', 'VOID']).optional(),
})

export const messageTaskSchema = z.object({
  playerId: z.string().uuid().optional().nullable(),
  agentId: z.string().uuid().optional().nullable(),
  runnerId: z.string().optional().nullable(),
  channel: z.enum(['TELEGRAM', 'WHATSAPP', 'EMAIL', 'OTHER']),
  template: z.enum(['WHALE_CHECKIN', 'REVIVE', 'FOLLOWUP']),
  status: z.enum(['TODO', 'SENT', 'SKIPPED']).optional(),
  dueAt: z.string().datetime().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export const playtimeEntrySchema = z.object({
  playedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  startTime: z.string().optional(), // HH:mm format or ISO datetime string
  endTime: z.string().optional(), // HH:mm format or ISO datetime string
  minutes: z.number().int().min(0, 'Minutes must be non-negative').optional(),
  stakes: z.string().optional().nullable(), // Stakes information
}).refine(data => {
  if (data.startTime && data.endTime && data.minutes === undefined) {
    return true; // Minutes will be calculated
  }
  if (data.minutes !== undefined && !data.startTime && !data.endTime) {
    return true; // Manual minutes entry
  }
  return false; // Must have either times or minutes
}, {
  message: "Either provide start and end times, or provide minutes manually.",
  path: ["minutes"],
})

export const playtimeUpdateSchema = z.object({
  playedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  startTime: z.string().optional(), // ISO datetime string
  endTime: z.string().optional(), // ISO datetime string
  minutes: z.number().int().min(0, 'Minutes must be non-negative').optional(),
  stakes: z.string().optional().nullable(), // Stakes information
})