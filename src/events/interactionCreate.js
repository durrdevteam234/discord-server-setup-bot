const { MessageFlags } = require('discord.js');
const database = require('../utils/database'); // Updated to point directly to your MongoDB client model

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        const activeClient = client || interaction.client;

        // ========================================================
        // ⚡ NEW: REACTION ROLES COMPONENT ROUTING LAYER
        // ========================================================
        if (interaction.isButton() || interaction.isStringSelectMenu()) {
            const reactionRolesCommand = activeClient.commands.get('reactionroles');
            if (reactionRolesCommand && typeof reactionRolesCommand.handleInteraction === 'function') {
                return await reactionRolesCommand.handleInteraction(interaction);
            }
            return; // Exit out safely so role clicks don't trip standard slash commands
        }

        // 2. Safety Gate: Completely ignore Autocomplete / Modals / Context Menus
        if (!interaction.isChatInputCommand()) return;
        
        // 3. Command Resolution Safe Lookup
        const commandName = interaction.commandName;
        if (!commandName) return;

        const command = activeClient.commands.get(commandName);
        if (!command) {
            console.warn(`[WARNING] Received slash interaction for /${commandName}, but it is not registered in client.commands.`);
            return;
        }

        // ========================================================
        // NEW: MONGO-DB GLOBAL SWITCH PERMISSION CHECK
        // ========================================================
        const guildId = interaction.guildId;
        const coreUtilityCommands = ['setup', 'cute', 'fun-module', 'help', 'setup-audit', 'mod-logs-toggle', 'reactionroles'];

        if (!coreUtilityCommands.includes(commandName.toLowerCase())) {
            // Query MongoDB directly for the guild's modules document schema configuration maps
            const guildConfig = await database.findOne({ guildId: guildId }).catch(() => null) || {};
            
            if (guildConfig.funModule === 'disabled' || guildConfig.funModule === false || guildConfig.funModule === 'off') {
                return interaction.reply({ 
                    content: '❌ The complete **Fun Command Suite** has been globally disabled by a server administrator.', 
                    flags: [MessageFlags.Ephemeral] 
                }).catch(() => null);
            }
        }
        try {
            // Ensure client instance is safely passed down to the active command
            await command.execute(interaction, activeClient);
        } catch (error) {
            console.error(`❌ Slash Command Error [/${commandName}]:`, error);
            
            // Fixed configuration using modern Discord.js v14 bitwise array flags
            const errorPayload = { 
                content: '❌ There was an internal error executing this command!', 
                flags: [MessageFlags.Ephemeral] 
            };
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorPayload).catch(() => null);
            } else {
                await interaction.reply(errorPayload).catch(() => null);
            }
        }
    },
};
