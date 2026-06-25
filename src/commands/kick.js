const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { logAction } = require('../utils/auditLog');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a user from the server')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to kick')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for kick')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) {
      return interaction.reply({ content: '❌ You need Kick Members permission!', ephemeral: true });
    }

    try {
      const user = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      const member = await interaction.guild.members.fetch(user.id);

      await member.kick(reason);

      // Log to mod-logs
      const modLogsChannel = interaction.guild.channels.cache.find(ch => ch.name === 'mod-logs');
      if (modLogsChannel) {
        const embed = new EmbedBuilder()
          .setColor('#FF9900')
          .setTitle('User Kicked')
          .addFields(
            { name: 'User', value: `${user.tag} (${user.id})` },
            { name: 'Moderator', value: `${interaction.user.tag}` },
            { name: 'Reason', value: reason }
          );
        await modLogsChannel.send({ embeds: [embed] });
      }

      // Log action
      await logAction(interaction.guild, 'User Kicked', interaction.user, `User: ${user.tag}, Reason: ${reason}`);

      const embed = new EmbedBuilder()
        .setColor('#FF9900')
        .setTitle('✅ User Kicked')
        .setDescription(`${user.tag} has been kicked.\nReason: ${reason}`);

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      console.error('Kick error:', error);
      await interaction.reply({ content: `❌ Error kicking user: ${error.message}`, ephemeral: true });
    }
  },
};
