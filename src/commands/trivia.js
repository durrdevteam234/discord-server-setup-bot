const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/database');

const TRIVIA_POOL = [
  { q: "What is the only continent that lies in all four hemispheres?", a: "Africa" },
  { q: "What is the chemical symbol for Gold?", a: "Au" },
  { q: "Which planet in our solar system has the most moons?", a: "Saturn" },
  { q: "What is the rarest naturally occurring blood type in humans?", a: "AB Negative" },
  { q: "How many bones are there in an adult human body?", a: "206" },
  { q: "Which country is home to the Kangaroo?", a: "Australia" },
  { q: "What is the capital city of Japan?", a: "Tokyo" }
];

module.exports = {
  data: new SlashCommandBuilder().setName('trivia').setDescription('Spits out a random brain-teaser trivia question.'),
  name: 'trivia',
  async execute(interaction) {
    const settings = db.readData('settings.json') || {};
    if (interaction.guild && settings[interaction.guild.id]?.funModule !== 'on') {
      return interaction.reply({ content: '❌ The Fun Module is currently disabled on this server!', ephemeral: true });
    }
    const target = TRIVIA_POOL[Math.floor(Math.random() * TRIVIA_POOL.length)];
    const embed = new EmbedBuilder()
      .setColor('#FFA500')
      .setTitle('🧠 Trivia Time!')
      .setDescription(`**Question:** ${target.q}\n\n*Click the spoiler text below for the answer!*\n||${target.a}||`);
    await interaction.reply({ embeds: [embed] });
  }
};