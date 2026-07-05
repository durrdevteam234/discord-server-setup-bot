const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/database');

const SCENARIOS = [
  { a: "Have the ability to fly but only at a walking speed pace.", b: "Have the ability to teleport but only to places you've already been." },
  { a: "Always be 10 minutes late to everything.", b: "Always be 20 minutes early to everything." },
  { a: "Find true love but live in poverty.", b: "Become a multi-billionaire but never find true love." },
  { a: "Have all your shirts be 2 sizes too big.", b: "Have all your shirts be 1 size too small." },
  { a: "Be able to speak every human language fluently.", b: "Be able to speak to all animals." },
  { a: "Only be able to whisper everything.", b: "Only be able to shout everything." },
  { a: "Live without music for the rest of your life.", b: "Live without television/movies for the rest of your life." },
  { a: "Know the exact date of your death.", b: "Know the exact cause of your death." }
];

module.exports = {
  data: new SlashCommandBuilder().setName('wouldyourather').setDescription('Presents an impossible split decision.'),
  name: 'wouldyourather',
  async execute(interaction) {
    const settings = db.readData('settings.json') || {};
    if (interaction.guild && settings[interaction.guild.id]?.funModule !== 'on') {
      return interaction.reply({ content: '❌ The Fun Module is currently disabled on this server!', ephemeral: true });
    }
    const scenario = SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)];
    const embed = new EmbedBuilder()
      .setColor('#3498DB')
      .setTitle('🤔 Would You Rather...')
      .setDescription(`🔵 **Choice A:** ${scenario.a}\n\n🔴 **Choice B:** ${scenario.b}`);
    await interaction.reply({ embeds: [embed] });
  }
};