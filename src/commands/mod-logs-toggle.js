const { SlashCommandBuilder, ChannelType, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const database = require('../utils/database'); // Points to your MongoDB client model

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

    // 1. Fetch historical record layout from MongoDB
    const guildConfig = await database.findOne({ guildId: guildId }).catch(() => null) || {};
    
    const modLogsEnabled = (status === 'on');
    let unifiedLogChannelId = guildConfig.unifiedLogChannelId || null;

    if (channel) {
      unifiedLogChannelId = channel.id;
    } else if (status === 'on' && !unifiedLogChannelId) {
      return interaction.reply({ content: '❌ Please specify a channel when turning the logs ON for the first time.', ephemeral: true });
    }

    // 2. Commit update state modifications back to your MongoDB cluster
    await database.findOneAndUpdate(
      { guildId: guildId },
      { 
        $set: { 
          modLogsEnabled: modLogsEnabled,
          unifiedLogChannelId: unifiedLogChannelId
        } 
      },
      { upsert: true }
    ).catch(() => null);

    const embed = new EmbedBuilder()
      .setTitle('🛡️ Unified Mod Logging Configuration')
      .setColor(status === 'on' ? '#00FF00' : '#FF0000')
      .setDescription(`Unified moderator action logging has been set to: **${status.toUpperCase()}**\nTarget Logs Channel: ${unifiedLogChannelId ? `<#${unifiedLogChannelId}>` : '`None` Layout'}`);

    return interaction.reply({ embeds: [embed] });
  },

  // FIXED ARGS PACKING MAPPER FOR D_JS EVENTS INTERACTION PARSING
  async executePrefix(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return message.reply('❌ Permissions required!');
    }

    const statusArg = args && args[0] ? args[0].toLowerCase() : null;
    if (statusArg !== 'on' && statusArg !== 'off') {
      return message.reply('❌ Usage: `|mod-logs-toggle <on|off> [#channel]`');
    }

    const targetChannel = message.mentions.channels.first() || (args && args[1] ? message.guild.channels.cache.get(args[1]) : null);
    const guildId = message.guild.id;

    // 1. Fetch current settings from MongoDB
    const guildConfig = await database.findOne({ guildId: guildId }).catch(() => null) || {};

    const modLogsEnabled = (statusArg === 'on');
    let unifiedLogChannelId = guildConfig.unifiedLogChannelId || null;

    if (targetChannel) {
      unifiedLogChannelId = targetChannel.id;
    } else if (statusArg === 'on' && !unifiedLogChannelId) {
      return message.reply('❌ Please mention a text channel to send logs to! Example: `|mod-logs-toggle on #mod-logs`');
    }

    // 2. Save modifications to your MongoDB document
    await database.findOneAndUpdate(
      { guildId: guildId },
      { 
        $set: { 
          modLogsEnabled: modLogsEnabled,
          unifiedLogChannelId: unifiedLogChannelId
        } 
      },
      { upsert: true }
    ).catch(() => null);

    const embed = new EmbedBuilder()
      .setTitle('🛡️ Unified Mod Logging Configuration')
      .setColor(statusArg === 'on' ? '#00FF00' : '#FF0000')
      .setDescription(`Unified moderator action logging has been set to: **${statusArg.toUpperCase()}**\nTarget Logs Channel: ${unifiedLogChannelId ? `<#${unifiedLogChannelId}>` : '`None` Layout'}`);

    return message.reply({ embeds: [embed] });
  }
};
