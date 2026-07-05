const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/database');

// 💡 Using ultra-reliable, clean static meme template fallbacks to avoid broken dynamic links
const MEMES = [
  { title: "When the code works on the first try", url: "https://http.cat/200.jpg" },
  { title: "Looking for that missing semicolon at 3 AM", url: "https://http.cat/404.jpg" },
  { title: "When you try to run production updates on Friday afternoon", url: "https://http.cat/500.jpg" },
  { title: "The Senior dev watching me struggle with basic git commands", url: "https://http.cat/400.jpg" }
];

module.exports = {
  data: new SlashCommandBuilder().setName('meme').setDescription('Spits out a random funny tech/cat meme.'),
  name: 'meme',
  async execute(interaction) {
    const settings = db.readData('settings.json') || {};
    if (interaction.guild && settings[interaction.guild.id]?.funModule !== 'on') {
      return interaction.reply({ content: '❌ The Fun Module is currently disabled on this server!', ephemeral: true });
    }
    const selected = MEMES[Math.floor(Math.random() * MEMES.length)];
    
    const embed = new EmbedBuilder()
      .setColor('#95A5A6')
      .setTitle(`😂 ${selected.title}`)
      .setImage(selected.url);
    await interaction.reply({ embeds: [embed] });
  }
};