const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { logAction } = require('../utils/auditLog');
const { readData, writeData } = require('../utils/database');
const { formatCute } = require('../utils/textFormatter.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Mute a user')
    .addUserOption(option => option.setName('user').setDescription('User to mute').setRequired(true))
    .addStringOption(option =>
      option.setName('duration')
        .setDescription('Mute duration')
        .setRequired(true)
        .addChoices(
          { name: '1 minute', value: '1m' },
          { name: '5 minutes', value: '5m' },
          { name: '10 minutes', value: '10m' },
          { name: '1 hour', value: '1h' },
          { name: '1 day', value: '1d' }
        )
    )
    .addStringOption(option => option.setName('reason').setDescription('Reason for mute').setRequired(false))
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
      let duration;
      let reason;

      if (isInteraction) {
        user = context.options.getUser('user');
        duration = context.options.getString('duration');
        reason = context.options.getString('reason') || 'No reason provided';
      } else {
        user = context.mentions.users.first() || (args[0] ? await context.client.users.fetch(args[0]).catch(() => null) : null);
        duration = args[1];
        reason = args.slice(2).join(' ') || 'No reason provided';
      }

      if (!user) {
        const msg = '❌ Please mention a valid user or provide a valid user ID.';
        return isInteraction ? context.reply({ content: msg, ephemeral: true }) : context.reply(msg);
      }

      const validDurations = ['1m', '5m', '10m', '1h', '1d'];
      if (!duration || !validDurations.includes(duration.toLowerCase())) {
        const msg = '❌ Please specify a valid duration choice (`1m`, `5m`, `10m`, `1h`, `1d`).\nFormat: `|mute @user <duration> [reason]`';
        return isInteraction ? context.reply({ content: msg, ephemeral: true }) : context.reply(msg);
      }
      duration = duration.toLowerCase();

      const member = await guild.members.fetch(user.id).catch(() => null);
      if (!member) {
        const msg = '❌ This user is not in the server.';
        return isInteraction ? context.reply({ content: msg, ephemeral: true }) : context.reply(msg);
      }

      if (!member.moderatable) {
        const msg = '❌ I cannot mute this user! Their roles might be higher than mine or yours.';
        return isInteraction ? context.reply({ content: msg, ephemeral: true }) : context.reply(msg);
      }

      const durationMs = {
        '1m': 60000,
        '5m': 300000,
        '10m': 600000,
        '1h': 3600000,
        '1d': 86400000,
      }[duration];

      await member.timeout(durationMs, reason);

      const mutes = readData('mutes.json');
      if (!mutes[guildId]) mutes[guildId] = {};
      mutes[guildId][user.id] = {
        muteEnd: Date.now() + durationMs,
        reason,
      };
      writeData('mutes.json', mutes);

      const cuteData = readData('cute.json');
      const cuteStyle = cuteData[guildId] || 'off';
      const cuteChannelName = cuteStyle !== 'off' ? formatCute('mod-logs', cuteStyle, '🛡️') : 'mod-logs';

      const modLogsChannel = guild.channels.cache.find(ch => ch.name === 'mod-logs' || ch.name === cuteChannelName);
      if (modLogsChannel) {
        const embed = new EmbedBuilder()
          .setColor('#FFFF00')
          .setTitle('User Muted')
          .addFields(
            { name: 'User', value: `${user.tag} (${user.id})` },
            { name: 'Moderator', value: `${author.tag}` },
            { name: 'Duration', value: duration },
            { name: 'Reason', value: reason }
          );
        await modLogsChannel.send({ embeds: [embed] });
      }

      await logAction(guild, 'User Muted', author, `User: ${user.tag}, Duration: ${duration}, Reason: ${reason}`);

      const embed = new EmbedBuilder()
        .setColor('#FFFF00')
        .setTitle('✅ User Muted')
        .setDescription(`${user.tag} has been muted for ${duration}.\nReason: ${reason}`);

      if (isInteraction) {
        await context.reply({ embeds: [embed], ephemeral: true });
      } else {
        await context.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error('Mute error:', error);
      const msg = `❌ Error muting user: ${error.message}`;
      if (isInteraction) {
        await context.reply({ content: msg, ephemeral: true });
      } else {
        await context.reply(msg);
      }
    }
  },
};
