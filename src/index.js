// node v17 ReadableStream polyfill (Render compatibility)
const { ReadableStream } = require('stream/web');
if (!globalThis.ReadableStream) globalThis.ReadableStream = ReadableStream;

const { Client, Collection, GatewayIntentBits, Partials, REST, Routes, ActivityType } = require('discord.js');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const express = require('express');
const { pingBotList } = require('./utils/botListPinger');

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
// COMMANDS LOADER (FIXED PATH: Targets src/commands folder directly)
// ============================================================
const commandsPath = path.join(__dirname, 'commands'); 
if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));
    for (const file of commandFiles) {
        const command = require(path.join(commandsPath, file));
        const name = command.name || command.data?.name;
        if (name) {
            client.commands.set(name.toLowerCase(), command);
        }
    }
} else {
    console.error(`❌ [LOADER ERROR] Commands path not found at: ${commandsPath}`);
}

// ============================================================
// EVENTS LOADER (FIXED PATH: Targets src/events folder directly)
// ============================================================
const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));
    for (const file of eventFiles) {
        const event = require(path.join(eventsPath, file));
        
        // Skip your dedicated ready.js event here to prevent duplicate bindings 
        if (event.name === 'ready' || event.name === 'clientReady') continue;

        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args, client));
        } else {
            client.on(event.name, (...args) => event.execute(...args, client));
        }
    }
}

// ============================================================
// READY EVENT (Executed on successful Discord handshake)
// ============================================================
client.once('ready', async () => {
    console.log(`✅ [BOT ONLINE] ${client.user.tag} is live.`);

    // Deploy slash commands safely
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

    // ==========================================
    // MODULE A: HIGH-OCTANE ACTIVITY ROTATOR LOOP 🔄
    // ==========================================
    // Built fresh each rotation so guild/user counts and ping are never stale.
    const buildStatuses = () => {
        const guildCount = client.guilds.cache.size;
        const userCount = client.guilds.cache.reduce((acc, g) => acc + (g.memberCount || 0), 0);
        const ping = Math.max(0, Math.round(client.ws.ping));

        return [
            { text: '|help for noobs.', type: ActivityType.Playing },
            { text: 'i am the observer and i will always be observing', type: ActivityType.Watching },
            { text: "formal's new beat is peak", type: ActivityType.Listening },
            { text: 'in a coding match', type: ActivityType.Competing },

            // Live stats
            { text: `over ${guildCount.toLocaleString()} servers`, type: ActivityType.Watching },
            { text: `${userCount.toLocaleString()} humans (and bots pretending)`, type: ActivityType.Watching },
            { text: `servermiser.is-a.dev`, type: ActivityType.Watching },
            { text: `at ${ping}ms ping, basically teleporting`, type: ActivityType.Competing },

            // Funny / personality
            { text: 'therapist for your server\'s trust issues', type: ActivityType.Competing },
            { text: 'mute button go brrr', type: ActivityType.Playing },
            { text: 'setup wizard, not a real wizard', type: ActivityType.Playing },
            { text: 'the sound of 47 warnings being issued', type: ActivityType.Listening },
            { text: 'your mods sleep, I do not', type: ActivityType.Watching },
            { text: 'hide and seek with rule breakers', type: ActivityType.Playing },
            { text: 'to the tickets rolling in', type: ActivityType.Listening },
            { text: 'r/wallstreetbets but for XP', type: ActivityType.Watching },
            { text: '| use /setup, I dare you', type: ActivityType.Competing },
            { text: 'imaginary friend to lonely servers', type: ActivityType.Playing },
        ];
    };

    let statusIndex = 0;
    const updateStatus = () => {
        try {
            const statuses = buildStatuses();
            const current = statuses[statusIndex % statuses.length];
            client.user.setActivity(current.text, { type: current.type });
            console.log(`[STATUS] Changed activity banner to: "${current.text}"`);
            statusIndex = (statusIndex + 1) % statuses.length;
        } catch (err) {
            console.error('❌ [STATUS ERROR] Activity rotator assignment issue:', err.message);
        }
    };
    updateStatus();
    setInterval(updateStatus, 3 * 60 * 1000); // every 3 minutes, so people actually see the rotation

    // ==========================================
    // MODULE B: RSDASH AUTOMATED TELEMETRY SYNC 📡
    // ==========================================
    console.log('📡 Igniting automated API telemetry engine for rsdash.net...');
    const sendStatsUpdate = () => {
        try {
            const serverCount = client.guilds.cache.size;
            const userCount = client.guilds.cache.reduce((acc, guild) => acc + (guild.memberCount || 0), 0);
            const shardCount = client.shard ? client.shard.count : 1;
            console.log(`📊 Collecting matrix metrics... (Servers: ${serverCount} | Users: ${userCount} | Shards: ${shardCount})`);
            pingBotList(serverCount, userCount, shardCount);
        } catch (syncErr) {
            console.error('❌ [TELEMETRY ERROR] Failure gathering local metrics:', syncErr.message);
        }
    };
    sendStatsUpdate();
    setInterval(sendStatsUpdate, 30 * 60 * 1000); // every 30 minutes

    // ==========================================
    // MODULE C: SERVERMISER DASHBOARD TELEMETRY SYNC 💻
    // ==========================================
    console.log('💻 Launching internal metrics loop for your web dashboard...');
    const dashboardUrl = process.env.DASHBOARD_URL || 'https://servermiser.is-a.dev/api/bot-stats';
    const statsApiKey = process.env.STATS_API_KEY;

    async function pushDashboardStats() {
        if (!statsApiKey) {
            console.warn('[Dashboard] Missing STATS_API_KEY environment variable. Skipping dashboard sync.');
            return;
        }
        try {
            const totalGuilds = client.guilds.cache.size;
            const totalMembers = client.guilds.cache.reduce((acc, g) => acc + (g.memberCount || 0), 0);
            const wsPing = Math.max(0, Math.round(client.ws.ping));
            const shardCount = client.shard ? client.shard.count : 1;

            const uptimeMs = client.uptime || 0;
            const totalMinutes = Math.floor(uptimeMs / 60000);
            const days = Math.floor(totalMinutes / 1440);
            const hours = Math.floor((totalMinutes % 1440) / 60);
            const minutes = totalMinutes % 60;
            const uptime = `${days}d ${hours}h ${minutes}m`;

            const memoryUsage = process.memoryUsage();
            const ramUsage = `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`;

            const payload = {
                totalGuilds,
                totalMembers,
                wsPing,
                uptime,
                ramUsage,
                activeShards: `1 / ${shardCount}`,
                securityCompliance: "100%"
            };

            const response = await fetch(dashboardUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${statsApiKey}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const body = await response.text().catch(() => '');
                throw new Error(`Dashboard API rejected request with status: ${response.status} ${body}`);
            }

            console.log(`✅ [Dashboard] Stats pushed successfully. (Servers: ${totalGuilds} | Users: ${totalMembers} | Ping: ${wsPing}ms)`);
        } catch (error) {
            console.error('🚨 [Dashboard Error] Failed to push data to website:', error.message);
        }
    }

    pushDashboardStats();
    setInterval(pushDashboardStats, 5 * 60 * 1000); // every 5 minutes
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

// NOTE: The old public GET /api/stats route was removed here.
// It exposed live guild count, user count, and ping to anyone on the
// internet with no authentication. Stats are now pushed securely to the
// dashboard instead, via pushDashboardStats() above (POST + STATS_API_KEY).

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