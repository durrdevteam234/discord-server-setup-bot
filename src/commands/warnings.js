const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { readData } = require('../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('View warnings for a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to check')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.reply({ content: '❌ You need Moderate Members permission!', ephemeral: true });
    }

    try {
      const user = interaction.options.getUser('user');
      const warnings = readData('warnings.json');
      const userWarnings = warnings[interaction.guildId]?.[user.id] || [];

      if (userWarnings.length === 0) {
        return interaction.reply({ content: `✅ ${user.tag} has no warnings!`, ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setColor('#FF6600')
        .setTitle(`Warnings for ${user.tag}`)
        .setDescription(`Total Warnings: ${userWarnings.length}`);

      userWarnings.forEach((warning, index) => {
        embed.addFields({
          name: `Warning #${index + 1}`,
          value: `**Reason:** ${warning.reason}\n**Moderator:** ${warning.moderator}\n**Date:** ${new Date(warning.date).toLocaleString()}`,
        });
      });

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      console.error('Warnings error:', error);
      await interaction.reply({ content: `❌ Error fetching warnings: ${error.message}`, ephemeral: true });
    }
  },
};
