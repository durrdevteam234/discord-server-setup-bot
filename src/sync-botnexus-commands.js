// src/sync-botnexus-commands.js
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

function loadCommandsFromFolder() {
    const commandsPath = path.join(__dirname, 'commands');
    const commands = [];
    
    if (!fs.existsSync(commandsPath)) {
        console.warn('⚠️ [BOTNEXUS] Commands folder not found');
        return commands;
    }

    const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));
    console.log(`📄 [BOTNEXUS] Found ${commandFiles.length} command files`);
    
    for (const file of commandFiles) {
        try {
            const command = require(path.join(commandsPath, file));
            if (command.data && typeof command.data.toJSON === 'function') {
                const jsonData = command.data.toJSON();
                console.log(`📋 [BOTNEXUS] Loaded command: ${jsonData.name}`);
                commands.push(jsonData);
            }
        } catch (err) {
            console.error(`❌ Failed to load ${file}:`, err.message);
        }
    }
    
    console.log(`✅ [BOTNEXUS] Total commands loaded: ${commands.length}`);
    return commands;
}

async function syncCommandsToBotNexus() {
    try {
        // Use the Bot ID (BN-5130A2C5) not the slug
        const botId = process.env.BOTNEXUS_BOT_ID; // Should be BN-5130A2C5
        const token = process.env.BOTNEXUS_API_TOKEN;
        const baseUrl = 'https://www.rsdash.net';

        if (!botId || !token) {
            console.warn('⚠️ [BOTNEXUS] Missing credentials');
            return { skipped: true };
        }

        console.log(`🔑 [BOTNEXUS] Bot ID: ${botId}`);
        console.log(`🔑 [BOTNEXUS] Token: ${token ? '✅ Present' : '❌ MISSING'}`);

        const commands = loadCommandsFromFolder();
        
        if (commands.length === 0) {
            console.warn('⚠️ [BOTNEXUS] No commands found');
            return { skipped: true };
        }

        // Try both API paths - with and without /v1/
        const apiPaths = [
            `/api/bots/${botId}/commands`,
            `/api/v1/bots/${botId}/commands`
        ];

        let lastError = null;
        
        for (const apiPath of apiPaths) {
            try {
                console.log(`🔄 Trying: ${baseUrl}${apiPath}`);
                const response = await axios({
                    method: 'PUT',
                    url: `${baseUrl}${apiPath}`,
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    data: { commands },
                    timeout: 10000
                });

                console.log(`✅ [BOTNEXUS] Commands synced successfully!`);
                console.log(`   Path used: ${apiPath}`);
                console.log(`   Response:`, JSON.stringify(response.data, null, 2));
                return response.data;
            } catch (error) {
                lastError = error;
                if (error.response?.status === 404) {
                    console.log(`   ❌ Path ${apiPath} not found, trying next...`);
                } else {
                    throw error;
                }
            }
        }

        throw lastError;

    } catch (error) {
        console.error('\n❌ [BOTNEXUS] Sync failed:');
        if (error.response) {
            console.error(`   Status: ${error.response.status}`);
            console.error(`   Data:`, error.response.data);
        } else {
            console.error(`   Error: ${error.message}`);
        }
        throw error;
    }
}

async function pushStatsToBotNexus(serverCount) {
    try {
        const botId = process.env.BOTNEXUS_BOT_ID; // Should be BN-5130A2C5
        const token = process.env.BOTNEXUS_API_TOKEN;
        const baseUrl = 'https://www.rsdash.net';

        if (!botId || !token) {
            return;
        }

        console.log(`📊 [BOTNEXUS] Pushing stats: ${serverCount} servers...`);

        // Try both API paths
        const apiPaths = [
            `/api/bots/${botId}/stats`,
            `/api/v1/bots/${botId}/stats`
        ];

        for (const apiPath of apiPaths) {
            try {
                await axios({
                    method: 'POST',
                    url: `${baseUrl}${apiPath}`,
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    data: {
                        platform: 'discord',
                        server_count: serverCount
                    },
                    timeout: 10000
                });

                console.log(`✅ [BOTNEXUS] Stats pushed: ${serverCount} servers`);
                return;
            } catch (error) {
                if (error.response?.status === 404) {
                    continue;
                }
                throw error;
            }
        }

        console.log(`⚠️ [BOTNEXUS] Stats endpoint not found`);

    } catch (error) {
        console.error(`⚠️ [BOTNEXUS] Stats push failed:`, error.message);
    }
}

module.exports = {
    syncCommandsToBotNexus,
    pushStatsToBotNexus
};

if (require.main === module) {
    console.log('🚀 [BOTNEXUS] Starting manual sync...');
    console.log('='.repeat(60));
    
    syncCommandsToBotNexus()
        .then(() => {
            console.log('\n🎉 [BOTNEXUS] Sync completed successfully!');
            console.log(`   Your bot: https://www.rsdash.net/bot/servermiser/BN-5130A2C5`);
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 [BOTNEXUS] Sync failed:', error.message);
            process.exit(1);
        });
}