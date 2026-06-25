const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { logAction } = require('../utils/auditLog');
const { readData, writeData } = require('../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to warn')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for warning')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.reply({ content: '❌ You need Moderate Members permission!', ephemeral: true });
    }

    try {
      const user = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'No reason provided';

      // Add warning
      const warnings = readData('warnings.json');
      if (!warnings[interaction.guildId]) warnings[interaction.guildId] = {};
      if (!warnings[interaction.guildId][user.id]) warnings[interaction.guildId][user.id] = [];

      warnings[interaction.guildId][user.id].push({
        reason,
        date: new Date().toISOString(),
        moderator: interaction.user.tag,
      });

      writeData('warnings.json', warnings);

      const warningCount = warnings[interaction.guildId][user.id].length;

      // Log to mod-logs
      const modLogsChannel = interaction.guild.channels.cache.find(ch => ch.name === 'mod-logs');
      if (modLogsChannel) {
        const embed = new EmbedBuilder()
          .setColor('#FF6600')
          .setTitle('User Warned')
          .addFields(
            { name: 'User', value: `${user.tag} (${user.id})` },
            { name: 'Moderator', value: `${interaction.user.tag}` },
            { name: 'Reason', value: reason },
            { name: 'Warning Count', value: warningCount.toString() }
          );
        await modLogsChannel.send({ embeds: [embed] });
      }

      // Log action
      await logAction(interaction.guild, 'User Warned', interaction.user, `User: ${user.tag}, Reason: ${reason}, Count: ${warningCount}`);

      const embed = new EmbedBuilder()
        .setColor('#FF6600')
        .setTitle('✅ User Warned')
        .setDescription(`${user.tag} has been warned.\nReason: ${reason}\nTotal Warnings: ${warningCount}`);

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      console.error('Warn error:', error);
      await interaction.reply({ content: `❌ Error warning user: ${error.message}`, ephemeral: true });
    }
  },
};
