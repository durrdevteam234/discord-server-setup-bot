const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { logAction } = require('../utils/auditLog');
const { readData } = require('../utils/database');
const { formatCute } = require('../utils/textFormatter.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a user from the server')
    .addUserOption(option => option.setName('user').setDescription('User to ban').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for ban').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(context, args = []) {
    const isInteraction = !!context.isChatInputCommand;
    const guild = context.guild;
    const author = isInteraction ? context.user : context.author;
    const memberExecutor = context.member;
    const guildId = context.guildId;

    if (!memberExecutor.permissions.has(PermissionFlagsBits.BanMembers)) {
      const msg = '❌ You need Ban Members permission!';
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

      // 🛑 ANTI-DUPLICATE CHECK: Intercept if user is already banned natives
      const existingBan = await guild.bans.fetch(user.id).catch(() => null);
      if (existingBan) {
        const msg = `❌ **${user.username}** is already banned from this server!`;
        return isInteraction ? context.reply({ content: msg, ephemeral: true }) : context.reply(msg);
      }

      const member = await guild.members.fetch(user.id).catch(() => null);
      if (member && !member.bannable) {
        const msg = '❌ I cannot ban this user! Their roles are higher than mine or yours.';
        return isInteraction ? context.reply({ content: msg, ephemeral: true }) : context.reply(msg);
      }

      await guild.members.ban(user.id, { reason });

      const cuteData = readData('cute.json') || {};
      const cuteStyle = cuteData[guildId] || 'off';
      const cuteChannelName = cuteStyle !== 'off' ? formatCute('mod-logs', cuteStyle, '🛡️') : 'mod-logs';

      const modLogsChannel = guild.channels.cache.find(ch => ch.name === 'mod-logs' || ch.name === cuteChannelName);
      if (modLogsChannel) {
        const embed = new EmbedBuilder()
          .setColor('#FF0000')
          .setTitle('User Banned')
          .addFields(
            { name: 'User', value: `${user.tag} (${user.id})` },
            { name: 'Moderator', value: `${author.tag}` },
            { name: 'Reason', value: reason }
          );
        await modLogsChannel.send({ embeds: [embed] }).catch(() => null);
      }

      await logAction(guild, 'User Banned', author, `User: ${user.tag}, Reason: ${reason}`);

      const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('✅ User Banned')
        .setDescription(`${user.tag} has been banned.\nReason: ${reason}`);

      return isInteraction ? context.reply({ embeds: [embed], ephemeral: true }) : context.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Ban error:', error);
      const msg = `❌ Error banning user: ${error.message}`;
      return isInteraction ? context.reply({ content: msg, ephemeral: true }) : context.reply(msg);
    }
  },
};
