// node v17 ReadableStream polyfill (Render compatibility)
const { ReadableStream } = require('stream/web');
if (!globalThis.ReadableStream) globalThis.ReadableStream = ReadableStream;

const { Client, Collection, GatewayIntentBits, Partials, REST, Routes } = require('discord.js');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const express = require('express');

// ============================================================
// CLIENT
// ============================================================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildInvites,   // required for invite tracking
    ],
    partials: [
        Partials.Channel,
        Partials.Message,
        Partials.Reaction,
        Partials.GuildMember,
        Partials.User,
    ],
});

client.commands = new Collection();

// ============================================================
// COMMANDS LOADER
// ============================================================
const commandsPath = path.join(__dirname, '..', 'commands');
if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));
    for (const file of commandFiles) {
        const command = require(path.join(commandsPath, file));
        const name = command.name || command.data?.name;
        if (name) {
            client.commands.set(name.toLowerCase(), command);
        }
    }
}

// ============================================================
// EVENTS LOADER
// ============================================================
const eventsPath = path.join(__dirname, '..', 'events');
if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));
    for (const file of eventFiles) {
        const event = require(path.join(eventsPath, file));
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args, client));
        } else {
            client.on(event.name, (...args) => event.execute(...args, client));
        }
    }
}

// ============================================================
// READY EVENT
// FIX: deploys slash commands globally on startup and starts the selfvoice janitor.
// Global slash commands can take up to 1 hour to propagate on first deployment —
// after that updates are much faster. Change to applicationGuildCommands for instant
// testing in a specific guild.
// ============================================================
client.once('ready', async () => {
    console.log(`✅ [BOT ONLINE] ${client.user.tag} is live.`);

    // Deploy slash commands
    try {
        const commandPayloads = [];
        for (const cmd of client.commands.values()) {
            if (cmd.data && typeof cmd.data.toJSON === 'function') {
                commandPayloads.push(cmd.data.toJSON());
            }
        }

        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commandPayloads }
        );
        console.log(`✅ [SLASH COMMANDS] Deployed ${commandPayloads.length} global command(s).`);
    } catch (err) {
        console.error('❌ [SLASH COMMANDS] Deployment failed:', err.message);
    }

    // Start Self Voice janitor sweep
    const selfVoice = client.commands.get('selfvoice');
    if (selfVoice?.startJanitor) {
        selfVoice.startJanitor(client);
    }

    // Start Giveaway scheduler (auto-ends giveaways on time)
    const giveawayCmd = client.commands.get('giveaway');
    if (giveawayCmd?.startScheduler) {
        giveawayCmd.startScheduler(client);
    }

    // Start Birthday scheduler (daily announcements)
    const birthdaysCmd = client.commands.get('birthdays');
    if (birthdaysCmd?.startScheduler) {
        birthdaysCmd.startScheduler(client);
    }

    // Populate invite cache for all guilds (invite tracking)
    const invitesCmd = client.commands.get('invites');
    if (invitesCmd?.inviteCache != null) {
        for (const guild of client.guilds.cache.values()) {
            guild.invites.fetch().then(invites => {
                const guildMap = new Map();
                for (const invite of invites.values()) {
                    guildMap.set(invite.code, {
                        uses: invite.uses,
                        inviterId: invite.inviter?.id || null,
                        maxUses: invite.maxUses,
                        expiresAt: invite.expiresAt,
                    });
                }
                invitesCmd.inviteCache.set(guild.id, guildMap);
            }).catch(() => null);
        }
    }

});

// ============================================================
// MONGODB
// ============================================================
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
if (MONGO_URI) {
    mongoose.connect(MONGO_URI).then(() => {
        console.log('✅ [DATABASE] MongoDB connected.');
    }).catch(err => {
        console.error('❌ [DATABASE] MongoDB connection failed:', err.message);
    });
} else {
    console.warn('⚠️  [DATABASE] No MONGO_URI / MONGODB_URI environment variable found.');
}

// ============================================================
// KEEP-ALIVE (Render free tier needs an HTTP port to stay up)
// ============================================================
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (_req, res) => res.json({ status: 'online', tag: client.user?.tag || 'starting' }));

app.get('/api/stats', async (_req, res) => {
    res.json({
        guilds: client.guilds.cache.size,
        users: client.users.cache.size,
        commands: client.commands.size,
        uptime: Math.floor(process.uptime()),
        ping: client.ws.ping,
    });
});

app.listen(PORT, () => {
    console.log(`✅ [WEB] Keep-alive server running on port ${PORT}.`);
});

// ============================================================
// GUILD JOIN — populate invite cache for newly joined guilds
// ============================================================
client.on('guildCreate', (guild) => {
    const invitesCmd = client.commands.get('invites');
    if (!invitesCmd?.inviteCache) return;
    guild.invites.fetch().then(invites => {
        const guildMap = new Map();
        for (const invite of invites.values()) {
            guildMap.set(invite.code, {
                uses: invite.uses,
                inviterId: invite.inviter?.id || null,
                maxUses: invite.maxUses,
                expiresAt: invite.expiresAt,
            });
        }
        invitesCmd.inviteCache.set(guild.id, guildMap);
    }).catch(() => null);
});

// ============================================================
// ERROR GUARD
// ============================================================
process.on('unhandledRejection', (err) => {
    console.error('❌ [UNHANDLED REJECTION]', err);
});
process.on('uncaughtException', (err) => {
    console.error('❌ [UNCAUGHT EXCEPTION]', err);
});

// ============================================================
// LOGIN
// ============================================================
const TOKEN = process.env.DISCORD_TOKEN || process.env.TOKEN;
if (!TOKEN) {
    console.error('❌ [FATAL] DISCORD_TOKEN / TOKEN environment variable is not set.');
    process.exit(1);
}
client.login(TOKEN).catch(err => {
    console.error('❌ [FATAL] Login failed:', err.message);
    process.exit(1);
});
