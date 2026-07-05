const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/database');

// Clean, ultra-reliable fallback images paired with unique caption options
const CAT_FACTS = [
  { text: "Meow! Did you know cats sleep for 70% of their lives?", url: "https://http.cat/100.jpg" },
  { text: "Purr... Cats have 32 muscles in each ear to control them.", url: "https://http.cat/200.jpg" },
  { text: "A group of cats is called a clowder!", url: "https://http.cat/302.jpg" },
  { text: "Cats can make over 100 distinct vocal sounds.", url: "https://http.cat/404.jpg" }
];

module.exports = {
  data: new SlashCommandBuilder().setName('cat').setDescription('Spits out a cute cat picture and a random feline fact.'),
  name: 'cat',
  async execute(interaction) {
    const settings = db.readData('settings.json') || {};
    if (interaction.guild && settings[interaction.guild.id]?.funModule !== 'on') {
      return interaction.reply({ content: '❌ The Fun Module is currently disabled on this server!', ephemeral: true });
    }
    
    const randomCat = CAT_FACTS[Math.floor(Math.random() * CAT_FACTS.length)];
    const embed = new EmbedBuilder()
      .setColor('#E67E22')
      .setTitle('🐱 Random Cat Content')
      .setDescription(randomCat.text)
      .setImage(randomCat.url);
      
    await interaction.reply({ embeds: [embed] });
  }
};