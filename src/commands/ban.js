const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { logAction } = require('../utils/auditLog');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a user from the server')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to ban')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for ban')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
      return interaction.reply({ content: '❌ You need Ban Members permission!', ephemeral: true });
    }

    try {
      const user = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'No reason provided';

      await interaction.guild.members.ban(user, { reason });

      // Log to mod-logs
      const modLogsChannel = interaction.guild.channels.cache.find(ch => ch.name === 'mod-logs');
      if (modLogsChannel) {
        const embed = new EmbedBuilder()
          .setColor('#FF0000')
          .setTitle('User Banned')
          .addFields(
            { name: 'User', value: `${user.tag} (${user.id})` },
            { name: 'Moderator', value: `${interaction.user.tag}` },
            { name: 'Reason', value: reason }
          );
        await modLogsChannel.send({ embeds: [embed] });
      }

      // Log action
      await logAction(interaction.guild, 'User Banned', interaction.user, `User: ${user.tag}, Reason: ${reason}`);

      const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('✅ User Banned')
        .setDescription(`${user.tag} has been banned.\nReason: ${reason}`);

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      console.error('Ban error:', error);
      await interaction.reply({ content: `❌ Error banning user: ${error.message}`, ephemeral: true });
    }
  },
};
