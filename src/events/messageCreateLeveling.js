const { Events } = require('discord.js');
const { readData, writeData } = require('../utils/database');

// A simple Map to stop users from gaining XP multiple times per second (anti-spam cooldown)
const xpCooldowns = new Map();

module.exports = {
  name: Events.MessageCreate,
  once: false,
  async execute(message) {
    try {
      // 1. Guard Gates: Ignore bots, webhooks, private messages, and prefix command text strings
      if (!message || !message.author || message.author.bot || message.webhookId || !message.guild) return;

      const prefix = message.client.prefix || '|';
      if (message.content.startsWith(prefix)) return;

      const guildId = message.guild.id;
      const userId = message.author.id;

      // 2. Anti-Spam: Only award XP once every 60 seconds per user
      const cooldownKey = `${guildId}-${userId}`;
      if (xpCooldowns.has(cooldownKey)) {
        const lastXpTime = xpCooldowns.get(cooldownKey);
        if (Date.now() - lastXpTime < 60000) return; // Exit if 60 seconds haven't passed
      }

      // 3. Read Database Securely using your standard readData layout
      const levelsData = readData('levels.json') || {};
      if (!levelsData[guildId]) levelsData[guildId] = {};
      if (!levelsData[guildId][userId]) levelsData[guildId][userId] = { xp: 0, level: 1 };

      const userStats = levelsData[guildId][userId];

      // 4. Award random XP (between 15 and 25 per message)
      const xpGained = Math.floor(Math.random() * 11) + 15;
      userStats.xp += xpGained;
      xpCooldowns.set(cooldownKey, Date.now());

      // 5. Level Up Calculation Math Check
      const xpNeeded = userStats.level * 100;
      if (userStats.xp >= xpNeeded) {
        userStats.xp -= xpNeeded;
        userStats.level += 1;
        
        // Try to send a clean level up celebration announcement message to the chat
        await message.reply(`🎉 **Level Up!** ${message.author} has reached **Level ${userStats.level}**! ✨`).catch(() => null);
      }

      // 6. Write Data back safely to disk
      levelsData[guildId][userId] = userStats;
      writeData('levels.json', levelsData);

    } catch (error) {
      console.error('Background leveling engine error:', error.message);
    }
  },
};
