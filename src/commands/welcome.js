const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const database = require('../utils/database'); // Updated to use your live MongoDB layout connection

module.exports = {
  data: new SlashCommandBuilder()
    .setName('welcome')
    .setDescription('Configure or toggle the welcome/leave system')
    .addChannelOption(option => option.setName('channel').setDescription('The welcome/leave channel').setRequired(true))
    .addBooleanOption(option => option.setName('enabled').setDescription('Enable or disable welcome/leave messages').setRequired(true))
    .addStringOption(option => option.setName('join_message').setDescription('Custom join message. Variables: {user} {server} {memberCount}').setRequired(false))
    .addStringOption(option => option.setName('leave_message').setDescription('Custom leave message. Variables: {user} {server} {memberCount}').setRequired(false))
    .addBooleanOption(option => option.setName('embed').setDescription('Send messages as embeds? (default: true)').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  name: 'welcome',

  async execute(interaction, client) {
    const isInteraction = interaction.isCommand ? interaction.isCommand() : false;
    const guildId = interaction.guildId;
    const memberExecutor = interaction.member;

    if (!memberExecutor.permissions.has(PermissionFlagsBits.ManageGuild)) {
      const msg = '❌ You need Manage Server permissions!';
      return isInteraction ? interaction.reply({ content: msg, ephemeral: true }) : interaction.reply(msg);
    }

    try {
      let targetChannel, isEnabled, joinMessage, leaveMessage, useEmbed;

      if (isInteraction) {
        targetChannel = interaction.options.getChannel('channel');
        isEnabled = interaction.options.getBoolean('enabled');
        joinMessage = interaction.options.getString('join_message') || null;
        leaveMessage = interaction.options.getString('leave_message') || null;
        useEmbed = interaction.options.getBoolean('embed');
        if (useEmbed === null) useEmbed = true;
      } else {
        // Reads from emulated option properties passed dynamically by messageCreate.js
        targetChannel = interaction.options.getChannel('channel');
        isEnabled = interaction.options.getBoolean('enabled');
        joinMessage = interaction.options.getString('join_message') || null;
        leaveMessage = interaction.options.getString('leave_message') || null;
        useEmbed = interaction.options.getBoolean('embed');
        if (useEmbed === null) useEmbed = true;
      }

      if (!targetChannel || isEnabled === null) {
        const msg = '❌ Invalid Syntax! Use: `|welcome <#channel> <true/false> [join message] [leave message]`\n**Variables:** `{user}` `{server}` `{memberCount}`';
        return interaction.reply({ content: msg, ephemeral: true }).catch(() => null);
      }

      // ========================================================
      // NEW: ATOMIC MONGO-DB DOCUMENT CONFIGURATION PATCHING
      // ========================================================
      const updateFields = {
        welcomeChannelId: targetChannel.id,
        welcomeEnabled: isEnabled,
        welcomeEmbed: useEmbed
      };

      if (joinMessage) updateFields.joinMessage = joinMessage;
      if (leaveMessage) updateFields.leaveMessage = leaveMessage;

      const updatedConfig = await database.findOneAndUpdate(
        { guildId: guildId },
        { $set: updateFields },
        { upsert: true, new: true }
      ).catch(() => null) || {};
      const savedJoin = updatedConfig.joinMessage || 'Default: ✨ Welcome to {server}, {user}! We are glad to have you here. ✨';
      const savedLeave = updatedConfig.leaveMessage || 'Default: 👋 Goodbye {user}... We will miss you!';

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

      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const msg = `❌ Error: ${error.message}`;
      return interaction.reply({ content: msg, ephemeral: true }).catch(() => null);
    }
  },

  async executePrefix(message, argsArray, client) {
    const guild = message.guild;
    if (!guild) return;

    const member = message.member;
    if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return message.reply('❌ You need Manage Server permissions!').catch(() => null);
    }

    // Resolves channel from prefix arguments
    const targetChannel = message.mentions.channels.first() || (argsArray && argsArray[0] ? guild.channels.cache.get(argsArray[0]) : null);
    const statusArg = argsArray && argsArray[1] ? argsArray[1].toLowerCase() : null;
    const isEnabled = statusArg === 'true';

    // Parse messages safely by slicing out the custom join/leave blocks if present
    const joinMessage = argsArray && argsArray[2] ? argsArray.slice(2).join(' ') : null;

    const mockInteraction = {
      guild: message.guild,
      guildId: message.guild.id,
      member: message.member,
      user: message.author,
      options: {
        getChannel: (name) => targetChannel,
        getBoolean: (name) => isEnabled,
        getString: (name) => name === 'join_message' ? joinMessage : null
      },
      reply: async (options) => message.reply(options)
    };

    await this.execute(mockInteraction, client).catch(err => console.error('Error handling inline welcome prefix wrapper:', err));
  }
};
