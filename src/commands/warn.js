const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { logAction } = require('../utils/auditLog');
const { readData, writeData } = require('../utils/database');
const { formatCute } = require('../utils/textFormatter.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a server member')
    .addUserOption(option => option.setName('user').setDescription('User to warn').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for warning').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(context, args = []) {
    const isInteraction = !!context.isChatInputCommand;
    const guild = context.guild;
    const author = isInteraction ? context.user : context.author;
    const memberExecutor = context.member;
    const guildId = context.guildId;

    if (!memberExecutor.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      const msg = '❌ You need Moderate Members permission to issue warnings!';
      return isInteraction ? context.reply({ content: msg, ephemeral: true }) : context.reply(msg);
    }

    try {
      let user;
      let reason;

      if (isInteraction) {
        user = context.options.getUser('user');
        reason = context.options.getString('reason');
      } else {
        user = context.mentions.users.first() || (args[0] ? await context.client.users.fetch(args[0]).catch(() => null) : null);
        reason = args.slice(1).join(' ');
      }

      if (!user) {
        const msg = '❌ Please mention a valid user or provide a valid user ID.';
        return isInteraction ? context.reply({ content: msg, ephemeral: true }) : context.reply(msg);
      }

      // 🛑 ANTI-GHOST CHECK (Bypass Cache to verify presence)
      const member = await guild.members.fetch({ user: user.id, force: true }).catch(() => null);
      if (!member) {
        const msg = '❌ This user is not in the server! You cannot warn someone who is not here.';
        return isInteraction ? context.reply({ content: msg, ephemeral: true }) : context.reply(msg);
      }

      if (!reason) {
        const msg = '❌ Please provide a reason for the warning. Use: `|warn @user <reason>`';
        return isInteraction ? context.reply({ content: msg, ephemeral: true }) : context.reply(msg);
      }

      const warnings = readData('warnings.json') || {};
      if (!warnings[guildId]) warnings[guildId] = {};
      if (!warnings[guildId][user.id]) warnings[guildId][user.id] = [];

      warnings[guildId][user.id].push({
        moderatorId: author.id,
        reason: reason,
        timestamp: new Date().toISOString()
      });
      writeData('warnings.json', warnings);

      // DM the user safely
      await user.send(`⚠️ You have been warned in **${guild.name}**.\n**Reason:** ${reason}`).catch(() => null);

      const cuteData = readData('cute.json') || {};
      const cuteStyle = cuteData[guildId] || 'off';
      const cuteChannelName = cuteStyle !== 'off' ? formatCute('mod-logs', cuteStyle, '🛡️') : 'mod-logs';

      const modLogsChannel = guild.channels.cache.find(ch => ch.name === 'mod-logs' || ch.name === cuteChannelName);
      if (modLogsChannel) {
        const embed = new EmbedBuilder()
          .setColor('#FFD700')
          .setTitle('User Warned')
          .addFields(
            { name: 'User', value: `${user.tag} (${user.id})` },
            { name: 'Moderator', value: `${author.tag}` },
            { name: 'Reason', value: reason },
            { name: 'Total Warnings', value: warnings[guildId][user.id].length.toString() }
          );
        await modLogsChannel.send({ embeds: [embed] }).catch(() => null);
      }

      await logAction(guild, 'User Warned', author, `User: ${user.tag}, Reason: ${reason}`);

      const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('⚠️ User Warned')
        .setDescription(`${user.tag} has been warned.\nReason: ${reason}\nTotal warnings: **${warnings[guildId][user.id].length}**`);

      return isInteraction ? context.reply({ embeds: [embed], ephemeral: true }) : context.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Warn error:', error);
      const msg = `❌ Error running warning system: ${error.message}`;
      return isInteraction ? context.reply({ content: msg, ephemeral: true }) : context.reply(msg);
    }
  },
};
