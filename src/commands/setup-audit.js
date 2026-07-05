const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const database = require('../utils/database.js'); 

module.exports = {
    name: 'setup-audit',
    description: 'Configure or disable the server audit log channel.',
    data: new SlashCommandBuilder()
        .setName('setup-audit')
        .setDescription('Configure or disable the server audit log channel.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator | PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        // Subcommand fallback structure logic can be placed here if utilizing subcommands
        return interaction.reply({ content: "❌ Please run this command with args or configure via prefix.", ephemeral: true });
    },

    async executePrefix(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild) && !message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("❌ You need **Manage Server** or **Administrator** permissions to use this command!");
        }

        const action = args[0]?.toLowerCase();
        const guildId = message.guild.id;

        if (action === 'disable') {
            await database.delete(`audit_${guildId}`);
            return message.reply('🛑 Audit logs have been disabled for this server.');
        }

        const targetChannel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]);
        if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
            return message.reply('❌ Please specify a text channel! Example: `|setup-audit #channel` or `|setup-audit disable`.');
        }

        await database.set(`audit_${guildId}`, targetChannel.id);
        return message.reply(`✅ Audit logs have been successfully enabled in ${targetChannel}!`);
    }
};