// 🛑 NODE 17 COMPATIBILITY PATCH (Fixes: ReadableStream is not defined)
if (typeof globalThis.ReadableStream === 'undefined') {
    try {
        const { ReadableStream } = require('node:stream/web');
        globalThis.ReadableStream = ReadableStream;
    } catch (e) {
        console.warn("Could not polyfill ReadableStream automatically.");
    }
}

const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

// 🛡️ FIX: Force dotenv to look directly in your main root folder for .env
require('dotenv').config({ path: path.join(__dirname, '../.env') }); 

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID; 

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
    console.error("❌ ERROR: Missing DISCORD_TOKEN, CLIENT_ID, or GUILD_ID in your .env file!");
    console.log("👉 Double check that your .env keys are named exactly like this:");
    console.log("   DISCORD_TOKEN=your_token_here");
    console.log("   CLIENT_ID=your_client_id_here");
    console.log("   GUILD_ID=your_guild_id_here");
    process.exit(1);
}

const commands = [];
// Points directly to your src/commands folder based on your file hierarchy screenshots
const commandsPath = path.join(__dirname, 'commands');

// Read all JavaScript files inside the commands folder
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	const command = require(filePath);
	if ('data' in command && 'execute' in command) {
		commands.push(command.data.toJSON());
		console.log(`Loaded command: /${command.data.name}`);
	} else {
		console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
	}
}

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
	try {
		console.log(`⏳ Started refreshing ${commands.length} application (/) commands.`);

		// Instantly registers commands to your specific test server for instant updates
		const data = await rest.put(
			Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
			{ body: commands },
		);

		console.log(`✅ Successfully reloaded ${data.length} application (/) commands for your server!`);
	} catch (error) {
		console.error('Deployment error:', error);
	}
})();
