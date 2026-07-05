const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roll')
    .setDescription('Roll a random number or a multi-sided die.')
    .addIntegerOption(option => 
      option.setName('sides')
        .setDescription('Number of sides on the die (Default: 6)')
        .setRequired(false)
    ),
  name: 'roll',

  async execute(interaction) {
    // 🛡️ Structural module enablement check
    const settings = db.readData('settings.json') || {};
    if (interaction.guild && settings[interaction.guild.id]?.funModule !== 'on') {
      return interaction.reply({ 
        content: '❌ The Fun Module is currently disabled on this server!', 
        ephemeral: true 
      });
    }

    const sides = interaction.options.getInteger('sides') || 6;

    if (sides < 2) {
      return interaction.reply({ 
        content: '❌ A die must have at least 2 sides!', 
        ephemeral: true 
      });
    }

    const result = Math.floor(Math.random() * sides) + 1;

    const embed = new EmbedBuilder()
      .setColor('#9B59B6')
      .setTitle('🎲 Dice Roll')
      .setDescription(`You rolled a **${sides}-sided** die and got a **${result}**!`)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};