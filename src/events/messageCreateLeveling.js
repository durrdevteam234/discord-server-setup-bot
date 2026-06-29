const { Events, EmbedBuilder } = require('discord.js');
const { readData, writeData } = require('../utils/database');

const xpCooldowns = new Map();

module.exports = {
  name: Events.MessageCreate,
  once: false,
  async execute(message) {
    try {
      if (!message || !message.author || message.author.bot || message.webhookId || !message.guild) return;

      const prefix = message.client.prefix || '|';
      if (message.content.startsWith(prefix)) return;

      const guildId = message.guild.id;
      const userId = message.author.id;

      // 1. Correct database reads matching your setup script
      const settings = readData('settings.json') || {};
      const levelingSettings = readData('leveling_settings.json') || {};
      
      const serverSettings = settings[guildId] || {};
      const serverLevelingConfig = levelingSettings[guildId] || {};

      // 2. Structural status check (verifies if enabled in settings or leveling file)
      const isLevelingActive = 
        serverSettings.leveling === 'on' || 
        serverLevelingConfig.status === 'on' || 
        serverLevelingConfig.enabled === true;

      if (!isLevelingActive) return;

      // Anti-Spam Cooldown check
      const cooldownKey = `${guildId}-${userId}`;
      if (xpCooldowns.has(cooldownKey)) {
        const lastXpTime = xpCooldowns.get(cooldownKey);
        if (Date.now() - lastXpTime < 60000) return;
      }

      const levelsData = readData('levels.json') || {};
      if (!levelsData[guildId]) levelsData[guildId] = {};
      if (!levelsData[guildId][userId]) levelsData[guildId][userId] = { xp: 0, level: 1 };

      const userStats = levelsData[guildId][userId];
      const xpGained = Math.floor(Math.random() * 11) + 15;
      userStats.xp += xpGained;
      xpCooldowns.set(cooldownKey, Date.now());

      const xpNeeded = userStats.level * 100;
      if (userStats.xp >= xpNeeded) {
        userStats.xp -= xpNeeded;
        userStats.level += 1;
        
        // 3. TARGET THE CORRECT SAVED KEY
        // Pulls channelId directly from leveling_settings.json configuration block
        const customChannelId = serverLevelingConfig.channelId;
        
        let targetChannel = message.channel;
        if (customChannelId) {
          // Checks local memory cache first, falls back to direct API fetch for Render container restarts
          targetChannel = message.guild.channels.cache.get(customChannelId) || 
                          await message.guild.channels.fetch(customChannelId).catch(() => null) || 
                          message.channel;
        }

        const levelUpEmbed = new EmbedBuilder()
          .setColor('#FFD700')
          .setDescription(`🎉 **Level Up!** ${message.author} has reached **Level ${userStats.level}**! ✨`);

        await targetChannel.send({ embeds: [levelUpEmbed] }).catch(() => null);
      }

      levelsData[guildId][userId] = userStats;
      writeData('levels.json', levelsData);

    } catch (error) {
      console.error('Background leveling engine error:', error.message);
    }
  },
};
