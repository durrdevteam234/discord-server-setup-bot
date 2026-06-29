const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { readData } = require('../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Check your current level and XP progress')
    .addUserOption(option => 
      option.setName('target')
        .setDescription('The user whose rank you want to check')
        .setRequired(false)
    ),

  async execute(interactionOrMessage, args = []) {
    try {
      // 1. Check if the incoming payload is a Slash Command or a raw Prefix Message
      const isInteraction = typeof interactionOrMessage.reply === 'function' && !interactionOrMessage.author;
      
      const guild = interactionOrMessage.guild;
      if (!guild) return;

      // 2. 🎯 SECURE TARGET DETECTOR: Safely checks both Slash Options and raw Chat Mentions
      let user;
      if (isInteraction) {
        user = interactionOrMessage.options.getUser('target') || interactionOrMessage.user;
      } else {
        user = interactionOrMessage.mentions.users.first() || (args && args[0] ? await interactionOrMessage.client.users.fetch(args[0]).catch(() => null) : null) || interactionOrMessage.author;
      }

      // 🛡️ SECURITY PATCH: Block checking ranks for users who are no longer in the server
      const isTargetMemberActive = await guild.members.fetch({ user: user.id, force: true }).catch(() => null);
      if (!isTargetMemberActive) {
        const ghostMsg = '❌ This user is not in the server! You cannot check the rank of someone who left.';
        return isInteraction 
          ? await interactionOrMessage.reply({ content: ghostMsg, ephemeral: true }) 
          : await interactionOrMessage.reply(ghostMsg);
      }

      // 3. Read the level data securely using your standard readData tool
      const levelsData = readData('levels.json') || {};
      const guildLevels = levelsData[guild.id] || {};
      const userStats = guildLevels[user.id] || { xp: 0, level: 1 };

      // Calculate how much XP they need for the next milestone
      const nextLevelXp = userStats.level * 100; 

      // 4. Format the Rank Embed Layout
      const embed = new EmbedBuilder()
        .setColor('#0099FF')
        .setTitle(`✨ ${user.username}'s Rank Progress ✨`)
        .setThumbnail(user.displayAvatarURL({ size: 128 }))
        .addFields(
          { name: 'Current Level', value: `🏅 Level **${userStats.level}**`, inline: true },
          { name: 'XP Progress', value: `⭐ **${userStats.xp}** / **${nextLevelXp}** XP`, inline: true }
        )
        .setFooter({ text: 'Keep chatting to earn more experience!' });

      // 5. Send the response back cleanly depending on how it was invoked
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
