const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/database');

const DOG_FACTS = [
  { text: "Woof! A dog's sense of smell is up to 100,000 times stronger than a human's.", url: "https://http.cat/201.jpg" },
  { text: "Dogs have three eyelids to keep their eyes clean and protected!", url: "https://http.cat/202.jpg" },
  { text: "Three dogs actually survived the sinking of the Titanic.", url: "https://http.cat/405.jpg" },
  { text: "All puppies are born functionally deaf and blind.", url: "https://http.cat/451.jpg" }
];

module.exports = {
  data: new SlashCommandBuilder().setName('dog').setDescription('Spits out a cute puppy picture and a random canine fact.'),
  name: 'dog',
  async execute(interaction) {
    const settings = db.readData('settings.json') || {};
    if (interaction.guild && settings[interaction.guild.id]?.funModule !== 'on') {
      return interaction.reply({ content: '❌ The Fun Module is currently disabled on this server!', ephemeral: true });
    }
    
    const randomDog = DOG_FACTS[Math.floor(Math.random() * DOG_FACTS.length)];
    const embed = new EmbedBuilder()
      .setColor('#3498DB')
      .setTitle('🐶 Random Dog Content')
      .setDescription(randomDog.text)
      .setImage(randomDog.url);
      
    await interaction.reply({ embeds: [embed] });
  }
};