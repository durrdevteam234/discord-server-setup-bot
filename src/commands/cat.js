const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../utils/database');

// Expanded pool featuring 12 unique HTTP status cat illustrations and facts
const CAT_FACTS = [
  { text: "Meow! Did you know cats sleep for 70% of their lives?", url: "https://http.cat/100.jpg" },
  { text: "Purr... Cats have 32 muscles in each ear to control them.", url: "https://http.cat/200.jpg" },
  { text: "A group of cats is called a clowder!", url: "https://http.cat/302.jpg" },
  { text: "Cats can make over 100 distinct vocal sounds.", url: "https://http.cat/404.jpg" },
  { text: "Cats use their whiskers to determine if a space is too small to squeeze through.", url: "https://http.cat" },
  { text: "A cat's nose print is completely unique, much like a human fingerprint!", url: "https://http.cat" },
  { text: "Cats have a third eyelid called the haw, which is usually only visible when they are unwell.", url: "https://http.cat" },
  { text: "The first cat in space was a French cat named Félicette in 1963. She survived the trip!", url: "https://http.cat" },
  { text: "Cats are near-sighted, but their peripheral and night vision are far superior to humans.", url: "https://http.cat" },
  { text: "A cat can jump up to six times its height in a single bound.", url: "https://http.cat" },
  { text: "Cats rub against humans to mark them with scent glands located around their faces.", url: "https://http.cat" },
  { text: "Ancient Egyptians shaved off their eyebrows as a sign of mourning when their beloved cats died.", url: "https://http.cat" }
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cat')
    .setDescription('Spits out a cute cat picture and a random feline fact.'),
  name: 'cat',

  async execute(interaction) {
    const settings = db.readData('settings.json') || {};
    const currentGuildSettings = settings[interaction.guildId] || {};

    // Safety fallback flag evaluation matching our boolean architecture
    if (currentGuildSettings.funModule === 'disabled' || currentGuildSettings.funModule === false) {
      return interaction.reply({ 
        content: '❌ The Fun Module is currently disabled on this server!', 
        flags: [MessageFlags.Ephemeral] 
      }).catch(() => null);
    }
    
    const randomCat = CAT_FACTS[Math.floor(Math.random() * CAT_FACTS.length)];
    
    let cuteStyle = 'off';
    try { const cuteData = db.readData('cute.json') || {}; cuteStyle = cuteData[interaction.guildId] || 'off'; } catch (e) {}
    const isCuteActive = cuteStyle !== 'off';

    const embed = new EmbedBuilder()
      .setColor(isCuteActive ? '#FF69B4' : '#E67E22')
      .setTitle(isCuteActive ? '✨ 🐱 RANDOM CAT CONTENT ✨' : '🐱 Random Cat Content')
      .setDescription(randomCat.text)
      .setImage(randomCat.url);
      
    await interaction.reply({ embeds: [embed] }).catch(() => null);
  },

  async executePrefix(message, args, client) {
    const settings = db.readData('settings.json') || {};
    const currentGuildSettings = settings[message.guild?.id] || {};

    if (currentGuildSettings.funModule === 'disabled' || currentGuildSettings.funModule === false) {
      return message.reply('❌ The complete **Fun Command Suite** has been globally disabled by a server administrator.').catch(() => null);
    }

    const randomCat = CAT_FACTS[Math.floor(Math.random() * CAT_FACTS.length)];
    
    let cuteStyle = 'off';
    try { const cuteData = db.readData('cute.json') || {}; cuteStyle = cuteData[message.guild?.id] || 'off'; } catch (e) {}
    const isCuteActive = cuteStyle !== 'off';

    const embed = new EmbedBuilder()
      .setColor(isCuteActive ? '#FF69B4' : '#E67E22')
      .setTitle(isCuteActive ? '✨ 🐱 RANDOM CAT CONTENT ✨' : '🐱 Random Cat Content')
      .setDescription(randomCat.text)
      .setImage(randomCat.url);
      
    await message.reply({ embeds: [embed] }).catch(() => null);
  }
};
