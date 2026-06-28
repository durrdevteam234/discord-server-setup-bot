const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { logAction } = require('../utils/auditLog');
const { readData, writeData } = require('../utils/database');
const { formatCute } = require('../utils/textFormatter.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Unmute a user')
    .addUserOption(option => option.setName('user').setDescription('User to unmute').setRequired(true))
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

      if (isInteraction) {
        user = context.options.getUser('user');
      } else {
        user = context.mentions.users.first() || (args[0] ? await context.client.users.fetch(args[0]).catch(() => null) : null);
      }

      if (!user) {
        const msg = '❌ Please mention a valid user or provide a valid user ID.';
        return isInteraction ? context.reply({ content: msg, ephemeral: true }) : context.reply(msg);
      }

      const member = await guild.members.fetch(user.id).catch(() => null);
      if (!member) {
        const msg = '❌ This user is not in the server.';
        return isInteraction ? context.reply({ content: msg, ephemeral: true }) : context.reply(msg);
      }

      await member.timeout(null);

      const mutes = readData('mutes.json');
      if (mutes[guildId] && mutes[guildId][user.id]) {
        delete mutes[guildId][user.id];
        writeData('mutes.json', mutes);
      }

      const cuteData = readData('cute.json');
      const cuteStyle = cuteData[guildId] || 'off';
      const cuteChannelName = cuteStyle !== 'off' ? formatCute('mod-logs', cuteStyle, '🛡️') : 'mod-logs';

      const modLogsChannel = guild.channels.cache.find(ch => ch.name === 'mod-logs' || ch.name === cuteChannelName);
      if (modLogsChannel) {
        const embed = new EmbedBuilder()
          .setColor('#00FF00')
          .setTitle('User Unmuted')
          .addFields(
            { name: 'User', value: `${user.tag} (${user.id})` },
            { name: 'Moderator', value: `${author.tag}` }
          );
        await modLogsChannel.send({ embeds: [embed] });
      }

      await logAction(guild, 'User Unmuted', author, `User: ${user.tag}`);

      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✅ User Unmuted')
        .setDescription(`${user.tag} has been unmuted.`);

      if (isInteraction) {
        await context.reply({ embeds: [embed], ephemeral: true });
      } else {
        await context.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error('Unmute error:', error);
      const msg = `❌ Error unmuting user: ${error.message}`;
      if (isInteraction) {
        await context.reply({ content: msg, ephemeral: true });
      } else {
        await context.reply(msg);
      }
    }
  },
};
