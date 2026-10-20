const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const db = require('../utils/database.js'); // Points back to your native helper wrapper

module.exports = {
    name: 'setup-audit',
    description: 'Configure, enable, or disable the server audit log channel.',
    data: new SlashCommandBuilder()
        .setName('setup-audit')
        .setDescription('Configure, enable, or disable the server audit log channel.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator | PermissionFlagsBits.ManageGuild)
        .addStringOption(option =>
            option.setName('action')
                .setDescription('Select whether to enable or disable the audit log engine')
                .setRequired(true)
                .addChoices(
                    { name: 'Enable Logs', value: 'enable' },
                    { name: 'Disable Logs', value: 'disable' }
                )
        )
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('The target channel to send logs to (Required if enabling)')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false)
        ),

    async execute(interaction) {
        await interaction.deferReply().catch(() => null);

        const guildId = interaction.guildId;
        const actionOption = interaction.options.getString('action');
        const channelOption = interaction.options.getChannel('channel');

        // Fetch current active server settings through your specific dynamic adapter format
        const settings = (await db.readData('settings.json')) || {};
        if (!settings[guildId]) settings[guildId] = {};

        if (actionOption === 'disable') {
            settings[guildId].auditChannelId = null;
            await db.writeData('settings.json', settings);
            await db.findOneAndUpdate({ guildId }, { $set: { auditChannelId: null } }, { upsert: true }).catch(() => null);

            const msg = '🛑 Audit logs have been successfully disabled for this server.';
            return interaction.editReply({ content: msg });
        }

        if (actionOption === 'enable') {
            if (!channelOption) {
                const msg = '❌ Please specify a target channel to send logs to! Usage: `/setup-audit action:Enable Logs channel:#channel`';
                return interaction.editReply({ content: msg });
            }

            settings[guildId].auditChannelId = channelOption.id;
            await db.writeData('settings.json', settings);
            await db.findOneAndUpdate({ guildId }, { $set: { auditChannelId: channelOption.id } }, { upsert: true }).catch(() => null);

            const msg = `✅ Audit logs have been successfully enabled and routed to ${channelOption}!`;
            return interaction.editReply({ content: msg });
        }
    },

    
};
