const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { readData, writeData } = require('../utils/database');

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

  async execute(context, args = []) {
    const isInteraction = !!context.isChatInputCommand;
    const guildId = context.guildId;
    const memberExecutor = context.member;

    if (!memberExecutor.permissions.has(PermissionFlagsBits.ManageGuild)) {
      const msg = '❌ You need Manage Server permissions!';
      return isInteraction ? context.reply({ content: msg, ephemeral: true }) : context.reply(msg);
    }

    try {
      let status;
      let channelId = null;

      // 1. Fixed Argument Parsing Block
      if (isInteraction) {
        status = context.options.getString('status').toLowerCase();
        
        // Use optional chaining (?.) so it safely resolves to null instead of crashing
        const channelOpt = context.options.getChannel('channel');
        if (channelOpt) {
          channelId = channelOpt.id;
        }
      } else {
        // Prefix syntax: |leveling <enable/disable> [optional #channel]
        // Safely extract status from args array index
        status = Array.isArray(args) ? args[0]?.toLowerCase() : (typeof args === 'string' ? args.toLowerCase() : null);
        
        const channelMention = Array.isArray(args) ? args[1] : null;
        if (channelMention) {
          channelId = channelMention.replace(/[<#>&]/g, '');
        }
      }

      // 2. Status Validation
      if (status !== 'enable' && status !== 'disable') {
        const msg = '❌ Invalid Syntax! Use: `|leveling <enable/disable> [#channel]`';
        return isInteraction ? context.reply({ content: msg, ephemeral: true }) : context.reply(msg);
      }

      const isActive = status === 'enable';

      // 3. Enforce channel only on enabling setup
      if (isActive && !channelId) {
        const msg = '❌ Please provide a valid channel to enable leveling! Use: `/leveling status:Enable channel:#channel`';
        return isInteraction ? context.reply({ content: msg, ephemeral: true }) : context.reply(msg);
      }

      const mainSettings = readData('settings.json') || {};
      const levelingSettings = readData('leveling_settings.json') || {};

      if (!mainSettings[guildId]) mainSettings[guildId] = {};
      if (!levelingSettings[guildId]) levelingSettings[guildId] = {};

      mainSettings[guildId].leveling = isActive ? 'on' : 'off';
      levelingSettings[guildId].status = isActive ? 'on' : 'off';
      levelingSettings[guildId].enabled = isActive;
      
      if (channelId) {
        levelingSettings[guildId].channelId = channelId;
      }

      writeData('settings.json', mainSettings);
      writeData('leveling_settings.json', levelingSettings);

      // 4. Send Success Embed
      let descriptionText = `Leveling features have been **${status.toUpperCase()}D**.`;
      if (isActive || levelingSettings[guildId].channelId) {
        const displayChannel = channelId || levelingSettings[guildId].channelId;
        descriptionText += `\n**Announcement Channel:** <#${displayChannel}>`;
      }

      const embed = new EmbedBuilder()
        .setColor(isActive ? '#00FF00' : '#FF0000')
        .setTitle('⚙️ Leveling Matrix Updated')
        .setDescription(descriptionText);

      if (isInteraction) {
        await context.reply({ embeds: [embed], ephemeral: true });
      } else {
        await context.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error(error);
      const msg = `❌ Error: ${error.message}`;
      if (isInteraction) await context.reply({ content: msg, ephemeral: true });
      else await context.reply(msg);
    }
  }
};
