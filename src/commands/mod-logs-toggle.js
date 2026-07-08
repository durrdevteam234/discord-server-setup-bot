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
      opt.setName('status') // Unified identifier name
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

  /**
   * Unified Entry Point. Processes both native application slash options 
   * and your mock create message variables flawlessly.
   */
  async execute(interaction, client) {
    const guild = interaction.guild;
    const guildId = guild.id;
    const memberExecutor = interaction.member;

    // Enforce administrative safety gating across platform variations
    if (memberExecutor && !memberExecutor.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ content: '❌ **Permissions Required!** You need `Manage Server` to toggle logging streams.', ephemeral: true });
    }

    // Secure timing loops using safe fallback validation models
    if (typeof interaction.deferReply === 'function') {
      await interaction.deferReply({ ephemeral: true }).catch(() => null);
    }

    // 📡 HYBRID PARAMETER EXTRACTOR
    let status = null;
    let channel = null;

    if (interaction.options && typeof interaction.options.getSubcommand !== 'function') {
      // PROCESSED VIA PREFIX MOCK EMULATOR ADAPTER FLOWS
      const rawTextArgs = interaction.options.getString('status'); 
      const parsedArray = typeof rawTextArgs === 'string' ? rawTextArgs.split(/ +/) : Array.isArray(rawTextArgs) ? rawTextArgs : [];
      
      status = parsedArray[0] ? parsedArray[0].toLowerCase() : null;
      
      // Look for a channel mention or ID inside the raw message context parameters
      channel = guild.channels.cache.get(parsedArray[1]?.replace(/[^0-9]/g, '')) || message?.mentions?.channels?.first() || null;
    } else {
      // PROCESSED VIA NATIVE APPLICATION SLASH OPTIONS
      status = interaction.options.getString('status');
      channel = interaction.options.getChannel('channel');
    }

    // Validation Check Fallback Warning Screen
    if (status !== 'on' && status !== 'off') {
      const usageNotice = '❌ **Invalid syntax:** Use `|mod-logs-toggle <on|off> [#channel]` or `/mod-logs-toggle` interfaces.';
      if (interaction.deferred || interaction.replied) {
        return interaction.editReply({ content: usageNotice });
      }
      return interaction.reply({ content: usageNotice, ephemeral: true });
    }

    // 1. Fetch historical record layout from MongoDB
    const guildConfig = await database.findOne({ guildId: guildId }).catch(() => null) || {};
    
    const modLogsEnabled = (status === 'on');
    let unifiedLogChannelId = guildConfig.unifiedLogChannelId || null;

    if (channel) {
      unifiedLogChannelId = channel.id;
    } else if (status === 'on' && !unifiedLogChannelId) {
      const firstTimeError = '❌ Please specify or mention a text channel when turning logging options ON for the first time.';
      if (interaction.deferred || interaction.replied) {
        return interaction.editReply({ content: firstTimeError });
      }
      return interaction.reply({ content: firstTimeError, ephemeral: true });
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

    if (interaction.deferred || interaction.replied) {
      return interaction.editReply({ content: null, embeds: [embed] });
    }
    return interaction.reply({ embeds: [embed] });
  }
};
