const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { logAction } = require('../utils/auditLog');
const { readData, writeData } = require('../utils/database');
const { formatCute } = require('../utils/textFormatter.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Unmute a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to unmute')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.reply({ content: '❌ You need Moderate Members permission!', ephemeral: true });
    }

    try {
      const user = interaction.options.getUser('user');
      const guildId = interaction.guildId;
      
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      if (!member) {
        return interaction.reply({ content: '❌ This user is not in the server.', ephemeral: true });
      }

      // Remove the native communications timeout
      await member.timeout(null);

      // Remove from mutes data registry safely
      const mutes = readData('mutes.json');
      if (mutes[guildId] && mutes[guildId][user.id]) {
        delete mutes[guildId][user.id];
        writeData('mutes.json', mutes);
      }

      // Check for cute mode styled channel name variants
      const cuteData = readData('cute.json');
      const cuteStyle = cuteData[guildId] || 'off';
      const cuteChannelName = cuteStyle !== 'off' ? formatCute('mod-logs', cuteStyle, '🛡️') : 'mod-logs';

      // Log to mod-logs channel
      const modLogsChannel = interaction.guild.channels.cache.find(ch => ch.name === 'mod-logs' || ch.name === cuteChannelName);
      if (modLogsChannel) {
        const embed = new EmbedBuilder()
          .setColor('#00FF00')
          .setTitle('User Unmuted')
          .addFields(
            { name: 'User', value: `${user.tag} (${user.id})` },
            { name: 'Moderator', value: `${interaction.user.tag}` }
          );
        await modLogsChannel.send({ embeds: [embed] });
      }

      // Log action
      await logAction(interaction.guild, 'User Unmuted', interaction.user, `User: ${user.tag}`);

      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✅ User Unmuted')
        .setDescription(`${user.tag} has been unmuted.`);

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      console.error('Unmute error:', error);
      await interaction.reply({ content: `❌ Error unmuting user: ${error.message}`, ephemeral: true });
    }
  },
};
