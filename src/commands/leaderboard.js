const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const database = require('../utils/database'); // Updated to use your live MongoDB layout connection

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
      // 1. Force fetch all current active members in the server to bypass caching issues
      const activeMembersMap = await guild.members.fetch({ force: true }).catch(() => null);
      
      // ========================================================
      // NEW: MONGO-DB LEVELS REGISTRY PARSING LOOKUP
      // ========================================================
      // Fetch level mapping objects saved dynamically inside the guild config document
      const guildConfig = await database.findOne({ guildId: guildId }).catch(() => null) || {};
      
      // Assumes your levels data is nested under user profiles map keys or a dedicated levels object array
      // Re-aligning lookup tracking matching your levelsData dictionary schemas:
      const levelsData = guildConfig.levelsData || guildConfig.levels || {};
      
      // 2. Map, FILTER out users who are no longer in the server, sort, and slice the top 10
      const sorted = Object.entries(levelsData)
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
        return interaction.reply({ content: msg, ephemeral: true }).catch(() => null);
      }

      const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('🏆 Server Leaderboard')
        .setDescription('Top 10 users by level');

      for (let i = 0; i < sorted.length; i++) {
        // Safely fetch user fallback via the protected client context
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

  // ADDED: Complete prefix execution loop to handle |leaderboard text triggers natively
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
