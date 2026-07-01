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
require('dotenv').config();

// ==========================================
// 1. FREE TIER KEEP-ALIVE EXPRESS SERVER
// ==========================================
const app = express();
const port = process.env.PORT || 10000; // Render automatically injects this port

app.get('/', (req, res) => {
    res.send('Bot keep-alive server is active and running!');
});

app.listen(port, () => {
    console.log(`[SERVER] Keep-alive server listening on port ${port} for Render health checks.`);
});

// ==========================================
// 2. MONGODB ATLAS CONNECTION SETUP
// ==========================================
if (!process.env.MONGODB_URI) {
    console.error('[CRITICAL] MONGODB_URI environment variable is missing!');
} else {
    mongoose.connect(process.env.MONGODB_URI)
        .then(() => console.log('[DATABASE] Connected to MongoDB Atlas successfully!'))
        .catch(err => console.error('[DATABASE ERROR] MongoDB connection error:', err));
}

// ==========================================
// 3. DISCORD BOT CLIENT INITIALIZATION
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

// 4. LOAD SLASH COMMANDS DYNAMICALLY
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

// 5. LOAD EVENT HANDLERS DYNAMICALLY
const eventsPath = path.join(__dirname, 'events');
console.log('[STARTUP] Checking events directory path: ' + eventsPath);

if (fs.existsSync(eventsPath)) {
  const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
  console.log('[STARTUP] Found ' + eventFiles.length + ' event files to load.');

  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    
    // 🛡️ CRASH PROTECTION: Wrap each file link in a unique try/catch block e
    try {
      const event = require(filePath);
      console.log('[STARTUP] Successfully linked event handler file: ' + file + ' -> Event Name: ' + event.name);

      if (event.once) {
        // FIXED: Passes the client down alongside runtime event arguments
        client.once(event.name, (...args) => event.execute(...args, client));
      } else {
        // FIXED: Allows multiple components (like commands and XP engines) to listen safely
        client.on(event.name, (...args) => event.execute(...args, client));
      }
    } catch (eventErr) {
      console.error('❌ [STARTUP ERROR] CRITICAL ERROR IN FILE "' + file + '":', eventErr.stack);
    }
  }
} else {
  console.error('[CRITICAL] The events folder path does not exist!');
}

client.login(process.env.DISCORD_TOKEN);
