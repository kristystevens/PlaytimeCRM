import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Recreating playtime_entries table with String columns for start_time and end_time...')
  
  // Get all existing data
  const entries = await prisma.$queryRaw<Array<{
    id: string
    player_id: string
    played_on: Date
    start_time: string | null
    end_time: string | null
    minutes: number
    created_at: Date
    updated_at: Date
  }>>`
    SELECT * FROM playtime_entries
  `
  
  console.log(`Backing up ${entries.length} entries`)
  
  // Drop the old table
  await prisma.$executeRaw`DROP TABLE IF EXISTS playtime_entries`
  
  // Create new table with String columns
  await prisma.$executeRaw`
    CREATE TABLE playtime_entries (
      id TEXT PRIMARY KEY NOT NULL,
      player_id TEXT NOT NULL,
      played_on DATETIME NOT NULL,
      start_time TEXT,
      end_time TEXT,
      minutes INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
    )
  `
  
  // Create indexes
  await prisma.$executeRaw`
    CREATE UNIQUE INDEX playtime_entries_player_id_played_on_key ON playtime_entries(player_id, played_on)
  `
  
  await prisma.$executeRaw`
    CREATE INDEX playtime_entries_player_id_played_on_idx ON playtime_entries(player_id, played_on)
  `
  
  // Restore data
  for (const entry of entries) {
    await prisma.$executeRaw`
      INSERT INTO playtime_entries (id, player_id, played_on, start_time, end_time, minutes, created_at, updated_at)
      VALUES (${entry.id}, ${entry.player_id}, ${entry.played_on}, ${entry.start_time}, ${entry.end_time}, ${entry.minutes}, ${entry.created_at}, ${entry.updated_at})
    `
  }
  
  console.log(`Restored ${entries.length} entries`)
  console.log('Table recreated successfully!')
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

