const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { readData } = require('../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Check your level and XP')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to check (default: yourself)')
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      const user = interaction.options.getUser('user') || interaction.user;
      const levels = readData('levels.json');
      const userLevel = levels[interaction.guildId]?.[user.id] || { level: 1, xp: 0 };

      const requiredXp = userLevel.level * 100;
      const progress = Math.floor((userLevel.xp / requiredXp) * 10);
      const progressBar = '█'.repeat(progress) + '░'.repeat(10 - progress);

      const embed = new EmbedBuilder()
        .setColor('#0099FF')
        .setTitle(`${user.username}'s Rank`)
        .setThumbnail(user.displayAvatarURL())
        .addFields(
          { name: 'Level', value: userLevel.level.toString(), inline: true },
          { name: 'XP', value: `${userLevel.xp}/${requiredXp}`, inline: true },
          { name: 'Progress', value: `${progressBar} ${Math.floor((userLevel.xp / requiredXp) * 100)}%` }
        );

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Rank error:', error);
      await interaction.reply({ content: `❌ Error fetching rank: ${error.message}`, ephemeral: true });
    }
  },
};
