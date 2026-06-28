const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { logAction } = require('../utils/auditLog');
const { readData, writeData } = require('../utils/database');
const { formatCute } = require('../utils/textFormatter.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a user')
    .addUserOption(option => option.setName('user').setDescription('User to warn').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for warning').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(context, args = []) {
    const isInteraction = !!context.isChatInputCommand;
    const guild = context.guild;
    const author = isInteraction ? context.user : context.author;
    const memberExecutor = context.member;
    const guildId = context.guildId;

    if (!memberExecutor.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      const msg = '❌ You need Moderate Members permission!';
      return isInteraction ? context.reply({ content: msg, ephemeral: true }) : context.reply(msg);
    }

    try {
      let user;
      let reason;

      if (isInteraction) {
        user = context.options.getUser('user');
        reason = context.options.getString('reason') || 'No reason provided';
      } else {
        user = context.mentions.users.first() || (args[0] ? await context.client.users.fetch(args[0]).catch(() => null) : null);
        reason = args.slice(1).join(' ') || 'No reason provided';
      }

      if (!user) {
        const msg = '❌ Please mention a valid user or provide a valid user ID.';
        return isInteraction ? context.reply({ content: msg, ephemeral: true }) : context.reply(msg);
      }

      if (user.bot) {
        const msg = '❌ You cannot issue an infraction warning to a bot application.';
        return isInteraction ? context.reply({ content: msg, ephemeral: true }) : context.reply(msg);
      }

      const warnings = readData('warnings.json');
      if (!warnings[guildId]) warnings[guildId] = {};
      if (!warnings[guildId][user.id]) warnings[guildId][user.id] = [];

      warnings[guildId][user.id].push({
        reason,
        date: new Date().toISOString(),
        moderator: author.tag,
      });

      writeData('warnings.json', warnings);

      const warningCount = warnings[guildId][user.id].length;

      const cuteData = readData('cute.json');
      const cuteStyle = cuteData[guildId] || 'off';
      const cuteChannelName = cuteStyle !== 'off' ? formatCute('mod-logs', cuteStyle, '🛡️') : 'mod-logs';

      const modLogsChannel = guild.channels.cache.find(ch => ch.name === 'mod-logs' || ch.name === cuteChannelName);
      if (modLogsChannel) {
        const embed = new EmbedBuilder()
          .setColor('#FF6600')
          .setTitle('User Warned')
          .addFields(
            { name: 'User', value: `${user.tag} (${user.id})` },
            { name: 'Moderator', value: `${author.tag}` },
            { name: 'Reason', value: reason },
            { name: 'Warning Count', value: warningCount.toString() }
          );
        await modLogsChannel.send({ embeds: [embed] });
      }

      await logAction(guild, 'User Warned', author, `User: ${user.tag}, Reason: ${reason}, Count: ${warningCount}`);

      const embed = new EmbedBuilder()
        .setColor('#FF6600')
        .setTitle('✅ User Warned')
        .setDescription(`${user.tag} has been warned.\nReason: ${reason}\nTotal Warnings: ${warningCount}`);

      if (isInteraction) {
        await context.reply({ embeds: [embed], ephemeral: true });
      } else {
        await context.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error('Warn error:', error);
      const msg = `❌ Error warning user: ${error.message}`;
      if (isInteraction) {
        await context.reply({ content: msg, ephemeral: true });
      } else {
        await context.reply(msg);
      }
    }
  },
};
