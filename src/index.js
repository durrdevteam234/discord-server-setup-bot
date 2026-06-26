const { ReadableStream } = require('stream/web');
global.ReadableStream = ReadableStream;

const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.DirectMessages] });

client.commands = new Collection();
client.events = new Collection();
client.prefix = '|';

// Load commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  
  if ('execute' in command) {
    const commandName = command.data ? command.data.name : command.name;
    
    if (commandName) {
      client.commands.set(commandName.toLowerCase(), command);
      console.log(`✅ Loaded command: ${commandName}`); 
    }
  }
}

// Load events
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}

// Initialize data folder
const dataPath = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataPath)) {
  fs.mkdirSync(dataPath, { recursive: true });
}

// Initialize JSON files
const files = ['levels.json', 'warnings.json', 'tickets.json', 'settings.json', 'mutes.json', 'cute.json'];
for (const file of files) {
  const filePath = path.join(dataPath, file);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '{}');
  }
}

client.login(process.env.DISCORD_TOKEN);
