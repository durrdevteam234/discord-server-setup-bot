const { MessageFlags } = require('discord.js');
const db = require('../utils/database'); // Points back to your native helper wrapper

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        const activeClient = client || interaction.client;

        // ========================================================
        // 🔒 A. ONBOARDING VERIFICATION ROUTER INTERCEPTOR
        // ========================================================
        // 🛠️ CRITICAL FIX: Explicitly passes activeClient into the wizard handler
        if (interaction.customId && interaction.customId.startsWith('verify_')) {
            const verifyCommand = activeClient.commands.get('verification');
            if (verifyCommand && typeof verifyCommand.handleInteraction === 'function') {
                return await verifyCommand.handleInteraction(interaction, activeClient);
            }
            return;
        }

        // ========================================================
        // 📊 B. STATS ANALYTICS WIZARD INTERCEPTOR
        // ========================================================
        // 🛠️ CRITICAL FIX: Explicitly passes activeClient into the wizard handler
        if (interaction.customId && interaction.customId.startsWith('analytics_')) {
            const analyticsCommand = activeClient.commands.get('analytics');
            if (analyticsCommand && typeof analyticsCommand.handleInteraction === 'function') {
                return await analyticsCommand.handleInteraction(interaction, activeClient);
            }
            return;
        }
        // ========================================================
        // 🗑️ C. ROLE CLEANER CONTROL INTERCEPTOR
        // ========================================================
        if (interaction.customId && interaction.customId.startsWith('clear_roles_')) {
            const clearRolesCommand = activeClient.commands.get('clearroles');
            if (clearRolesCommand && typeof clearRolesCommand.handleInteraction === 'function') {
                return await clearRolesCommand.handleInteraction(interaction, activeClient);
            }
            return;
        }

        // ========================================================
        // 🎫 D. TICKET SYSTEM INTERCEPTOR
        // ========================================================
        if (interaction.customId && interaction.customId.startsWith('ticket_system_')) {
            const ticketCommand = activeClient.commands.get('ticket');
            if (ticketCommand && typeof ticketCommand.handleInteraction === 'function') {
                return await ticketCommand.handleInteraction(interaction, activeClient);
            }
            return;
        }

        // Legacy Reaction Roles Component Fallback Routing Layer
        if (interaction.isButton() || interaction.isStringSelectMenu()) {
            const reactionRolesCommand = activeClient.commands.get('reactionroles');
            if (reactionRolesCommand && typeof reactionRolesCommand.handleInteraction === 'function') {
                return await reactionRolesCommand.handleInteraction(interaction, activeClient);
            }
            return;
        }

        // ========================================================
        // 📡 E. SLASH COMMAND ENGINE GATEWAY
        // ========================================================
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
        
        // Whitelist array protecting critical infrastructure and wizards from fun lockouts
        const coreUtilityCommands = [
            'setup', 'cute', 'fun-module', 'help', 'setup-audit', 
            'mod-logs-toggle', 'reactionroles', 'autorole', 'automodrule', 
            'ticket', 'verification', 'leaderboard', 'rank', 'analytics', 'clearroles'
        ];

        if (!coreUtilityCommands.includes(commandName.toLowerCase())) {
            // Checks if the module state was flipped off inside your settings mapping
            if (currentGuildSettings.funModule === 'disabled' || currentGuildSettings.funModule === false || currentGuildSettings.funModule === 'off') {
                return interaction.reply({ 
                    content: '❌ The complete **Fun Command Suite** has been globally disabled by a server administrator.', 
                    flags: [MessageFlags.Ephemeral] 
                }).catch(() => null);
            }
        }

        try {
            // ========================================================
            // 📡 DYNAMIC SLASH ROUTER ADAPTER MAPS
            // ========================================================
            if (typeof command.executeSlash === 'function') {
                await command.executeSlash(interaction, activeClient);
            } else if (typeof command.execute === 'function') {
                await command.execute(interaction, activeClient);
            }
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
