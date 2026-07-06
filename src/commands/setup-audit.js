const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const database = require('../utils/database.js'); 

module.exports = {
    name: 'setup-audit',
    description: 'Configure or disable the server audit log channel.',
    data: new SlashCommandBuilder()
        .setName('setup-audit')
        .setDescription('Configure or disable the server audit log channel.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator | PermissionFlagsBits.ManageGuild)
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('The text channel to send audit logs to')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('status')
                .setDescription('Disable the audit logging engine completely')
                .addChoices({ name: 'Disable Logs', value: 'disable' })
                .setRequired(false)
        ),

    async execute(interaction) {
        const guildId = interaction.guildId;
        const channelOption = interaction.options.getChannel('channel');
        const statusOption = interaction.options.getString('status');

        if (statusOption === 'disable') {
            // Update MongoDB document to unset or wipe the channel ID
            await database.findOneAndUpdate(
                { guildId: guildId },
                { $set: { auditChannelId: null } },
                { upsert: true }
            ).catch(() => null);
            return interaction.reply({ content: '🛑 Audit logs have been disabled for this server.', ephemeral: false }).catch(() => null);
        }

        if (channelOption) {
            // Update MongoDB document to save the new channel ID
            await database.findOneAndUpdate(
                { guildId: guildId },
                { $set: { auditChannelId: channelOption.id } },
                { upsert: true }
            ).catch(() => null);
            return interaction.reply({ content: `✅ Audit logs have been successfully enabled in ${channelOption}!`, ephemeral: false }).catch(() => null);
        }

        return interaction.reply({ 
            content: "❌ Please provide a target channel or select status disable parameter option fields. Usage: `/setup-audit channel:#channel`", 
            ephemeral: true 
        }).catch(() => null);
    },

    async executePrefix(message, args, client) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild) && !message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("❌ You need **Manage Server** or **Administrator** permissions to use this command!").catch(() => null);
        }

        const action = args && args[0] ? args[0].toLowerCase() : null;
        const guildId = message.guild.id;

        if (action === 'disable') {
            await database.findOneAndUpdate(
                { guildId: guildId },
                { $set: { auditChannelId: null } },
                { upsert: true }
            ).catch(() => null);
            return message.reply('🛑 Audit logs have been disabled for this server.').catch(() => null);
        }

        const targetChannel = message.mentions.channels.first() || (action ? message.guild.channels.cache.get(action) : null);
        if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
            return message.reply('❌ Please specify a text channel! Example: `|setup-audit #channel` or `|setup-audit disable`.').catch(() => null);
        }

        await database.findOneAndUpdate(
            { guildId: guildId },
            { $set: { auditChannelId: targetChannel.id } },
            { upsert: true }
        ).catch(() => null);
        return message.reply(`✅ Audit logs have been successfully enabled in ${targetChannel}!`).catch(() => null);
    }
};
