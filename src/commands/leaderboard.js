const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const database = require('../utils/database'); // Points directly to your MongoDB client model

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View the server leaderboard'),
  name: 'leaderboard',

  async execute(interaction, client) {
    // Structural compatibility verification layer for hybrid interaction tracking 
    const isInteraction = interaction.isCommand ? interaction.isCommand() : false;
    const guildId = interaction.guildId;
    const guild = interaction.guild;
    
    // Fallback assignment protecting the client context on text pathways
    const activeClient = client || interaction.client;
    if (!guild) return;

    try {
      // ==========================================
      // 🔒 LEVELING ENABLED VALIDATION PROTOCOL
      // ==========================================
      // Fetch historical configurations to verify if the leveling system was disabled
      const guildConfig = await database.findOne({ guildId: guildId }).catch(() => null) || {};
      
      const mainSettingsLocal = guildConfig.settings || {}; 
      const levelConfig = guildConfig.levelingSettings || {};

      const targetStatus = levelConfig.status || levelConfig.enabled;
      const mainLevelingStatus = mainSettingsLocal.leveling || guildConfig.levelingEnabled || guildConfig.leveling;

      const isLevelingActive = 
        (mainLevelingStatus === 'on' || mainLevelingStatus === true) ||
        (targetStatus === 'on' || targetStatus === true);

      if (!isLevelingActive) {
        const disabledMsg = '❌ **System Offline:** The global server leveling economy and experience loops have been disabled by a server administrator.';
        return interaction.reply({ content: disabledMsg, ephemeral: true }).catch(() => null);
      }

      // 1. Force fetch all current active members in the server to bypass caching issues
      const activeMembersMap = await guild.members.fetch({ force: true }).catch(() => null);
      
      // Fetch level mapping objects saved dynamically inside the guild config document
      const levelsData = guildConfig.levelsData || guildConfig.levels || {};
      
      // 2. Map, FILTER out users who are no longer in the server, sort, and slice the top 10
      const sorted = Object.entries(levelsData)
        .map(([userId, data]) => ({ userId, ...data }))
        .filter(entry => {
          if (!activeMembersMap) return guild.members.cache.has(entry.userId);
          return activeMembersMap.has(entry.userId);
        })
        .sort((a, b) => b.level - a.level || b.xp - a.xp)
        .slice(0, 10);

      if (sorted.length === 0) {
        const msg = '📊 No active users have leveled up yet!';
        return interaction.reply({ content: msg, ephemeral: true }).catch(() => null);
      }

      const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('🏆 Server Leaderboard')
        .setDescription('Top 10 users by level');

      for (let i = 0; i < sorted.length; i++) {
        const user = await activeClient.users.fetch(sorted[i].userId).catch(() => null);
        const username = user ? user.username : `Unknown User (${sorted[i].userId})`;
        
        embed.addFields({
          name: `#${i + 1} - ${username}`,
          value: `Level: ${sorted[i].level} | XP: ${sorted[i].xp}`,
        });
      }

      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Leaderboard error:', error);
      const msg = `❌ Error fetching leaderboard: ${error.message}`;
      return interaction.reply({ content: msg, ephemeral: true }).catch(() => null);
    }
  },

  async executePrefix(message, argsArray, client) {
    const mockInteraction = {
      guild: message.guild,
      guildId: message.guild.id,
      member: message.member,
      user: message.author,
      reply: async (options) => message.reply(options)
    };

    await this.execute(mockInteraction, client).catch(err => console.error('Error handling leaderboard prefix wrapper:', err));
  }
};
