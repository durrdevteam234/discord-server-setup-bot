const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { readData, writeData } = require('../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leveling')
    .setDescription('Toggle user leveling points and cards')
    .addStringOption(option => 
      option.setName('status')
        .setDescription('Turn leveling on or off')
        .setRequired(true)
        .addChoices({ name: 'On', value: 'on' }, { name: 'Off', value: 'off' })
    ),

  async execute(context, args = []) {
    // 1. Detect if this is a Slash Command (Interaction) or Prefix Command (Message)
    const isInteraction = !!context.isChatInputCommand;
    const guildId = context.guildId;
    const memberExecutor = context.member;

    if (!memberExecutor.permissions.has(PermissionFlagsBits.ManageGuild)) {
      const msg = '❌ You need Manage Server permissions!';
      return isInteraction ? context.reply({ content: msg, ephemeral: true }) : context.reply(msg);
    }

    try {
      let status;

      // 2. Safely parse based on trigger invocation type
      if (isInteraction) {
        status = context.options.getString('status').toLowerCase();
      } else {
        // Extract the plain string string from prefix command arguments array
        status = Array.isArray(args) ? args[0]?.toLowerCase() : (typeof args === 'string' ? args.toLowerCase() : null);
      }

      if (status !== 'on' && status !== 'off') {
        const msg = '❌ Invalid Syntax! Use: `|leveling <on/off>`';
        return isInteraction ? context.reply({ content: msg, ephemeral: true }) : context.reply(msg);
      }

      // 3. Save state to settings.json and leveling_settings.json for absolute cross-compatibility
      const mainSettings = readData('settings.json') || {};
      const levelingSettings = readData('leveling_settings.json') || {};

      if (!mainSettings[guildId]) mainSettings[guildId] = {};
      if (!levelingSettings[guildId]) levelingSettings[guildId] = {};

      const isActive = status === 'on';
      mainSettings[guildId].leveling = status;
      levelingSettings[guildId].status = status;
      levelingSettings[guildId].enabled = isActive;

      writeData('settings.json', mainSettings);
      writeData('leveling_settings.json', levelingSettings);

      const embed = new EmbedBuilder()
        .setColor(isActive ? '#00FF00' : '#FF0000')
        .setTitle('⚙️ Leveling Matrix Updated')
        .setDescription(`Leveling tracking features have been turned **${status.toUpperCase()}**.`);

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
