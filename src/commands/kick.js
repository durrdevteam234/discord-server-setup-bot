const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { logAction } = require('../utils/auditLog');
const { readData } = require('../utils/database');
const { formatCute } = require('../utils/textFormatter.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a user from the server')
    .addUserOption(option => option.setName('user').setDescription('User to kick').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for kick').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async execute(context, args = []) {
    const isInteraction = !!context.isChatInputCommand;
    const guild = context.guild;
    const author = isInteraction ? context.user : context.author;
    const memberExecutor = context.member;
    const guildId = context.guildId;

    if (!memberExecutor.permissions.has(PermissionFlagsBits.KickMembers)) {
      const msg = '❌ You need Kick Members permission!';
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

      // 🛑 ANTI-GHOST CHECK: Verify target is a current server member
      const member = await guild.members.fetch(user.id).catch(() => null);
      if (!member) {
        const msg = '❌ This user is not in the server! You cannot kick someone who has already left.';
        return isInteraction ? context.reply({ content: msg, ephemeral: true }) : context.reply(msg);
      }

      if (!member.kickable) {
        const msg = '❌ I cannot kick this user! Their roles are higher than mine or yours.';
        return isInteraction ? context.reply({ content: msg, ephemeral: true }) : context.reply(msg);
      }

      await member.kick(reason);

      const cuteData = readData('cute.json') || {};
      const cuteStyle = cuteData[guildId] || 'off';
      const cuteChannelName = cuteStyle !== 'off' ? formatCute('mod-logs', cuteStyle, '🛡️') : 'mod-logs';

      const modLogsChannel = guild.channels.cache.find(ch => ch.name === 'mod-logs' || ch.name === cuteChannelName);
      if (modLogsChannel) {
        const embed = new EmbedBuilder()
          .setColor('#FFA500')
          .setTitle('User Kicked')
          .addFields(
            { name: 'User', value: `${user.tag} (${user.id})` },
            { name: 'Moderator', value: `${author.tag}` },
            { name: 'Reason', value: reason }
          );
        await modLogsChannel.send({ embeds: [embed] }).catch(() => null);
      }

      await logAction(guild, 'User Kicked', author, `User: ${user.tag}, Reason: ${reason}`);

      const embed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('✅ User Kicked')
        .setDescription(`${user.tag} has been kicked.\nReason: ${reason}`);

      return isInteraction ? context.reply({ embeds: [embed], ephemeral: true }) : context.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Kick error:', error);
      const msg = `❌ Error kicking user: ${error.message}`;
      return isInteraction ? context.reply({ content: msg, ephemeral: true }) : context.reply(msg);
    }
  },
};
