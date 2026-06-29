const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { readData, writeData } = require('../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('welcome')
    .setDescription('Configure or toggle the welcome system')
    .addChannelOption(option => option.setName('channel').setDescription('The welcome channel').setRequired(true))
    .addBooleanOption(option => option.setName('enabled').setDescription('Enable welcome alerts').setRequired(true)),

  async execute(context, args = []) {
    const isInteraction = !!context.isChatInputCommand;
    const guildId = context.guildId;
    const memberExecutor = context.member;

    if (!memberExecutor.permissions.has(PermissionFlagsBits.ManageGuild)) {
      const msg = '❌ You need Manage Server permissions!';
      return isInteraction ? context.reply({ content: msg, ephemeral: true }) : context.reply(msg);
    }

    try {
      let targetChannel;
      let isEnabled;

      if (isInteraction) {
        targetChannel = context.options.getChannel('channel');
        isEnabled = context.options.getBoolean('enabled');
      } else {
        // Prefix: args[0] is channel mention/ID, args[1] is true/false string
        targetChannel = context.mentions.channels.first() || context.guild.channels.cache.get(args[0]);
        isEnabled = args[1] ? args[1].toLowerCase() === 'true' : null;
      }

      if (!targetChannel || isEnabled === null) {
        const msg = '❌ Invalid Syntax! Use: `|welcome <#channel> <true/false>`';
        return isInteraction ? context.reply({ content: msg, ephemeral: true }) : context.reply(msg);
      }

      // Save to database registry
      const settings = readData('settings.json') || {};
      if (!settings[guildId]) settings[guildId] = {};
      
      settings[guildId].welcomeChannelId = targetChannel.id;
      settings[guildId].welcomeEnabled = isEnabled;
      writeData('settings.json', settings);

      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✅ Welcome Config Updated')
        .setDescription(`**Channel:** ${targetChannel}\n**System Enabled:** \`${isEnabled}\``);

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
