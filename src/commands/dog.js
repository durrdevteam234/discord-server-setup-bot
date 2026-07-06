const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../utils/database');

const DOG_FACTS = [
  { text: "Woof! A dog's sense of smell is up to 100,000 times stronger than a human's.", url: "https://unsplash.com" },
  { text: "Dogs have three eyelids to keep their eyes clean, lubricated, and protected!", url: "https://unsplash.com" },
  { text: "Three dogs actually survived the historical sinking of the Titanic in 1912.", url: "https://unsplash.com" },
  { text: "All newborn puppies are born functionally deaf, blind, and without any teeth.", url: "https://unsplash.com" },
  { text: "A dog's nose print is completely unique, much like a human fingerprint!", url: "https://unsplash.com" },
  { text: "Greyhounds can reach sprinting speeds of up to 45 miles per hour!", url: "https://unsplash.com" },
  { text: "Dogs curl up in a ball when they sleep due to an age-old instinct to protect vital organs from predators.", url: "https://unsplash.com" },
  { text: "A dog's whiskers are highly sensitive tactile hairs called vibrissae, which help them navigate in low light.", url: "https://unsplash.com" },
  { text: "Dalmatian puppies are completely pure white when born; they develop their iconic spots as they age.", url: "https://unsplash.com" },
  { text: "Dogs sweat exclusively through the pads of their paws, relying primarily on panting to cool down.", url: "https://unsplash.com" },
  { text: "Your dog can read your emotional states! They process vocal inflections and human facial expressions similarly to us.", url: "https://unsplash.com" },
  { text: "The Basenji is the world's only breed of dog that cannot bark; instead, they make a unique yodeling sound.", url: "https://unsplash.com" },
  { text: "A dog's normal body temperature is slightly higher than a human's, averaging around 38.3°C to 39.2°C (101°F to 102.5°F).", url: "https://unsplash.com" },
  { text: "Ancient Egyptians revered dogs highly; when a family dog died, owners would shave their eyebrows as a sign of mourning.", url: "https://unsplash.com" },
  { text: "Dogs have about 1,700 taste buds on their tongues, compared to humans who have roughly 9,000.", url: "https://unsplash.com" },
  { text: "The position of a dog's tail wag can convey specific meanings; a wag more to the right suggests positive feelings.", url: "https://unsplash.com" },
  { text: "An adult dog has 42 permanent teeth in their mouth, compared to adult humans who have 32.", url: "https://unsplash.com" },
  { text: "Service dogs are trained to explicitly look out for traffic changes and can map out safe paths independently.", url: "https://unsplash.com" },
  { text: "Dogs possess a specialized dynamic grouping of muscles that lets them rotate their ears completely independently.", url: "https://unsplash.com" },
  { text: "Chow Chows and Shar-Peis are the only two dog breeds known to natively have completely blue-black tongues.", url: "https://unsplash.com" }
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dog')
    .setDescription('Spits out a cute puppy picture and a random canine fact.'),
  name: 'dog',

  async execute(interaction) {
    const settings = db.readData('settings.json') || {};
    const currentGuildSettings = settings[interaction.guildId] || {};

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
