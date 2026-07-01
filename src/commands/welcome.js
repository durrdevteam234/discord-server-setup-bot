const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { readData, writeData } = require('../utils/database');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('welcome')
    .setDescription('Configure or toggle the welcome/leave system')
    .addChannelOption(option => option.setName('channel').setDescription('The welcome/leave channel').setRequired(true))
    .addBooleanOption(option => option.setName('enabled').setDescription('Enable or disable welcome/leave messages').setRequired(true))
    .addStringOption(option => option.setName('join_message').setDescription('Custom join message. Variables: {user} {server} {memberCount}').setRequired(false))
    .addStringOption(option => option.setName('leave_message').setDescription('Custom leave message. Variables: {user} {server} {memberCount}').setRequired(false))
    .addBooleanOption(option => option.setName('embed').setDescription('Send messages as embeds? (default: true)').setRequired(false)),
  async execute(context, args = []) {
    const isInteraction = !!context.isChatInputCommand;
    const guildId = context.guildId;
    const memberExecutor = context.member;
    if (!memberExecutor.permissions.has(PermissionFlagsBits.ManageGuild)) {
      const msg = '❌ You need Manage Server permissions!';
      return isInteraction ? context.reply({ content: msg, ephemeral: true }) : context.reply(msg);
    }
    try {
      let targetChannel, isEnabled, joinMessage, leaveMessage, useEmbed;
      if (isInteraction) {
        targetChannel = context.options.getChannel('channel');
        isEnabled = context.options.getBoolean('enabled');
        joinMessage = context.options.getString('join_message') || null;
        leaveMessage = context.options.getString('leave_message') || null;
        useEmbed = context.options.getBoolean('embed');
        if (useEmbed === null) useEmbed = true;
      } else {
        targetChannel = context.mentions.channels.first() || context.guild.channels.cache.get(args[0]);
        isEnabled = args[1] ? args[1].toLowerCase() === 'true' : null;
        useEmbed = true;
      }
      if (!targetChannel || isEnabled === null) {
        const msg = '❌ Invalid Syntax! Use: `|welcome <#channel> <true/false> [join message] [leave message]`\n**Variables:** `{user}` `{server}` `{memberCount}`';
        return isInteraction ? context.reply({ content: msg, ephemeral: true }) : context.reply(msg);
      }
      const settings = (await readData('settings.json')) || {};
      if (!settings[guildId]) settings[guildId] = {};
      settings[guildId].welcomeChannelId = targetChannel.id;
      settings[guildId].welcomeEnabled = isEnabled;
      settings[guildId].welcomeEmbed = useEmbed;
      if (joinMessage) settings[guildId].joinMessage = joinMessage;
      if (leaveMessage) settings[guildId].leaveMessage = leaveMessage;
      await writeData('settings.json', settings);
      const savedJoin = settings[guildId].joinMessage || 'Default: ✨ Welcome to {server}, {user}! We are glad to have you here. ✨';
      const savedLeave = settings[guildId].leaveMessage || 'Default: 👋 Goodbye {user}... We will miss you!';
      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✅ Welcome Config Updated')
        .setDescription(
          `**Channel:** ${targetChannel}\n` +
          `**System Enabled:** \`${isEnabled}\`\n` +
          `**Use Embed:** \`${useEmbed}\`\n\n` +
          `**Join Message:**\n\`${savedJoin}\`\n\n` +
          `**Leave Message:**\n\`${savedLeave}\`\n\n` +
          `**Available Variables:**\n\`{user}\` — mentions the member\n\`{server}\` — server name\n\`{memberCount}\` — current member count`
        );
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