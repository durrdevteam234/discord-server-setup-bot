const { MessageFlags } = require('discord.js');
const db = require('../utils/database');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        // 1. Safety Gate: Completely ignore message components (Buttons, Select Menus)
        if (interaction.isMessageComponent()) return;

        // 2. Safety Gate: Completely ignore Autocomplete / Modals / Context Menus
        if (!interaction.isChatInputCommand()) return;
        
        // 3. Command Resolution Safe Lookup
        const commandName = interaction.commandName;
        if (!commandName) return;

        const activeClient = client || interaction.client;
        const command = activeClient.commands.get(commandName);
        if (!command) {
            console.warn(`[WARNING] Received slash interaction for /${commandName}, but it is not registered in client.commands.`);
            return;
        }

        // ==========================================
        // GLOBAL FUN MODULE PERMISSION SWITCH CHECK
        // ==========================================
        const mainSettings = db.readData('settings.json') || {};
        const currentGuildSettings = mainSettings[interaction.guildId] || {};
        const coreUtilityCommands = ['setup', 'cute', 'fun-module'];

        if (!coreUtilityCommands.includes(commandName.toLowerCase())) {
            if (currentGuildSettings.funModule === 'disabled' || currentGuildSettings.funModule === false) {
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
