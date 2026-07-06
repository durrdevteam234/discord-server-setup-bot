const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../utils/database');

// Expanded pool featuring 12 unique dog facts paired with clean, reliable open-source canine visual links
const DOG_FACTS = [
  { text: "Woof! A dog's sense of smell is up to 100,000 times stronger than a human's.", url: "https://dog.ceo" },
  { text: "Dogs have three eyelids to keep their eyes clean, lubricated, and protected!", url: "https://dog.ceo" },
  { text: "Three dogs actually survived the historical sinking of the Titanic in 1912.", url: "https://dog.ceo" },
  { text: "All newborn puppies are born functionally deaf, blind, and without any teeth.", url: "https://dog.ceo" },
  { text: "A dog's nose print is completely unique, much like a human fingerprint, and can be used to identify them.", url: "https://dog.ceo" },
  { text: "The Basenji is the world's only breed of dog that cannot bark; instead, they make a unique yodeling sound.", url: "https://dog.ceo" },
  { text: "Greyhounds can reach sprinting speeds of up to 45 miles per hour, making them the fastest canine breed.", url: "https://dog.ceo" },
  { text: "Dogs curl up in a ball when they sleep due to an age-old instinct to protect vital organs from predators.", url: "https://dog.ceo" },
  { text: "A dog's whiskers are highly sensitive tactile hairs called vibrissae, which help them navigate in low light.", url: "https://dog.ceo" },
  { text: "Dalmatian puppies are completely pure white when born; they develop their iconic black spots as they age.", url: "https://dog.ceo" },
  { text: "Dogs sweat exclusively through the pads of their paws, relying primarily on panting to cool themselves down.", url: "https://dog.ceo" },
  { text: "Your dog can read your emotional states! They process vocal inflections and human facial expressions similarly to us.", url: "https://dog.ceo" }
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dog')
    .setDescription('Spits out a cute puppy picture and a random canine fact.'),
  name: 'dog',

  async execute(interaction) {
    const settings = db.readData('settings.json') || {};
    const currentGuildSettings = settings[interaction.guildId] || {};

    // Standard structural safety framework filter matching boolean conversions
    if (currentGuildSettings.funModule === 'disabled' || currentGuildSettings.funModule === false) {
      return interaction.reply({ 
        content: '❌ The Fun Module is currently disabled on this server!', 
        flags: [MessageFlags.Ephemeral] 
      }).catch(() => null);
    }
    
    const randomDog = DOG_FACTS[Math.floor(Math.random() * DOG_FACTS.length)];
    
    let cuteStyle = 'off';
    try { const cuteData = db.readData('cute.json') || {}; cuteStyle = cuteData[interaction.guildId] || 'off'; } catch (e) {}
    const isCuteActive = cuteStyle !== 'off';

    const embed = new EmbedBuilder()
      .setColor(isCuteActive ? '#FF69B4' : '#3498DB')
      .setTitle(isCuteActive ? '✨ 🐶 RANDOM DOG CONTENT ✨' : '🐶 Random Dog Content')
      .setDescription(randomDog.text)
      .setImage(randomDog.url);
      
    await interaction.reply({ embeds: [embed] }).catch(() => null);
  },

  async executePrefix(message, args, client) {
    const settings = db.readData('settings.json') || {};
    const currentGuildSettings = settings[message.guild?.id] || {};

    if (currentGuildSettings.funModule === 'disabled' || currentGuildSettings.funModule === false) {
      return message.reply('❌ The complete **Fun Command Suite** has been globally disabled by a server administrator.').catch(() => null);
    }

    const randomDog = DOG_FACTS[Math.floor(Math.random() * DOG_FACTS.length)];
    
    let cuteStyle = 'off';
    try { const cuteData = db.readData('cute.json') || {}; cuteStyle = cuteData[message.guild?.id] || 'off'; } catch (e) {}
    const isCuteActive = cuteStyle !== 'off';

    const embed = new EmbedBuilder()
      .setColor(isCuteActive ? '#FF69B4' : '#3498DB')
      .setTitle(isCuteActive ? '✨ 🐶 RANDOM DOG CONTENT ✨' : '🐶 Random Dog Content')
      .setDescription(randomDog.text)
      .setImage(randomDog.url);
      
    await message.reply({ embeds: [embed] }).catch(() => null);
  }
};
