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
  GatewayIntentBits.MessageContent, 
  GatewayIntentBits.GuildMembers
]
});
client.commands = new Collection();
client.prefix = process.env.PREFIX || '|';

// 🌟 FIX 1: Attach absolute WebSocket and Gateway crash safety hooks
client.on('error', (error) => {
    console.error('⚠️ [DISCORD GATEWAY ERROR]:', error.message);
});

client.on('warn', (info) => {
    console.warn('⚠️ [DISCORD GATEWAY WARNING]:', info);
});

// 🌟 FIX 2: Attach absolute top-level process exception catches to block Render crashes
process.on('unhandledRejection', (reason, promise) => {
    console.error('🛑 [CRASH PREVENTED - UNHANDLED REJECTION AT]:', promise, 'REASON:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('🛑 [CRASH PREVENTED - UNCAUGHT EXCEPTION DETECTED]:', error.stack || error);
});

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
    
    let commandKey = null;
    if (command.data && command.data.name) {
      commandKey = command.data.name.toLowerCase();
    } else if (command.name) {
      commandKey = command.name.toLowerCase();
    } else {
      commandKey = file.split('.')[0].toLowerCase();
    }
    
    if (commandKey) {
      client.commands.set(commandKey, command);
      console.log(`[STARTUP] Registered command key matching: "${commandKey}"`);
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
if (fs.existsSync(eventsPath)) {
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  try {
    const event = require(filePath);
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
    }
  } catch (eventErr) {
    console.error('❌ [STARTUP ERROR] CRITICAL ERROR IN FILE "' + file + '":', eventErr.stack);
  }
}
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

// Enable CORS for external access. Allows your new frontend repo to pull data securely.
app.use(cors());

// Serve static files from assets folder (images, logos, etc)
app.use(express.static('assets'));

// Lightweight root route that acts as a confirmation screen and an external ping destination
app.get('/', (req, res) => {
res.status(200).send('ServerMiser Dashboard API backend is active and fully functional.');
});

// A lightweight keep-alive / ping endpoint to prevent Render from going to sleep
app.get('/ping', (req, res) => {
res.status(200).send('Bot backend is awake!');
});

app.get('/api/stats', async (req, res) => {
try {
  // Safe Fallback Resolution Layer checking database status natively
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ status: "offline", error: "Database offline" });
  }

  const databaseModel = require('./utils/database'); // Imports your schema model directly
  const totalServers = client?.guilds?.cache?.size ?? 0;
  const totalUsers = client?.guilds?.cache?.reduce((acc, g) => acc + g.memberCount, 0) ?? 0;
  const botPing = client?.ws?.ping !== -1 ? Math.round(client?.ws?.ping ?? 0) : 0;
  const totalSeconds = (client?.uptime ?? 0) / 1000;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const uptimeString = client?.readyAt ? `${hours}h ${minutes}m ${seconds}s` : "0h 0m 0s";

  let totalXp = 0; let leveledUsers = 0; let totalTickets = 0;
  
  try {
    // 🌟 FIX: Query your live unified MongoDB config collection documents instead of dead files
    const allGuildDocs = await databaseModel.find({}).catch(() => []);
    
    for (const doc of allGuildDocs) {
      if (doc.levelsData) {
        for (const userData of Object.values(doc.levelsData)) {
          totalXp += userData.xp || 0; 
          leveledUsers++;
        }
      }
      if (doc.reactionRolePanels) {
        totalTickets += doc.reactionRolePanels.length; // Uses panel arrays to track metrics smoothly
      }
    }
  } catch (_) {}

  res.json({
    status: client?.readyAt ? "online" : "offline",
    totalServers, totalUsers, botPing, uptimeString, leveledUsers, totalXp, totalTickets,
    uptimeSeconds: Math.floor(process.uptime()),
  });
} catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/leaderboard', async (req, res) => {
try {
  if (mongoose.connection.readyState !== 1) return res.status(503).json([]);
  
  const databaseModel = require('./utils/database');
  const allGuildDocs = await databaseModel.find({}).catch(() => []);
  const serverTotals = [];

  for (const doc of allGuildDocs) {
    if (doc.levelsData && doc.guildId) {
      let xp = 0;
      for (const userData of Object.values(doc.levelsData)) {
        xp += (userData.xp || 0) + (userData.level || 0) * 100;
      }
      const guild = client?.guilds?.cache?.get(doc.guildId) || await client?.guilds?.fetch(doc.guildId).catch(() => null);
      serverTotals.push({ name: guild?.name || `Server (${doc.guildId})`, totalXp: xp });
    }
  }
  
  serverTotals.sort((a, b) => b.totalXp - a.totalXp);
  res.json(serverTotals.slice(0, 10));
} catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/commands', (req, res) => {
try {
  const cmds = [...(client?.commands?.values() || [])].map(c => ({
    name: c.data?.name || c.name || "unknown",
    description: c.data?.description || "Prefix-only command",
  }));
  res.json(cmds);
} catch (err) { res.status(500).json({ error: err.message }); }
});

app.listen(port, () => {
console.log(`[SERVER] Live telemetry API server streaming on port ${port}`);
});

client.login(process.env.DISCORD_TOKEN);