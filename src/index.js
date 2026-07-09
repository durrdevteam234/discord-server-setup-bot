if (typeof globalThis.ReadableStream === 'undefined') {
  try {
      const { ReadableStream } = require('node:stream/web');
      globalThis.ReadableStream = ReadableStream;
      console.log('🚀 [POLYFILL] Successfully injected ReadableStream for seamless Node environment compatibility!');
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
// 1. DISCORD BOT CLIENT INITIALIZATION 🤖
// ==========================================
console.log('⚡ Initializing Discord Client with full cached intent layers...');
const client = new Client({
intents: [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.MessageContent, 
  GatewayIntentBits.GuildMembers, // Crucial for blazing-fast, precise user calculations!
  GatewayIntentBits.GuildVoiceStates
]
});
client.commands = new Collection();
client.prefix = process.env.PREFIX || '|';

// 🔥 CRASH-PROOF RADAR: Catching WebSocket slips before they touch the engine!
client.on('error', (error) => {
    console.error('⚠️ [DISCORD GATEWAY ERROR ALERT]:', error.message);
});

client.on('warn', (info) => {
    console.warn('⚠️ [DISCORD GATEWAY WARNING]:', info);
});

// 🛡️ UNBREAKABLE SHIELD: Absolute top-level process catches to lock down Render 24/7!
process.on('unhandledRejection', (reason, promise) => {
    console.error('🛑 [CRASH PREVENTED] Unhandled Rejection intercepted safely at:', promise, 'Reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('🛑 [CRASH PREVENTED] Critical Uncaught Exception neutralized! Stack:', error.stack || error);
});

// ==========================================
// 2. LOAD COMMANDS DYNAMICALLY (SLASH & PREFIX) 📂
// ==========================================
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
console.log('📂 Scanning local modules for active bot commands...');
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
      console.log(`✅ [COMMAND REGISTERED]: "${commandKey}"`);
    }
  } catch (cmdErr) {
    console.error('❌ [STARTUP ERROR] Failed to load command file ' + file + ':', cmdErr.message);
  }
}
}

// ==========================================
// 3. LOAD EVENT HANDLERS DYNAMICALLY 📡
// ==========================================
const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
console.log('📂 Scanning system events pipeline...');
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
    console.log(`⚡ [EVENT ATTACHED]: "${event.name}"`);
  } catch (eventErr) {
    console.error('❌ [STARTUP ERROR] CRITICAL ERROR IN FILE "' + file + '":', eventErr.stack);
  }
}
}

// ==========================================
// 4. MONGODB ATLAS CONNECTION 💾
// ==========================================
if (!process.env.MONGODB_URI) {
console.error('🚨 [CRITICAL ERROR] MONGODB_URI environment variable is missing from your deployment setup!');
} else {
console.log('💾 Initializing database pipeline...');
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ [DATABASE CONNECTED] Bound to MongoDB Atlas instance flawlessly!'))
  .catch(err => console.error('❌ [DATABASE ERROR] Connection handshake failed:', err));
}

// ==========================================
// 5. EXPRESS API SERVER 🌐
// ==========================================
const app = express();
const port = process.env.PORT || 10000;

app.use(cors());
app.use(express.static(path.join(__dirname, 'assets')));

// Dashboard confirmation screen
app.get('/', (req, res) => {
res.status(200).send('⚡ ServerMiser Dashboard API backend is active, hyper-optimized, and streaming live metrics! 🚀');
});

// Keep-awake route to completely bypass Render\'s free-tier sleep cycles!
app.get('/ping', (req, res) => {
res.status(200).send('⚡ Core operating framework status: FULLY AWAKE!');
});

app.get('/api/stats', async (req, res) => {
try {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ status: "offline", error: "Database offline" });
  }

  const databaseModel = require('./utils/database'); 
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
    const allGuildDocs = await databaseModel.find({}).catch(() => []);
    
    for (const doc of allGuildDocs) {
      if (doc.levelsData) {
        for (const userData of Object.values(doc.levelsData)) {
          totalXp += userData.xp || 0; 
          leveledUsers++;
        }
      }
      if (doc.reactionRolePanels) {
        totalTickets += doc.reactionRolePanels.length; 
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

// ==========================================
// 6. ENGINE IGNITION 🔥
// ==========================================
app.listen(port, () => {
console.log(`🌐 [EXPRESS LIVE] Performance metrics broadcast channel humming on port ${port}!`);
});

console.log('🔑 Authenticating client keys via Discord Gateway network...');
client.login(process.env.DISCORD_TOKEN);
