const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const database = require('../utils/database'); // Updated to point directly to your MongoDB client model

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Check your current level and XP progress')
    .addUserOption(option => 
      option.setName('target')
        .setDescription('The user whose rank you want to check')
        .setRequired(false)
    ),
  name: 'rank',

  async execute(interaction, client) {
    try {
      // 1. Structural compatibility verification layer for hybrid interaction tracking 
      const isInteraction = interaction.isCommand ? interaction.isCommand() : false;
      const guild = interaction.guild;
      if (!guild) return;

      // 2. 🎯 SECURE TARGET DETECTOR: Safely checks both Slash Options and raw Chat Mentions
      let user;
      if (isInteraction) {
        user = interaction.options.getUser('target') || interaction.user;
      } else {
        // Reads the target user option passed directly from the emulated interaction options map
        user = interaction.options.getUser('target') || interaction.user;
      }

      // 🛡️ SECURITY PATCH: Block checking ranks for users who are no longer in the server
      const isTargetMemberActive = await guild.members.fetch({ user: user.id, force: true }).catch(() => null);
      if (!isTargetMemberActive) {
        const ghostMsg = '❌ This user is not in the server! You cannot check the rank of someone who left.';
        return interaction.reply({ content: ghostMsg, ephemeral: true }).catch(() => null);
      }

      // ========================================================
      // NEW: MONGO-DB LEVELS REGISTRY Lookups
      // ========================================================
      const guildConfig = await database.findOne({ guildId: guild.id }).catch(() => null) || {};
      const levelsData = guildConfig.levelsData || guildConfig.levels || {};
      
      // Default to Level 0, 0 XP to align exactly with messageCreate.js initialization defaults
      const userStats = levelsData[user.id] || { xp: 0, level: 0 };

      // CORRECTED MATH: Fixed milestone math to match (level + 1) * 100 inside messageCreate.js
      const nextLevelXp = (userStats.level + 1) * 100; 

      let cuteStyle = 'off';
      try { cuteStyle = guildConfig.cuteStyle || 'off'; } catch (e) {}
      const isCuteActive = cuteStyle !== 'off';

      // 4. Format the Rank Embed Layout
      const embed = new EmbedBuilder()
        .setColor(isCuteActive ? '#FF69B4' : '#0099FF')
        .setTitle(`✨ ${user.username}'s Rank Progress ✨`)
        .setThumbnail(user.displayAvatarURL({ size: 128 }))
        .addFields(
          { name: 'Current Level', value: `🏅 Level **${userStats.level}**`, inline: true },
          { name: 'XP Progress', value: `⭐ **${userStats.xp}** / **${nextLevelXp}** XP`, inline: true }
        )
        .setFooter({ text: 'Keep chatting to earn more experience!' });

      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Rank layout calculation error:', error);
      return interaction.reply({ content: `❌ Error fetching rank: ${error.message}`, ephemeral: true }).catch(() => null);
    }
  },

  // ADDED: Complete prefix execution loop to handle |rank text triggers natively
  async executePrefix(message, argsArray, client) {
    let targetUser = message.mentions.users.first();
    if (!targetUser && argsArray && argsArray.length > 0) {
      const pureId = argsArray[0].replace(/[^0-9]/g, '');
      if (pureId.length >= 17 && pureId.length <= 20) {
        targetUser = await client.users.fetch(pureId).catch(() => null);
      }
    }

    // Emulate interaction context options mapping for clean runtime cross-compatibility execution
    const mockInteraction = {
      guild: message.guild,
      guildId: message.guild.id,
      member: message.member,
      user: message.author,
      options: {
        getUser: (name) => targetUser || message.author
      },
      reply: async (options) => message.reply(options)
    };

    await this.execute(mockInteraction, client).catch(err => console.error('Error handling leaderboard prefix wrapper:', err));
  }
};
