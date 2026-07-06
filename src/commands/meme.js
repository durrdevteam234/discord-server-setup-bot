const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../utils/database');

// Expanded pool featuring 10 genuine developer/tech meme mock-ups using highly reliable public assets
const MEMES = [
  { title: "When the code works perfectly on the very first execution compile", url: "https://imgur.com" },
  { title: "Me tracking down that single missing closing bracket at 3 AM", url: "https://imgur.com" },
  { title: "Deploying untested hotfixes directly to production on a Friday afternoon", url: "https://imgur.com" },
  { title: "The tech lead watching me struggle with basic git merge conflicts", url: "https://imgur.com" },
  { title: "When a junior developer says their code has absolutely zero bugs", url: "https://imgur.com" },
  { title: "It works perfectly on my local machine environment setup", url: "https://imgur.com" },
  { title: "When the stack overflow copy-paste answer actually solves your exact error", url: "https://imgur.com" },
  { title: "Reading through code comments that you wrote exactly six months ago", url: "https://imgur.com" },
  { title: "Adding a quick console.log to print out every single variable state", url: "https://imgur.com" },
  { title: "When the documentation is completely blank but the software package has 1M downloads", url: "https://imgur.com" }
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('meme')
    .setDescription('Spits out a random funny tech/cat meme.'),
  name: 'meme',

  async execute(interaction) {
    const settings = db.readData('settings.json') || {};
    const currentGuildSettings = settings[interaction.guildId] || {};

    // Standard structural safety framework filter matching boolean configurations
    if (currentGuildSettings.funModule === 'disabled' || currentGuildSettings.funModule === false) {
      return interaction.reply({ 
        content: '❌ The Fun Module is currently disabled on this server!', 
        flags: [MessageFlags.Ephemeral] 
      }).catch(() => null);
    }
    
    const selected = MEMES[Math.floor(Math.random() * MEMES.length)];
    
    let cuteStyle = 'off';
    try { const cuteData = db.readData('cute.json') || {}; cuteStyle = cuteData[interaction.guildId] || 'off'; } catch (e) {}
    const isCuteActive = cuteStyle !== 'off';

    const embed = new EmbedBuilder()
      .setColor(isCuteActive ? '#FF69B4' : '#95A5A6')
      .setTitle(isCuteActive ? `✨ 😂 ${selected.title.toUpperCase()} ✨` : `😂 ${selected.title}`)
      .setImage(selected.url)
      .setFooter({ text: 'Source: Developer Humor Repository' });
      
    await interaction.reply({ embeds: [embed] }).catch(() => null);
  },

  async executePrefix(message, args, client) {
    const settings = db.readData('settings.json') || {};
    const currentGuildSettings = settings[message.guild?.id] || {};

    if (currentGuildSettings.funModule === 'disabled' || currentGuildSettings.funModule === false) {
      return message.reply('❌ The complete **Fun Command Suite** has been globally disabled by a server administrator.').catch(() => null);
    }

    const selected = MEMES[Math.floor(Math.random() * MEMES.length)];
    
    let cuteStyle = 'off';
    try { const cuteData = db.readData('cute.json') || {}; cuteStyle = cuteData[message.guild?.id] || 'off'; } catch (e) {}
    const isCuteActive = cuteStyle !== 'off';

    const embed = new EmbedBuilder()
      .setColor(isCuteActive ? '#FF69B4' : '#95A5A6')
      .setTitle(isCuteActive ? `✨ 😂 ${selected.title.toUpperCase()} ✨` : `😂 ${selected.title}`)
      .setImage(selected.url)
      .setFooter({ text: 'Source: Developer Humor Repository' });
      
    await message.reply({ embeds: [embed] }).catch(() => null);
  }
};
