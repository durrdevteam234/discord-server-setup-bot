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
const cors = require('cors'); // ADDED: Imports Cross-Origin Resource Sharing
require('dotenv').config();

// ==========================================
// 1. DISCORD BOT CLIENT INITIALIZATION
// ==========================================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});
client.commands = new Collection();
client.prefix = process.env.PREFIX || '|';

// ==========================================
// 2. LOAD SLASH COMMANDS DYNAMICALLY
// ==========================================
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  for (const file of commandFiles) {
    try {
      const filePath = path.join(commandsPath, file);
      const command = require(filePath);
      if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
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
// 5. EXPRESS DASHBOARD + API SERVER
// ==========================================
const app = express();
const port = process.env.PORT || 10000;

// ADDED: Enables CORS middleware to allow external connections (like Google AI Studio/Cloud Run)
app.use(cors());

// Serve all static assets (CSS, images, frontend JS) out of the 'web' folder
app.use(express.static(path.join(__dirname, 'web')));

// UPDATED: Serves your actual dashboard frontend while satisfying 24/7 uptime pings
app.get('/', (req, res) => {
  const dashboardPath = path.join(__dirname, 'web', 'dashboard.html');
  
  if (fs.existsSync(dashboardPath)) {
    res.status(200).sendFile(dashboardPath);
  } else {
    // Fail-safe backup response so the server stays awake even if the HTML is misplaced
    res.status(200).send('ServerMiser Dashboard backend is active, but dashboard.html was not found.');
  }
});

// ── API: General stats ──
app.get('/api/stats', async (req, res) => {
  try {
    const db = mongoose.connection.db;

    const totalServers = client?.guilds?.cache?.size ?? 0;
    const totalUsers = client?.guilds?.cache?.reduce((acc, g) => acc + g.memberCount, 0) ?? 0;
    
    // ADDED: Reads the active WebSocket heartbeat latency safely from the gateway gateway
    const botPing = client?.ws?.ping !== -1 ? Math.round(client?.ws?.ping ?? 0) : 0;

    // ADDED: Converts raw internal running milliseconds down to standard layout syntax "0h 0m 0s"
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

    // UPDATED: Standardized payload keys to deliver data parameters
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
      name: c.data.name,
      description: c.data.description,
    }));
    res.json(cmds);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`[SERVER] Dashboard live on port ${port}`);
});

// ==========================================
// 6. LOGIN
// ==========================================
client.login(process.env.DISCORD_TOKEN);
