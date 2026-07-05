const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/database');

const FORTUNES = [
  "An exciting adventure awaits you right around the corner.",
  "Your hard work will pay off sooner than you expect.",
  "A brilliant idea will clear your path forward very soon.",
  "Do not mistake temptation for opportunity.",
  "Someone close to you is holding a wonderful surprise.",
  "Your courage will lead you to great places this week.",
  "A golden opportunity will present itself when you least expect it.",
  "Be on the lookout for a message that will change your mood entirely.",
  "Trust your instincts; they are leading you in the right direction.",
  "You will soon conquer a minor obstacle that has been bothering you.",
  "A pleasant surprise is in store for you tonight.",
  "Your creative talents will bring you recognition very shortly."
];

module.exports = {
  data: new SlashCommandBuilder().setName('fortune').setDescription('Reveals a prediction about your future.'),
  name: 'fortune',
  async execute(interaction) {
    const settings = db.readData('settings.json') || {};
    if (interaction.guild && settings[interaction.guild.id]?.funModule !== 'on') {
      return interaction.reply({ content: '❌ The Fun Module is currently disabled on this server!', ephemeral: true });
    }
    const prediction = FORTUNES[Math.floor(Math.random() * FORTUNES.length)];
    const embed = new EmbedBuilder().setColor('#A020F0').setTitle('🔮 Your Fortune').setDescription(prediction);
    await interaction.reply({ embeds: [embed] });
  }
};