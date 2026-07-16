// src/sync-botnexus-commands.js
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

/**
 * Dynamically load all commands from the commands folder
 */
function loadCommandsFromFolder() {
    const commandsPath = path.join(__dirname, 'commands');
    const commands = [];
    
    console.log(`📂 [BOTNEXUS] Scanning commands folder: ${commandsPath}`);
    
    if (!fs.existsSync(commandsPath)) {
        console.warn('⚠️ [BOTNEXUS] Commands folder not found at:', commandsPath);
        return commands;
    }

    const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));
    console.log(`📄 [BOTNEXUS] Found ${commandFiles.length} command file(s)`);
    
    for (const file of commandFiles) {
        try {
            const command = require(path.join(commandsPath, file));
            
            if (command.data && typeof command.data.toJSON === 'function') {
                const jsonData = command.data.toJSON();
                
                // Log command details
                const optionCount = jsonData.options ? jsonData.options.length : 0;
                const subcommandCount = jsonData.options ? 
                    jsonData.options.filter(o => o.type === 1 || o.type === 2).length : 0;
                
                console.log(`📋 [BOTNEXUS] Loaded: ${jsonData.name}${subcommandCount > 0 ? ` (${subcommandCount} subcommands)` : ''}`);
                
                // Log subcommands
                if (subcommandCount > 0 && jsonData.options) {
                    for (const opt of jsonData.options) {
                        if (opt.type === 1) {
                            console.log(`   └─ /${jsonData.name} ${opt.name}`);
                        } else if (opt.type === 2) {
                            console.log(`   └─ /${jsonData.name} ${opt.name} (group)`);
                            if (opt.options) {
                                for (const sub of opt.options) {
                                    console.log(`      └─ /${jsonData.name} ${opt.name} ${sub.name}`);
                                }
                            }
                        }
                    }
                }
                
                commands.push(jsonData);
            }
        } catch (err) {
            console.error(`❌ [BOTNEXUS] Failed to load command ${file}:`, err.message);
        }
    }
    
    console.log(`✅ [BOTNEXUS] Total commands loaded: ${commands.length}`);
    return commands;
}

/**
 * Sync your Discord slash commands to BotNexus
 */
async function syncCommandsToBotNexus() {
    try {
        const botId = process.env.BOTNEXUS_BOT_ID;
        const token = process.env.BOTNEXUS_API_TOKEN;
        const baseUrl = 'https://www.rsdash.net';

        if (!botId || !token) {
            console.warn('⚠️ [BOTNEXUS] Missing credentials. Skipping sync.');
            return { skipped: true };
        }

        console.log(`\n🔑 [BOTNEXUS] Bot ID: ${botId}`);
        console.log(`🔑 [BOTNEXUS] Token: ${token ? '✅ Present' : '❌ MISSING'}`);
        console.log(`🔑 [BOTNEXUS] Base URL: ${baseUrl}`);

        const commands = loadCommandsFromFolder();
        
        if (commands.length === 0) {
            console.warn('⚠️ [BOTNEXUS] No commands found to sync.');
            return { skipped: true, reason: 'No commands found' };
        }

        // Try multiple API endpoint formats
        const endpoints = [
            {
                url: `${baseUrl}/api/v1/bots/${botId}/commands`,
                payload: { commands }
            },
            {
                url: `${baseUrl}/api/v1/bots/slug/${botId}/commands`,
                payload: { commands }
            },
            {
                url: `${baseUrl}/api/bots/${botId}/commands`,
                payload: { commands }
            }
        ];

        let lastError = null;

        for (const endpoint of endpoints) {
            try {
                console.log(`\n🔄 [BOTNEXUS] Trying: ${endpoint.url}`);
                
                const response = await axios({
                    method: 'PUT',
                    url: endpoint.url,
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    data: endpoint.payload,
                    timeout: 15000
                });

                console.log(`✅ [BOTNEXUS] Commands synced successfully!`);
                console.log(`   Endpoint used: ${endpoint.url}`);
                console.log(`   Response:`, JSON.stringify(response.data, null, 2));
                
                return response.data;
            } catch (error) {
                lastError = error;
                if (error.response) {
                    console.log(`   ❌ Status: ${error.response.status}`);
                    if (error.response.status === 400) {
                        console.log(`   ❌ Data:`, JSON.stringify(error.response.data, null, 2));
                        console.log(`   💡 The API might expect a different format. Trying next endpoint...`);
                    } else if (error.response.status === 404) {
                        console.log(`   ❌ Endpoint not found, trying next...`);
                    } else {
                        console.log(`   ❌ Error:`, error.response.data);
                        throw error;
                    }
                } else {
                    console.log(`   ❌ Error: ${error.message}`);
                }
            }
        }

        throw lastError || new Error('All endpoints failed');

    } catch (error) {
        console.error('\n❌ [BOTNEXUS] Sync failed:');
        if (error.response) {
            console.error(`   Status: ${error.response.status}`);
            console.error(`   Data:`, JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(`   Error: ${error.message}`);
        }
        throw error;
    }
}

/**
 * Push bot statistics to BotNexus
 */
async function pushStatsToBotNexus(serverCount) {
    try {
        const botId = process.env.BOTNEXUS_BOT_ID;
        const token = process.env.BOTNEXUS_API_TOKEN;
        const baseUrl = 'https://www.rsdash.net';

        if (!botId || !token) {
            return;
        }

        console.log(`📊 [BOTNEXUS] Pushing stats: ${serverCount} servers...`);

        const endpoints = [
            `${baseUrl}/api/v1/bots/${botId}/stats`,
            `${baseUrl}/api/bots/${botId}/stats`
        ];

        for (const url of endpoints) {
            try {
                await axios({
                    method: 'POST',
                    url: url,
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
        if (error.response?.status === 401) {
            console.error(`⚠️ [BOTNEXUS] Invalid API token - please regenerate it on the Developer tab`);
        } else {
            console.error(`⚠️ [BOTNEXUS] Stats push failed:`, error.message);
        }
    }
}

module.exports = {
    syncCommandsToBotNexus,
    pushStatsToBotNexus
};

// If run directly
if (require.main === module) {
    console.log('🚀 [BOTNEXUS] Starting manual sync...');
    console.log('='.repeat(60));
    
    syncCommandsToBotNexus()
        .then(() => {
            console.log('\n🎉 [BOTNEXUS] Sync completed successfully!');
            console.log(`   Your bot: https://www.rsdash.net/bot/servermiser/BN-5130A2C5`);
            console.log('='.repeat(60));
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 [BOTNEXUS] Sync failed:', error.message);
            console.log('='.repeat(60));
            process.exit(1);
        });
}