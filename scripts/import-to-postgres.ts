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

async function importData() {
  console.log('Starting data import to PostgreSQL...');

  // Read export file
  const exportPath = path.join(__dirname, 'sqlite-export.json');
  
  if (!fs.existsSync(exportPath)) {
    throw new Error(`Export file not found: ${exportPath}\nPlease run 'npm run export-sqlite' first.`);
  }

  const data: ExportData = JSON.parse(fs.readFileSync(exportPath, 'utf-8'));

  console.log(`\nImport summary:`);
  console.log(`  - Users: ${data.users.length}`);
  console.log(`  - Players: ${data.players.length}`);
  console.log(`  - Runners: ${data.runners.length}`);
  console.log(`  - Agents: ${data.agents.length}`);
  console.log(`  - Activity Logs: ${data.activityLogs.length}`);
  console.log(`  - Payouts: ${data.payouts.length}`);
  console.log(`  - Message Tasks: ${data.messageTasks.length}`);
  console.log(`  - Playtime Entries: ${data.playtimeEntries.length}`);
  console.log(`  - Games: ${data.games.length}`);
  console.log(`  - Game Players: ${data.gamePlayers.length}\n`);

  try {
    // Import in correct order (respecting foreign key constraints)
    
    // 1. Users (no dependencies)
    if (data.users.length > 0) {
      console.log('Importing users...');
      for (const user of data.users) {
        await prisma.user.upsert({
          where: { id: user.id },
          update: user,
          create: user,
        });
      }
      console.log(`✅ Imported ${data.users.length} users`);
    }

    // 2. Players (no dependencies on other tables)
    if (data.players.length > 0) {
      console.log('Importing players...');
      for (const player of data.players) {
        await prisma.player.upsert({
          where: { id: player.id },
          update: player,
          create: player,
        });
      }
      console.log(`✅ Imported ${data.players.length} players`);
    }

    // 3. Runners (depends on users and players)
    if (data.runners.length > 0) {
      console.log('Importing runners...');
      for (const runner of data.runners) {
        await prisma.runner.upsert({
          where: { id: runner.id },
          update: runner,
          create: runner,
        });
      }
      console.log(`✅ Imported ${data.runners.length} runners`);
    }

    // 4. Agents (depends on users and players)
    if (data.agents.length > 0) {
      console.log('Importing agents...');
      for (const agent of data.agents) {
        await prisma.agent.upsert({
          where: { id: agent.id },
          update: agent,
          create: agent,
        });
      }
      console.log(`✅ Imported ${data.agents.length} agents`);
    }

    // 5. Activity Logs (depends on users)
    if (data.activityLogs.length > 0) {
      console.log('Importing activity logs...');
      for (const log of data.activityLogs) {
        await prisma.activityLog.upsert({
          where: { id: log.id },
          update: log,
          create: log,
        });
      }
      console.log(`✅ Imported ${data.activityLogs.length} activity logs`);
    }

    // 6. Payouts (depends on runners and agents)
    if (data.payouts.length > 0) {
      console.log('Importing payouts...');
      for (const payout of data.payouts) {
        await prisma.payout.upsert({
          where: { id: payout.id },
          update: payout,
          create: payout,
        });
      }
      console.log(`✅ Imported ${data.payouts.length} payouts`);
    }

    // 7. Message Tasks (depends on players and agents)
    if (data.messageTasks.length > 0) {
      console.log('Importing message tasks...');
      for (const task of data.messageTasks) {
        await prisma.messageTask.upsert({
          where: { id: task.id },
          update: task,
          create: task,
        });
      }
      console.log(`✅ Imported ${data.messageTasks.length} message tasks`);
    }

    // 8. Playtime Entries (depends on players)
    if (data.playtimeEntries.length > 0) {
      console.log('Importing playtime entries...');
      for (const entry of data.playtimeEntries) {
        await prisma.playtimeEntry.upsert({
          where: {
            playerId_playedOn: {
              playerId: entry.playerId,
              playedOn: new Date(entry.playedOn),
            },
          },
          update: entry,
          create: entry,
        });
      }
      console.log(`✅ Imported ${data.playtimeEntries.length} playtime entries`);
    }

    // 9. Games (depends on agents)
    if (data.games.length > 0) {
      console.log('Importing games...');
      for (const game of data.games) {
        await prisma.game.upsert({
          where: { id: game.id },
          update: game,
          create: game,
        });
      }
      console.log(`✅ Imported ${data.games.length} games`);
    }

    // 10. Game Players (depends on games and players)
    if (data.gamePlayers.length > 0) {
      console.log('Importing game players...');
      for (const gamePlayer of data.gamePlayers) {
        await prisma.gamePlayer.upsert({
          where: { id: gamePlayer.id },
          update: gamePlayer,
          create: gamePlayer,
        });
      }
      console.log(`✅ Imported ${data.gamePlayers.length} game players`);
    }

    console.log('\n✅ All data imported successfully!');
  } catch (error) {
    console.error('❌ Error importing data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

importData()
  .then(() => {
    console.log('\n✅ Import complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Import failed:', error);
    process.exit(1);
  });
