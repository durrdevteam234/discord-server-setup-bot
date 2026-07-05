const { SlashCommandBuilder, ChannelType, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../utils/database');

module.exports = {
  name: 'mod-logs-toggle',
  description: 'Log all moderator actions into one channel.',
  data: new SlashCommandBuilder()
    .setName('mod-logs-toggle')
    .setDescription('Log all moderator actions into one channel.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption(opt => 
      opt.setName('status')
        .setDescription('Toggle logging status')
        .setRequired(true)
        .addChoices(
          { name: 'On', value: 'on' },
          { name: 'Off', value: 'off' }
        )
    )
    .addChannelOption(opt => 
      opt.setName('channel')
        .setDescription('The targeted channel where logs are sent')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    ),

  async execute(interaction) {
    const status = interaction.options.getString('status');
    const channel = interaction.options.getChannel('channel');
    const guildId = interaction.guild.id;

    const settings = db.readData('settings.json') || {};
    if (!settings[guildId]) settings[guildId] = {};

    settings[guildId].modLogsEnabled = (status === 'on');
    if (channel) {
      settings[guildId].unifiedLogChannelId = channel.id;
    } else if (status === 'on' && !settings[guildId].unifiedLogChannelId) {
      return interaction.reply({ content: '❌ Please specify a channel when turning the logs ON for the first time.', ephemeral: true });
    }

    db.writeData('settings.json', settings);

    const logChanId = settings[guildId].unifiedLogChannelId;
    const embed = new EmbedBuilder()
      .setTitle('🛡️ Unified Mod Logging Configuration')
      .setColor(status === 'on' ? '#00FF00' : '#FF0000')
      .setDescription(`Unified moderator action logging has been set to: **${status.toUpperCase()}**\nTarget Logs Channel: ${logChanId ? `<#${logChanId}>` : '`None`設定'}`);

    return interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return message.reply('❌ Permissions required!');
    }

    const statusArg = args[0] ? args[0].toLowerCase() : null;
    if (statusArg !== 'on' && statusArg !== 'off') {
      return message.reply('❌ Usage: `|mod-logs-toggle <on|off> [#channel]`');
    }

    const targetChannel = message.mentions.channels.first();
    const guildId = message.guild.id;

    const settings = db.readData('settings.json') || {};
    if (!settings[guildId]) settings[guildId] = {};

    settings[guildId].modLogsEnabled = (statusArg === 'on');
    if (targetChannel) {
      settings[guildId].unifiedLogChannelId = targetChannel.id;
    } else if (statusArg === 'on' && !settings[guildId].unifiedLogChannelId) {
      return message.reply('❌ Please mention a text channel to send logs to! Example: `|mod-logs-toggle on #mod-logs`');
    }

    db.writeData('settings.json', settings);

    const logChanId = settings[guildId].unifiedLogChannelId;
    const embed = new EmbedBuilder()
      .setTitle('🛡️ Unified Mod Logging Configuration')
      .setColor(statusArg === 'on' ? '#00FF00' : '#FF0000')
      .setDescription(`Unified moderator action logging has been set to: **${statusArg.toUpperCase()}**\nTarget Logs Channel: ${logChanId ? `<#${logChanId}>` : '`None`設定'}`);

    return message.reply({ embeds: [embed] });
  }
};
