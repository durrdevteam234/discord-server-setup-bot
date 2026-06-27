// 🛑 SAFE COMPATIBILITY PATCH (Only runs locally on your Mac if needed)
if (typeof globalThis.ReadableStream === 'undefined') {
    try {
        const { ReadableStream } = require('node:stream/web');
        globalThis.ReadableStream = ReadableStream;
    } catch (e) {
        console.warn("Could not polyfill ReadableStream automatically.");
    }
}

const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

// Create a new client instance with all necessary Gateway Intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers // 🔥 REQUIRED to detect joins/leaves for welcome logs
  ]
});

client.commands = new Collection();

// 1. LOAD SLASH COMMANDS DYNAMICALLY
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
      console.log(`Loaded Command: ${command.data.name}`);
    }
  }
}

// 2. LOAD EVENT HANDLERS DYNAMICALLY (This safely handles interactionCreate.js!)
const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
  const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args));
    } else {
      client.on(event.name, (...args) => event.execute(...args));
    }
    console.log(`Loaded Event: ${event.name}`);
  }
}

// 3. LOG IN TO DISCORD USING RAILWAY ENV VARIABLES
client.login(process.env.DISCORD_TOKEN);
