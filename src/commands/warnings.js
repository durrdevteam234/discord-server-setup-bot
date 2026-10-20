const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../utils/database'); // Points to your old-shape mapping framework

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('View warnings for a user')
    .addUserOption(option => option.setName('user').setDescription('User to check').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  name: 'warnings',

  async execute(interaction, client) {
    await interaction.deferReply().catch(() => null);

    const guild = interaction.guild;
    const memberExecutor = interaction.member;
    const guildId = interaction.guildId;

    if (!memberExecutor.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      const msg = '❌ You need Moderate Members permission!';
      return interaction.editReply({ content: msg });
    }

    try {
      const user = interaction.options.getUser('user');

      if (!user) {
        const msg = '❌ Please mention a valid user or provide a valid user ID.';
        return interaction.editReply({ content: msg });
      }

      // 🌟 ADAPTER RECONSTRUCTION: Safely parsing historical records out of your setup array maps
      const warnings = (await db.readData('warnings.json')) || {};
      const userWarnings = warnings[guildId]?.[user.id] || [];

      if (userWarnings.length === 0) {
        const msg = `✅ **${user.username}** has no active warnings on this server!`;
        return interaction.editReply({ content: msg });
      }
      
      const embed = new EmbedBuilder()
        .setColor('#FF6600')
        .setTitle(`📜 Warnings History: ${user.username}`)
        .setDescription('Total Tracked Server Infractions: **' + userWarnings.length + '**');

      userWarnings.slice(0, 25).forEach((warning, index) => {
        const timestampMs = warning.timestamp ? Math.floor(new Date(warning.timestamp).getTime() / 1000) : null;
        const timeDisplay = timestampMs ? '<t:' + timestampMs + ':R>' : '`Unknown Date`';

        embed.addFields({
          name: '⚠️ Infraction Entry #' + (index + 1),
          value: '**Reason:** ' + warning.reason + '\n**Staff ID:** <@' + warning.moderatorId + '>\n**Issued:** ' + timeDisplay,
        });
      });

      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Warnings error:', error);
      const msg = `❌ Error fetching warnings: ${error.message}`;
      return interaction.editReply({ content: msg });
    }
  },

  
};
