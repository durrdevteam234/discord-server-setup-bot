const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { logAction } = require('../utils/auditLog');
const { readData, writeData } = require('../utils/database');

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
      const member = await interaction.guild.members.fetch(user.id);

      await member.timeout(null);

      // Remove from mutes data
      const mutes = readData('mutes.json');
      if (mutes[interaction.guildId] && mutes[interaction.guildId][user.id]) {
        delete mutes[interaction.guildId][user.id];
        writeData('mutes.json', mutes);
      }

      // Log to mod-logs
      const modLogsChannel = interaction.guild.channels.cache.find(ch => ch.name === 'mod-logs');
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
