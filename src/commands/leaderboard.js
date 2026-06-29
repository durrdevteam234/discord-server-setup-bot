const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { readData } = require('../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View the server leaderboard'),

  async execute(context) {
    const isInteraction = !!context.isChatInputCommand;
    const guildId = context.guildId;
    const guild = context.guild;
    const client = context.client;

    if (!guild) return;

    try {
      // 1. Force fetch all current active members in the server to bypass caching issues
      const activeMembersMap = await guild.members.fetch({ force: true }).catch(() => null);
      
      const levels = readData('levels.json') || {};
      const guildLevels = levels[guildId] || {};

      // 2. Map, FILTER out users who are no longer in the server, sort, and slice the top 10
      const sorted = Object.entries(guildLevels)
        .map(([userId, data]) => ({ userId, ...data }))
        .filter(entry => {
          // If activeMembersMap couldn't be fetched, fallback to checking local cache safely
          if (!activeMembersMap) return guild.members.cache.has(entry.userId);
          return activeMembersMap.has(entry.userId);
        })
        .sort((a, b) => b.level - a.level || b.xp - a.xp)
        .slice(0, 10);

      if (sorted.length === 0) {
        const msg = '📊 No active users have leveled up yet!';
        return isInteraction ? context.reply({ content: msg, ephemeral: true }) : context.reply(msg);
      }

      const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('🏆 Server Leaderboard')
        .setDescription('Top 10 users by level');

      for (let i = 0; i < sorted.length; i++) {
        // Safely fetch user fallback 
        const user = await client.users.fetch(sorted[i].userId).catch(() => null);
        const username = user ? user.username : `Unknown User (${sorted[i].userId})`;
        
        embed.addFields({
          name: `#${i + 1} - ${username}`,
          value: `Level: ${sorted[i].level} | XP: ${sorted[i].xp}`,
        });
      }

      if (isInteraction) {
        await context.reply({ embeds: [embed] });
      } else {
        await context.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error('Leaderboard error:', error);
      const msg = `❌ Error fetching leaderboard: ${error.message}`;
      if (isInteraction) {
        await context.reply({ content: msg, ephemeral: true });
      } else {
        await context.reply(msg);
      }
    }
  },
};
