const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { readData, writeData } = require('../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cute')
    .setDescription('Configure cute text layouts for server setup templates')
    .addStringOption(option =>
      option.setName('style')
        .setDescription('Select an aesthetic font layout style')
        .setRequired(true)
        .addChoices(
          { name: 'Wide (ａｅｓｔｈｅｔｉｃ)', value: 'wide' },
          { name: 'Small Caps (sᴍᴀʟʟ ᴄᴀᴘs)', value: 'small-caps' },
          { name: 'Bubbles (ⓑⓤⓑⓑⓛⓔⓢ)', value: 'bubbles' },
          { name: 'Turn Off (Normal Text)', value: 'off' }
        )
    ),

  async execute(interaction) {
    try {
      const style = interaction.options.getString('style');
      const guildId = interaction.guildId;

      const cuteData = readData('cute.json');
      
      // Store the choice directly under the server identity
      cuteData[guildId] = style; 
      writeData('cute.json', cuteData);

      const isOff = style === 'off';
      
      const styleNames = {
        'wide': 'Wide Text Layout (ａｅｓｔｈｅｔｉｃ)',
        'small-caps': 'Small Caps Layout (sᴍᴀʟʟ ᴄᴀᴘs)',
        'bubbles': 'Bubble Text Layout (ⓑⓤⓑⓑⓛⓔⓢ)'
      };

      const embed = new EmbedBuilder()
        .setColor(isOff ? '#808080' : '#FF69B4')
        .setTitle(isOff ? '😢 Cute Mode Disabled' : '✨ Cute Mode Configured! ✨')
        .setDescription(isOff 
          ? 'Cute templates have been turned off. Setup layouts are back to standard Discord styles.' 
          : `Templates will now build using the **${styleNames[style]}** configuration! (´｀)♡`
        );

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      console.error('Cute command configuration error:', error);
      await interaction.reply({ content: `❌ Config Error: ${error.message}`, ephemeral: true });
    }
  },
};
