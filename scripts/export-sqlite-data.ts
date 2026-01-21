import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface ExportData {
  users: any[];
  players: any[];
  runners: any[];
  agents: any[];
  activityLogs: any[];
  payouts: any[];
  messageTasks: any[];
  playtimeEntries: any[];
  games: any[];
  gamePlayers: any[];
}

async function exportData() {
  console.log('Starting data export from SQLite...');

  try {
    // Export all data
    const data: ExportData = {
      users: await prisma.user.findMany(),
      players: await prisma.player.findMany(),
      runners: await prisma.runner.findMany(),
      agents: await prisma.agent.findMany(),
      activityLogs: await prisma.activityLog.findMany(),
      payouts: await prisma.payout.findMany(),
      messageTasks: await prisma.messageTask.findMany(),
      playtimeEntries: await prisma.playtimeEntry.findMany(),
      games: await prisma.game.findMany(),
      gamePlayers: await prisma.gamePlayer.findMany(),
    };

    // Write to JSON file
    const exportPath = path.join(__dirname, 'sqlite-export.json');
    fs.writeFileSync(exportPath, JSON.stringify(data, null, 2));

    console.log(`✅ Data exported successfully to ${exportPath}`);
    console.log(`\nExport summary:`);
    console.log(`  - Users: ${data.users.length}`);
    console.log(`  - Players: ${data.players.length}`);
    console.log(`  - Runners: ${data.runners.length}`);
    console.log(`  - Agents: ${data.agents.length}`);
    console.log(`  - Activity Logs: ${data.activityLogs.length}`);
    console.log(`  - Payouts: ${data.payouts.length}`);
    console.log(`  - Message Tasks: ${data.messageTasks.length}`);
    console.log(`  - Playtime Entries: ${data.playtimeEntries.length}`);
    console.log(`  - Games: ${data.games.length}`);
    console.log(`  - Game Players: ${data.gamePlayers.length}`);

    return exportPath;
  } catch (error) {
    console.error('❌ Error exporting data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

exportData()
  .then(() => {
    console.log('\n✅ Export complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Export failed:', error);
    process.exit(1);
  });
