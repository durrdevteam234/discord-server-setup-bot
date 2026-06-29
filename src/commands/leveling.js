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
        .setDescription('The channel where level up messages will be sent')
        .setRequired(true)
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
      let channelId;

      if (isInteraction) {
        status = context.options.getString('status').toLowerCase();
        channelId = context.options.getChannel('channel').id;
      } else {
        status = args[0]?.toLowerCase();
        const channelMention = args[1];
        channelId = channelMention?.replace(/[<#>]/g, '');
      }

      if (status !== 'enable' && status !== 'disable') {
        const msg = '❌ Invalid Syntax! Use: `|leveling <enable/disable> <#channel>`';
        return isInteraction ? context.reply({ content: msg, ephemeral: true }) : context.reply(msg);
      }

      if (!channelId) {
        const msg = '❌ Please provide a valid channel! Use: `|leveling <enable/disable> <#channel>`';
        return isInteraction ? context.reply({ content: msg, ephemeral: true }) : context.reply(msg);
      }

      const mainSettings = readData('settings.json') || {};
      const levelingSettings = readData('leveling_settings.json') || {};

      if (!mainSettings[guildId]) mainSettings[guildId] = {};
      if (!levelingSettings[guildId]) levelingSettings[guildId] = {};

      const isActive = status === 'enable';
      
      mainSettings[guildId].leveling = isActive ? 'on' : 'off';
      
      levelingSettings[guildId].status = isActive ? 'on' : 'off';
      levelingSettings[guildId].enabled = isActive; // This true/false flag controls the event block
      levelingSettings[guildId].channelId = channelId;

      writeData('settings.json', mainSettings);
      writeData('leveling_settings.json', levelingSettings);

      const embed = new EmbedBuilder()
        .setColor(isActive ? '#00FF00' : '#FF0000')
        .setTitle('⚙️ Leveling Matrix Updated')
        .setDescription(`Leveling features have been **${status.toUpperCase()}D**.\n**Announcement Channel:** <#${channelId}>`);

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
