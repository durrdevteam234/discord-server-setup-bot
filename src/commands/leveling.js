const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const database = require('../utils/database'); // Updated to use your live MongoDB layout connection

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leveling')
    .setDescription('Toggle leveling and set the announcement channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption(option => 
      option.setName('status')
        .setDescription('Turn leveling on or off')
        .setRequired(true)
        .addChoices(
          { name: 'Enable', value: 'enable' }, 
          { name: 'Disable', value: 'disable' }
        )
    )
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('The channel where level up messages will be sent (Optional if disabling)')
        .setRequired(false)
    ),
  name: 'leveling',

  async execute(interaction, client) {
    const isInteraction = interaction.isCommand ? interaction.isCommand() : false;
    const guildId = interaction.guildId;
    const memberExecutor = interaction.member;

    if (!memberExecutor.permissions.has(PermissionFlagsBits.ManageGuild)) {
      const msg = '❌ You need Manage Server permissions!';
      return isInteraction ? interaction.reply({ content: msg, ephemeral: true }) : interaction.reply(msg);
    }

    try {
      let status;
      let channelId = null;

      if (isInteraction) {
        status = interaction.options.getString('status').toLowerCase();
        const channelOpt = interaction.options.getChannel('channel');
        if (channelOpt) {
          channelId = channelOpt.id;
        }
      } else {
        // Read string entries directly via the options system inside your messageCreate emulator
        status = interaction.options.getString('status')?.toLowerCase();
        const channelOpt = interaction.options.getChannel('channel');
        if (channelOpt) {
          channelId = channelOpt.id;
        }
      }

      if (status !== 'enable' && status !== 'disable') {
        const msg = '❌ Invalid Syntax! Use: `|leveling <enable/disable> [#channel]`';
        return isInteraction ? interaction.reply({ content: msg, ephemeral: true }) : interaction.reply(msg);
      }

      const isActive = status === 'enable';

      if (isActive && !channelId) {
        const msg = '❌ Please provide a valid channel to enable leveling! Use: `/leveling status:Enable channel:#channel`';
        return isInteraction ? interaction.reply({ content: msg, ephemeral: true }) : interaction.reply(msg);
      }

      // ========================================================
      // NEW: MONGO-DB DYNAMIC CONFIGURATION LOGIC UPDATE
      // ========================================================
      const levelStringStatus = isActive ? 'on' : 'off';
      
      const updatePayload = {
        leveling: levelStringStatus,
        'levelConfig.status': levelStringStatus,
        'levelConfig.enabled': isActive
      };

      if (channelId) {
        updatePayload['levelConfig.channelId'] = channelId;
      }

      // Atomically locate, modify, or upsert the configuration entry on MongoDB
      const updatedConfig = await database.findOneAndUpdate(
        { guildId: guildId },
        { $set: updatePayload },
        { upsert: true, new: true }
      ).catch(() => null) || {};

      const displayChannel = channelId || updatedConfig.levelConfig?.channelId;
      let descriptionText = `Leveling features have been **${status.toUpperCase()}D**.`;
      
      if (displayChannel) {
        descriptionText += `\n**Announcement Channel:** <#${displayChannel}>`;
      }

      const embed = new EmbedBuilder()
        .setColor(isActive ? '#00FF00' : '#FF0000')
        .setTitle('⚙️ Leveling Matrix Updated')
        .setDescription(descriptionText);

      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Leveling config update error:', error);
      const msg = `❌ Error: ${error.message}`;
      return interaction.reply({ content: msg, ephemeral: true }).catch(() => null);
    }
  }
};
