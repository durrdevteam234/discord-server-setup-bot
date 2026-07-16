// src/sync-botnexus-commands.js
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

/**
 * Dynamically load all commands from the commands folder
 * This matches what your index.js does
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
    console.log(`📄 [BOTNEXUS] Found ${commandFiles.length} command file(s):`, commandFiles.join(', '));
    
    for (const file of commandFiles) {
        try {
            const command = require(path.join(commandsPath, file));
            
            // Check if command has data (discord.js slash command builder)
            if (command.data && typeof command.data.toJSON === 'function') {
                const jsonData = command.data.toJSON();
                
                // Log detailed command structure
                const optionCount = jsonData.options ? jsonData.options.length : 0;
                const subcommandCount = jsonData.options ? 
                    jsonData.options.filter(o => o.type === 1 || o.type === 2).length : 0;
                
                console.log(`📋 [BOTNEXUS] Loaded command: ${jsonData.name}`, 
                    `(Description: ${jsonData.description || 'N/A'})`,
                    `Options: ${optionCount}`,
                    subcommandCount > 0 ? `(Subcommands: ${subcommandCount})` : ''
                );
                
                // Log subcommand details if any
                if (subcommandCount > 0 && jsonData.options) {
                    for (const opt of jsonData.options) {
                        if (opt.type === 1) {
                            console.log(`   └─ Subcommand: /${jsonData.name} ${opt.name} - ${opt.description || 'No description'}`);
                            if (opt.options && opt.options.length > 0) {
                                for (const subOpt of opt.options) {
                                    console.log(`      └─ Option: ${subOpt.name} (${getOptionTypeName(subOpt.type)}) ${subOpt.required ? '✅ Required' : '❌ Optional'}`);
                                }
                            }
                        } else if (opt.type === 2) {
                            console.log(`   └─ Subcommand Group: ${opt.name} - ${opt.description || 'No description'}`);
                            if (opt.options) {
                                for (const groupOpt of opt.options) {
                                    console.log(`      └─ Subcommand: ${groupOpt.name} - ${groupOpt.description || 'No description'}`);
                                    if (groupOpt.options && groupOpt.options.length > 0) {
                                        for (const subOpt of groupOpt.options) {
                                            console.log(`         └─ Option: ${subOpt.name} (${getOptionTypeName(subOpt.type)}) ${subOpt.required ? '✅ Required' : '❌ Optional'}`);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                
                commands.push(jsonData);
            } 
            // Check if it's a plain object with name/description
            else if (command.name && command.description) {
                console.log(`📋 [BOTNEXUS] Loaded command (plain object): ${command.name}`, 
                    `(Description: ${command.description || 'N/A'})`,
                    command.options ? `Options: ${command.options.length}` : ''
                );
                commands.push({
                    name: command.name,
                    description: command.description,
                    options: command.options || []
                });
            } else {
                console.warn(`⚠️ [BOTNEXUS] Skipping ${file}: No valid command data found`);
            }
        } catch (err) {
            console.error(`❌ [BOTNEXUS] Failed to load command ${file}:`, err.message);
        }
    }
    
    console.log(`✅ [BOTNEXUS] Total commands loaded: ${commands.length}`);
    return commands;
}

/**
 * Helper to get human-readable option type names
 */
function getOptionTypeName(type) {
    const types = {
        1: 'SUB_COMMAND',
        2: 'SUB_COMMAND_GROUP',
        3: 'STRING',
        4: 'INTEGER',
        5: 'BOOLEAN',
        6: 'USER',
        7: 'CHANNEL',
        8: 'ROLE',
        9: 'MENTIONABLE',
        10: 'NUMBER',
        11: 'ATTACHMENT'
    };
    return types[type] || `Unknown(${type})`;
}

/**
 * Sync your Discord slash commands to BotNexus
 * Automatically reads from your commands folder
 */
async function syncCommandsToBotNexus() {
    try {
        const botId = process.env.BOTNEXUS_BOT_ID;
        const token = process.env.BOTNEXUS_API_TOKEN;
        const baseUrl = 'https://www.rsdash.net';

        console.log('🔑 [BOTNEXUS] Checking credentials...');
        console.log(`   Bot ID: ${botId ? botId.substring(0, 10) + '...' : '❌ MISSING'}`);
        console.log(`   Token: ${token ? '✅ Present' : '❌ MISSING'}`);
        console.log(`   Base URL: ${baseUrl}`);

        if (!botId || !token) {
            console.warn('⚠️ [BOTNEXUS] Missing credentials. Skipping sync.');
            console.warn('   Please add BOTNEXUS_BOT_ID and BOTNEXUS_API_TOKEN to your .env file');
            console.warn('   Get these from: https://www.rsdash.net');
            return { skipped: true };
        }

        // Load commands dynamically from your commands folder
        console.log('\n📂 [BOTNEXUS] Loading commands from folder...');
        const commands = loadCommandsFromFolder();
        
        if (commands.length === 0) {
            console.warn('⚠️ [BOTNEXUS] No commands found to sync.');
            console.warn('   Make sure your commands are in the src/commands/ folder');
            console.warn('   and each command exports a "data" property with SlashCommandBuilder');
            return { skipped: true, reason: 'No commands found' };
        }

        // Show summary of what will be synced
        console.log('\n📊 [BOTNEXUS] Sync Summary:');
        console.log(`   Total commands: ${commands.length}`);
        const totalSubcommands = commands.reduce((acc, cmd) => {
            if (cmd.options) {
                return acc + cmd.options.filter(o => o.type === 1 || o.type === 2).length;
            }
            return acc;
        }, 0);
        if (totalSubcommands > 0) {
            console.log(`   Total subcommands/groups: ${totalSubcommands}`);
        }

        console.log('\n📤 [BOTNEXUS] Sending to API...');
        const startTime = Date.now();

        const response = await axios({
            method: 'PUT',
            url: `${baseUrl}/api/bots/${botId}/commands`,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            data: { commands },
            timeout: 10000
        });

        const duration = Date.now() - startTime;
        console.log(`✅ [BOTNEXUS] Sync completed in ${duration}ms!`);
        console.log(`   Status: ${response.status} ${response.statusText}`);
        console.log(`   Response:`, JSON.stringify(response.data, null, 2));
        
        return response.data;

    } catch (error) {
        console.error('\n❌ [BOTNEXUS] Sync failed:');
        if (error.response) {
            console.error(`   Status: ${error.response.status}`);
            console.error(`   Status Text: ${error.response.statusText}`);
            console.error(`   Data:`, error.response.data);
            console.error(`   Headers:`, error.response.headers);
            
            // Specific error handling
            if (error.response.status === 401) {
                console.error('💡 Tip: Your API token is invalid or expired.');
                console.error('   Get a new token from: https://www.rsdash.net');
            } else if (error.response.status === 404) {
                console.error('💡 Tip: Your Bot ID is incorrect.');
                console.error('   Check your Bot ID at: https://www.rsdash.net');
            } else if (error.response.status === 429) {
                console.error('💡 Tip: Rate limited. Wait a moment and try again.');
            }
        } else if (error.request) {
            console.error(`   No response received from API`);
            console.error(`   Error: ${error.message}`);
            console.error('💡 Tip: Check your internet connection and that rsdash.net is accessible.');
        } else {
            console.error(`   Error: ${error.message}`);
        }
        throw error;
    }
}

/**
 * Push bot statistics (server count) to BotNexus
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
        
        const startTime = Date.now();
        const response = await axios({
            method: 'POST',
            url: `${baseUrl}/api/bots/${botId}/stats`,
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

        const duration = Date.now() - startTime;
        console.log(`✅ [BOTNEXUS] Stats pushed in ${duration}ms: ${serverCount} servers`);
        return response.data;
    } catch (error) {
        // Silent fail for stats - non-critical
        if (error.response && error.response.status !== 404) {
            console.error(`⚠️ [BOTNEXUS] Stats push failed:`, error.response.status);
            if (error.response.data) {
                console.error(`   Data:`, error.response.data);
            }
        } else if (error.response && error.response.status === 404) {
            console.error(`⚠️ [BOTNEXUS] Stats endpoint not found (404) - your bot may not be listed yet`);
        }
        // Don't throw - stats updates are non-critical
    }
}

module.exports = {
    syncCommandsToBotNexus,
    pushStatsToBotNexus
};

// If run directly: node src/sync-botnexus-commands.js
if (require.main === module) {
    console.log('🚀 [BOTNEXUS] Starting manual sync...');
    console.log('=' .repeat(60));
    
    syncCommandsToBotNexus()
        .then((result) => {
            if (result && !result.skipped) {
                console.log('\n🎉 [BOTNEXUS] Sync completed successfully!');
                console.log('   Your commands should now appear on:');
                console.log(`   https://www.rsdash.net/bots/${process.env.BOTNEXUS_BOT_ID}`);
            }
            console.log('\n' + '=' .repeat(60));
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 [BOTNEXUS] Sync failed with error:', error.message);
            console.log('\n' + '=' .repeat(60));
            process.exit(1);
        });
}