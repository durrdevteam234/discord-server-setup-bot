const { MessageFlags } = require('discord.js');
const db = require('../utils/database'); // Points back to your native helper wrapper

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        const activeClient = client || interaction.client;

        // 1. REACTION ROLES COMPONENT ROUTING LAYER
        if (interaction.isButton() || interaction.isStringSelectMenu()) {
            const reactionRolesCommand = activeClient.commands.get('reactionroles');
            if (reactionRolesCommand && typeof reactionRolesCommand.handleInteraction === 'function') {
                return await reactionRolesCommand.handleInteraction(interaction);
            }
            return;
        }

        // 2. Ignore non-slash items
        if (!interaction.isChatInputCommand()) return;
        
        const commandName = interaction.commandName;
        if (!commandName) return;

        const command = activeClient.commands.get(commandName.toLowerCase());
        if (!command) {
            console.warn(`[WARNING] Received slash interaction for /${commandName}, but it is not registered.`);
            return;
        }

        // ========================================================
        // 🌟 FIXED GLOBAL SWITCH GATING USING NATIVE ADAPTERS
        // ========================================================
        const mainSettings = (await db.readData('settings.json')) || {};
        const currentGuildSettings = mainSettings[interaction.guildId] || {};
        const coreUtilityCommands = ['setup', 'cute', 'fun-module', 'help', 'setup-audit', 'mod-logs-toggle', 'reactionroles'];

        if (!coreUtilityCommands.includes(commandName.toLowerCase())) {
            // Checks if the module state was flipped off inside your custom dynamic schema structure
            if (currentGuildSettings.funModule === 'disabled' || currentGuildSettings.funModule === false || currentGuildSettings.funModule === 'off') {
                return interaction.reply({ 
                    content: '❌ The complete **Fun Command Suite** has been globally disabled by a server administrator.', 
                    flags: [MessageFlags.Ephemeral] 
                }).catch(() => null);
            }
        }

        try {
            await command.execute(interaction, activeClient);
        } catch (error) {
            console.error(`❌ Slash Command Error [/${commandName}]:`, error);
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
