const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { readData, writeData } = require('../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cute')
    .setDescription('Toggle cute mode on or off')
    .addBooleanOption(option =>
      option.setName('enabled')
        .setDescription('Enable or disable cute mode')
        .setRequired(true)
    ),

  async execute(interaction) {
    try {
      const enabled = interaction.options.getBoolean('enabled');
      const userId = interaction.user.id;
      const guildId = interaction.guildId;

      const cute = readData('cute.json');
      if (!cute[guildId]) cute[guildId] = {};
      cute[guildId][userId] = enabled;
      writeData('cute.json', cute);

      const embed = new EmbedBuilder()
        .setColor(enabled ? '#FF69B4' : '#808080')
        .setTitle(enabled ? '✨ Cute Mode Enabled! ✨' : '😢 Cute Mode Disabled')
        .setDescription(enabled 
          ? 'The bot will now use cute fonts and designs! (´｀)♡' 
          : 'Cute mode has been turned off. Back to normal mode!'
        );

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      console.error('Cute error:', error);
      await interaction.reply({ content: `❌ Error: ${error.message}`, ephemeral: true });
    }
  },
};
