const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const database = require('../utils/database'); // Updated to point directly to your MongoDB client model

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('View warnings for a user')
    .addUserOption(option => option.setName('user').setDescription('User to check').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  name: 'warnings',

  async execute(interaction, client) {
    const isInteraction = interaction.isCommand ? interaction.isCommand() : false;
    const guild = interaction.guild;
    const memberExecutor = interaction.member;
    const guildId = interaction.guildId;

    if (!memberExecutor.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      const msg = '❌ You need Moderate Members permission!';
      return isInteraction ? interaction.reply({ content: msg, ephemeral: true }) : interaction.reply(msg);
    }

    try {
      let user;

      if (isInteraction) {
        user = interaction.options.getUser('user');
      } else {
        user = interaction.options.getUser('user');
      }

      if (!user) {
        const msg = '❌ Please mention a valid user or provide a valid user ID.';
        return interaction.reply({ content: msg, ephemeral: true }).catch(() => null);
      }

      // ========================================================
      // NEW: FETCH HISTORICAL INFRASTRUCTURE LOGS FROM MONGO-DB
      // ========================================================
      const guildConfig = await database.findOne({ guildId: guildId }).catch(() => null) || {};
      const userWarnings = guildConfig.warnings?.[user.id] || [];

      if (userWarnings.length === 0) {
        const msg = `✅ **${user.username}** has no active warnings on this server!`;
        return interaction.reply({ content: msg }).catch(() => null);
      }

      let cuteStyle = 'off';
      try {
        cuteStyle = guildConfig.cuteStyle || 'off'; // Reads cute configuration mapping straight from doc schema
      } catch (_) {}
      
      const embed = new EmbedBuilder()
        .setColor('#FF6600')
        .setTitle(`📜 Warnings History: ${user.username}`)
        .setDescription(`Total Tracked Server Infractions: **${userWarnings.length}**`);

      // Limit fields to 25 to prevent hitting hard Discord embed limits on messy targets
      userWarnings.slice(0, 25).forEach((warning, index) => {
        const timestampMs = warning.timestamp ? Math.floor(new Date(warning.timestamp).getTime() / 1000) : null;
        const timeDisplay = timestampMs ? `<t:${timestampMs}:R>` : '`Unknown Date`';

        embed.addFields({
          name: `⚠️ Infraction Entry #${index + 1}`,
          value: `**Reason:** ${warning.reason}\n**Staff ID:** <@${warning.moderatorId}>\n**Issued:** ${timeDisplay}`,
        });
      });

      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Warnings error:', error);
      const msg = `❌ Error fetching warnings: ${error.message}`;
      return interaction.reply({ content: msg, ephemeral: true }).catch(() => null);
    }
  },
};
