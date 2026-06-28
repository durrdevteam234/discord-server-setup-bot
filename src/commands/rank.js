const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { readData } = require('../utils/database'); // 🟢 Uses your correct database import

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Check your current level and XP progress')
    .addUserOption(option => 
      option.setName('target')
        .setDescription('The user whose rank you want to check')
        .setRequired(false)
    ),

  async execute(interactionOrMessage) {
    try {
      // 1. Dual Execution Compatibility Check (Handles both /rank and |rank)
      const isInteraction = typeof interactionOrMessage.reply === 'function' && !interactionOrMessage.author;
      
      const guild = isInteraction ? interactionOrMessage.guild : interactionOrMessage.guild;
      const user = isInteraction 
        ? (interactionOrMessage.options.getUser('target') || interactionOrMessage.user) 
        : (interactionOrMessage.mentions.users.first() || interactionOrMessage.author);

      if (!guild) return;

      // 2. Read the level data securely using your standard readData tool
      const levelsData = readData('levels.json') || {};
      const guildLevels = levelsData[guild.id] || {};
      const userStats = guildLevels[user.id] || { xp: 0, level: 1 };

      // Calculate how much XP they need for the next milestone
      const nextLevelXp = userStats.level * 100; 

      // 3. Format the Rank Embed Layout
      const embed = new EmbedBuilder()
        .setColor('#0099FF')
        .setTitle(`✨ ${user.username}'s Rank Progress ✨`)
        .setThumbnail(user.displayAvatarURL({ size: 128 }))
        .addFields(
          { name: 'Current Level', value: `🏅 Level **${userStats.level}**`, inline: true },
          { name: 'XP Progress', value: `⭐ **${userStats.xp}** / **${nextLevelXp}** XP`, inline: true }
        )
        .setFooter({ text: 'Keep chatting to earn more experience!' });

      // 4. Send the response back cleanly depending on how it was invoked
      if (isInteraction) {
        await interactionOrMessage.reply({ embeds: [embed] });
      } else {
        await interactionOrMessage.reply({ embeds: [embed] }).catch(() => null);
      }

    } catch (error) {
      console.error('Rank layout calculation error:', error);
      
      const errorPayload = { content: `❌ Error fetching rank: ${error.message}`, ephemeral: true };
      if (typeof interactionOrMessage.reply === 'function' && !interactionOrMessage.author) {
        await interactionOrMessage.reply(errorPayload).catch(() => null);
      } else {
        await interactionOrMessage.reply(`❌ Error fetching rank: ${error.message}`).catch(() => null);
      }
    }
  },
};
