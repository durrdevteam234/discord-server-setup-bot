const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { logAction } = require('../utils/auditLog');
const { readData, writeData } = require('../utils/database');
const { formatCute } = require('../utils/textFormatter.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Mute a user for a custom duration (1m to 28d)')
    .addUserOption(option => option.setName('user').setDescription('User to mute').setRequired(true))
    .addStringOption(option =>
      option.setName('duration')
        .setDescription('Mute duration (e.g., 30m, 2h, 7d, 3w)')
        .setRequired(true)
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
      let durationInput;
      let reason;

      if (isInteraction) {
        user = context.options.getUser('user');
        durationInput = context.options.getString('duration');
        reason = context.options.getString('reason') || 'No reason provided';
      } else {
        user = context.mentions.users.first() || (args[0] ? await context.client.users.fetch(args[0]).catch(() => null) : null);
        durationInput = args[1];
        reason = args.slice(2).join(' ') || 'No reason provided';
      }

      if (!user) {
        const msg = '❌ Please mention a valid user or provide a valid user ID.';
        return isInteraction ? context.reply({ content: msg, ephemeral: true }) : context.reply(msg);
      }

      // 🛑 ANTI-GHOST CHECK: Ensure user is in the server before trying to mute
      const member = await guild.members.fetch(user.id).catch(() => null);
      if (!member) {
        const msg = '❌ This user is not in the server! You cannot mute someone who is not here.';
        return isInteraction ? context.reply({ content: msg, ephemeral: true }) : context.reply(msg);
      }

      if (!durationInput) {
        const msg = '❌ Please specify a duration. Example: `30m`, `4h`, `5d`, `2w`';
        return isInteraction ? context.reply({ content: msg, ephemeral: true }) : context.reply(msg);
      }

      const durationRegex = /^(\d+)([mhdw])$/i;
      const match = durationInput.match(durationRegex);

      if (!match) {
        const msg = '❌ Invalid format! Use numbers followed by unit: `m` (minutes), `h` (hours), `d` (days), `w` (weeks).';
        return isInteraction ? context.reply({ content: msg, ephemeral: true }) : context.reply(msg);
      }

      const amount = parseInt(match[1], 10);
      const unit = match[2].toLowerCase();

      let durationMs = 0;
      if (unit === 'm') durationMs = amount * 60 * 1000;
      if (unit === 'h') durationMs = amount * 60 * 60 * 1000;
      if (unit === 'd') durationMs = amount * 24 * 60 * 60 * 1000;
      if (unit === 'w') durationMs = amount * 7 * 24 * 60 * 60 * 1000;

      const MIN_MS = 60 * 1000;
      const MAX_MS = 28 * 24 * 60 * 60 * 1000;

      if (durationMs < MIN_MS || durationMs > MAX_MS) {
        const msg = '❌ Duration must be between **1 minute (1m)** and **28 days (28d)**!';
        return isInteraction ? context.reply({ content: msg, ephemeral: true }) : context.reply(msg);
      }

      if (!member.moderatable) {
        const msg = '❌ I cannot mute this user! Their roles might be higher than mine or yours.';
        return isInteraction ? context.reply({ content: msg, ephemeral: true }) : context.reply(msg);
      }

      await member.timeout(durationMs, reason);

      const mutes = readData('mutes.json') || {};
      if (!mutes[guildId]) mutes[guildId] = {};
      mutes[guildId][user.id] = { muteEnd: Date.now() + durationMs, reason };
      writeData('mutes.json', mutes);

      const cuteData = readData('cute.json') || {};
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
            { name: 'Duration', value: durationInput.toLowerCase() },
            { name: 'Reason', value: reason }
          );
        await modLogsChannel.send({ embeds: [embed] }).catch(() => null);
      }

      await logAction(guild, 'User Muted', author, `User: ${user.tag}, Duration: ${durationInput}, Reason: ${reason}`);

      const embed = new EmbedBuilder()
        .setColor('#FFFF00')
        .setTitle('✅ User Muted')
        .setDescription(`${user.tag} has been muted for ${durationInput.toLowerCase()}.\nReason: ${reason}`);

      return isInteraction ? context.reply({ embeds: [embed], ephemeral: true }) : context.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Mute error:', error);
      const msg = `❌ Error muting user: ${error.message}`;
      return isInteraction ? context.reply({ content: msg, ephemeral: true }) : context.reply(msg);
    }
  },
};
