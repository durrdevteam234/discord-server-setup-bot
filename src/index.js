// Node compatibility patch
if (typeof globalThis.ReadableStream === 'undefined') {
    try {
        const { ReadableStream } = require('node:stream/web');
        globalThis.ReadableStream = ReadableStream;
    } catch (e) {}
}

const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // REQUIRED for prefix commands!
    GatewayIntentBits.GuildMembers
  ]
});

client.commands = new Collection();
client.prefix = '|';

// 1. LOAD SLASH COMMANDS DYNAMICALLY
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
    }
  }
}

// 2. LOAD EVENT HANDLERS DYNAMICALLY
const eventsPath = path.join(__dirname, 'events');
console.log('[STARTUP] Checking events directory path: ' + eventsPath);

if (fs.existsSync(eventsPath)) {
  const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
  console.log('[STARTUP] Found ' + eventFiles.length + ' event files to load.');

  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    
    // 🟢 CRITICAL STARTUP VERIFICATION LOG
    console.log('[STARTUP] Successfully linked event handler file: ' + file + ' -> Event Name: ' + event.name);

    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args));
    } else {
      client.on(event.name, (...args) => event.execute(...args));
    }
  }
} else {
  console.error('[CRITICAL] The events folder path does not exist! Check your file hierarchy layout.');
}

client.login(process.env.DISCORD_TOKEN);
