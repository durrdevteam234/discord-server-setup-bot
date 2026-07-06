const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../utils/database');

const DOG_FACTS = [
  { text: "Woof! A dog's sense of smell is up to 100,000 times more powerful than a human's.", url: "https://tenor.com" },
  { text: "Dogs possess three distinct eyelids to keep their eyes clean, lubricated, and structurally protected!", url: "https://tenor.com" },
  { text: "Three registered dogs actually survived the historic sinking of the Titanic passenger ship in 1912.", url: "https://tenor.com" },
  { text: "All newborn puppies are born functionally deaf, blind, and completely without any teeth.", url: "https://tenor.com" },
  { text: "A dog's nose print is entirely unique, much like a human fingerprint, and can be used for identification.", url: "https://tenor.com" },
  { text: "Greyhounds can reach incredible sprinting speeds of up to 45 miles per hour in a matter of seconds!", url: "https://tenor.com" },
  { text: "Dogs curl up tightly in a ball when they sleep due to an age-old instinct to protect vital internal organs.", url: "https://tenor.com" },
  { text: "A dog's whiskers are highly sensitive tactile hairs called vibrissae, which help them navigate in dark rooms.", url: "https://tenor.com" },
  { text: "Dalmatian puppies are completely pure white when born; they develop their iconic spots as they grow older.", url: "https://tenor.com" },
  { text: "Dogs sweat exclusively through the pads of their paws, relying primarily on panting to cool themselves down.", url: "https://tenor.com" },
  { text: "Your dog can read your emotional states! They process vocal inflections and human facial expressions similarly to us.", url: "https://tenor.com" },
  { text: "The Basenji is the world's only breed of dog that cannot bark; instead, they make a unique yodeling sound.", url: "https://tenor.com" },
  { text: "A dog's normal body temperature is slightly higher than a human's, averaging around 38.3°C to 39.2°C (101°F to 102.5°F).", url: "https://tenor.com" },
  { text: "Chow Chows and Shar-Peis are the only two dog breeds known to natively have completely blue-black tongues.", url: "https://tenor.com" },
  { text: "Dogs have about 1,700 taste buds on their tongues, compared to humans who possess roughly 9,000.", url: "https://tenor.com" }
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
      .setDescription(randomDog.text);
      
    // Output URL directly as text layout above embed card
    await interaction.reply({ 
      content: randomDog.url,
      embeds: [embed] 
    }).catch(() => null);
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
      .setDescription(randomDog.text);
      
    return message.reply({ 
      content: randomDog.url,
      embeds: [embed] 
    }).catch(() => null);
  }
};
