const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { readData } = require('../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View the server leaderboard'),

  async execute(interaction) {
    try {
      const levels = readData('levels.json');
      const guildLevels = levels[interaction.guildId] || {};

      const sorted = Object.entries(guildLevels)
        .map(([userId, data]) => ({ userId, ...data }))
        .sort((a, b) => b.level - a.level || b.xp - a.xp)
        .slice(0, 10);

      if (sorted.length === 0) {
        return interaction.reply({ content: '📊 No users have leveled up yet!', ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('🏆 Server Leaderboard')
        .setDescription('Top 10 users by level');

      for (let i = 0; i < sorted.length; i++) {
        const user = await interaction.client.users.fetch(sorted[i].userId);
        embed.addFields({
          name: `#${i + 1} - ${user.username}`,
          value: `Level: ${sorted[i].level} | XP: ${sorted[i].xp}`,
        });
      }

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Leaderboard error:', error);
      await interaction.reply({ content: `❌ Error fetching leaderboard: ${error.message}`, ephemeral: true });
    }
  },
};
