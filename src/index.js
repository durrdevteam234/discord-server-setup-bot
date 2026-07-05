if (typeof globalThis.ReadableStream === 'undefined') {
    try {
        const { ReadableStream } = require('node:stream/web');
        globalThis.ReadableStream = ReadableStream;
    } catch (e) {}
}
const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors'); 
require('dotenv').config();

// ==========================================
// 1. DISCORD BOT CLIENT INITIALIZATION
// ==========================================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // Required to read prefix command text!
    GatewayIntentBits.GuildMembers
  ]
});
client.commands = new Collection();
client.prefix = process.env.PREFIX || '|';

// ==========================================
// 2. LOAD COMMANDS DYNAMICALLY (SLASH & PREFIX)
// ==========================================
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  for (const file of commandFiles) {
    try {
      const filePath = path.join(commandsPath, file);
      const command = require(filePath);
      
      // FIX: Check if it's a Slash Command OR a traditional Prefix Command
      if (command.data && command.data.name) {
        // Standard slash command setup
        client.commands.set(command.data.name, command);
      } else if (command.name) {
        // Traditional prefix command setup (if your legacy files export { name: 'hug', executePrefix: ... })
        client.commands.set(command.name.toLowerCase(), command);
      } else if (command.executePrefix) {
        // If you named the file 'hug.js' but didn't provide a .name inside, use the filename
        const fallbackName = file.split('.')[0].toLowerCase();
        client.commands.set(fallbackName, command);
      }
    } catch (cmdErr) {
      console.error('[STARTUP ERROR] Failed to load command file ' + file + ':', cmdErr.message);
    }
  }
}

// ==========================================
// 3. LOAD EVENT HANDLERS DYNAMICALLY
// ==========================================
const eventsPath = path.join(__dirname, 'events');
console.log('[STARTUP] Checking events directory path: ' + eventsPath);
if (fs.existsSync(eventsPath)) {
  const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
  console.log('[STARTUP] Found ' + eventFiles.length + ' event files to load.');
  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    try {
      const event = require(filePath);
      console.log('[STARTUP] Successfully linked event handler file: ' + file + ' -> Event Name: ' + event.name);
      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
      } else {
        client.on(event.name, (...args) => event.execute(...args, client));
      }
    } catch (eventErr) {
      console.error('❌ [STARTUP ERROR] CRITICAL ERROR IN FILE "' + file + '":', eventErr.stack);
    }
  }
} else {
  console.error('[CRITICAL] The events folder path does not exist!');
}

// ==========================================
// 4. MONGODB ATLAS CONNECTION
// ==========================================
if (!process.env.MONGODB_URI) {
  console.error('[CRITICAL] MONGODB_URI environment variable is missing!');
} else {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('[DATABASE] Connected to MongoDB Atlas successfully!'))
    .catch(err => console.error('[DATABASE ERROR] MongoDB connection error:', err));
}

// ==========================================
// 5. EXPRESS API SERVER
// ==========================================
const app = express();
const port = process.env.PORT || 10000;

app.use(cors());

app.get('/', (req, res) => {
  res.status(200).send('ServerMiser Dashboard API backend is active and fully functional.');
});

// ── API: General stats ──
app.get('/api/stats', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const totalServers = client?.guilds?.cache?.size ?? 0;
    const totalUsers = client?.guilds?.cache?.reduce((acc, g) => acc + g.memberCount, 0) ?? 0;
    const botPing = client?.ws?.ping !== -1 ? Math.round(client?.ws?.ping ?? 0) : 0;

    const totalSeconds = (client?.uptime ?? 0) / 1000;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const uptimeString = client?.readyAt ? `${hours}h ${minutes}m ${seconds}s` : "0h 0m 0s";

    let totalXp = 0;
    let leveledUsers = 0;
    try {
      const levelDocs = await db.collection('levels').find().toArray();
      for (const doc of levelDocs) {
        if (doc.value && typeof doc.value === 'object') {
          for (const guildData of Object.values(doc.value)) {
            if (typeof guildData === 'object') {
              for (const userData of Object.values(guildData)) {
                totalXp += userData.xp || 0;
                leveledUsers++;
              }
            }
          }
        }
      }
    } catch (_) {}

    let totalTickets = 0;
    try {
      totalTickets = await db.collection('tickets').countDocuments();
    } catch (_) {}

    res.json({
      status: client?.readyAt ? "online" : "offline",
      totalServers,
      totalUsers,
      botPing,
      uptimeString,
      leveledUsers,
      totalXp,
      totalTickets,
      uptimeSeconds: Math.floor(process.uptime()),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── API: Top servers by total XP ──
app.get('/api/leaderboard', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const levelDocs = await db.collection('levels').find().toArray();

    const serverTotals = [];
    for (const doc of levelDocs) {
      if (doc.value && typeof doc.value === 'object') {
        for (const [guildId, guildData] of Object.entries(doc.value)) {
          if (typeof guildData === 'object') {
            let xp = 0;
            for (const userData of Object.values(guildData)) {
              xp += (userData.xp || 0) + (userData.level || 1) * 100;
            }
            const guild = client?.guilds?.cache?.get(guildId)
              || await client?.guilds?.fetch(guildId).catch(() => null);
            serverTotals.push({ name: guild?.name || 'Unknown Server', totalXp: xp });
          }
        }
      }
    }

    serverTotals.sort((a, b) => b.totalXp - a.totalXp);
    res.json(serverTotals.slice(0, 10));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── API: Commands list ──
app.get('/api/commands', (req, res) => {
  try {
    const cmds = [...(client?.commands?.values() || [])].map(c => ({
      name: c.data?.name || c.name || "unknown",
      description: c.data?.description || "Prefix-only command",
    }));
    res.json(cmds);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`[SERVER] Live telemetry API server streaming on port ${port}`);
});

// ==========================================
// 6. LOGIN
// ==========================================
client.login(process.env.DISCORD_TOKEN);