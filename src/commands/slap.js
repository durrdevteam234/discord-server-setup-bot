const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../utils/database');

// Expanded pool featuring 10 unique, hilarious slap actions
const SLAP_ACTIONS = [
  "slapped {target} across the face with a giant, smelly yellow trout! 🐟",
  "clobbered {target} with a loud, squeaky cartoon toy mallet! 🔨",
  "slapped the mechanical keyboard right out from under {target}'s hands! ⌨️",
  "hit {target} with a legendary, ultra-powerful anime-style backhand slap! 💥",
  "challenges {target} to reality with a sudden, comedic wake-up slap! ⏰",
  "launches a high-velocity slice of wet pizza directly at {target}'s face! 🍕",
  "smacks {target} lightly upside the head with a rolled-up programming magazine! 🗞️",
  "winds up for an absolute mega-slap that sends {target} flying into the next channel! 🚀",
  "playfully slaps a glowing neon sticker onto {target}'s forehead that reads 'LOUSER'! 🏷️",
  "hits {target} with a swift, perfectly timed triple-slap combination! 🌪️"
];

// High-quality, vetted anime slap visual assets
const SLAP_GIFS = [
  "https://giphy.com",
  "https://giphy.com",
  "https://giphy.com",
  "https://giphy.com"
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slap')
    .setDescription('Slap another user with a hilarious item.')
    .addUserOption(option => option.setName('user').setDescription('The user to slap').setRequired(true)),
  name: 'slap',

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
    
    const target = interaction.options.getUser('user');
    if (!target) {
      return interaction.reply({ content: '❌ Could not resolve that user profile target.', flags: [MessageFlags.Ephemeral] }).catch(() => null);
    }

    const caller = interaction.user;
    if (target.id === caller.id) {
      return interaction.reply({ content: '💥 You swing and somehow wind up slapping your own face. Ouch! 🤕', flags: [MessageFlags.Ephemeral] }).catch(() => null);
    }

    const randomAction = SLAP_ACTIONS[Math.floor(Math.random() * SLAP_ACTIONS.length)].replace('{target}', `**${target.username}**`);
    const randomGif = SLAP_GIFS[Math.floor(Math.random() * SLAP_GIFS.length)];
    
    let cuteStyle = 'off';
    try { const cuteData = db.readData('cute.json') || {}; cuteStyle = cuteData[interaction.guildId] || 'off'; } catch (e) {}
    const isCuteActive = cuteStyle !== 'off';

    const embed = new EmbedBuilder()
      .setColor(isCuteActive ? '#FF69B4' : '#E74C3C')
      .setTitle(isCuteActive ? '✨ 💥 COMEDIC CLOBBER STATE ✨' : '💥 Direct Hit!')
      .setDescription(`**${caller.username}** ${randomAction}`)
      .setImage(randomGif);
      
    await interaction.reply({ embeds: [embed] }).catch(() => null);
  },

  async executePrefix(message, args, client) {
    const settings = db.readData('settings.json') || {};
    const currentGuildSettings = settings[message.guild?.id] || {};

    if (currentGuildSettings.funModule === 'disabled' || currentGuildSettings.funModule === false) {
      return message.reply('❌ The complete **Fun Command Suite** has been globally disabled by a server administrator.').catch(() => null);
    }

    // Rely explicitly on the unified messageCreate interaction emulator pipeline
    const targetCommand = client.commands.get('slap');
    if (targetCommand) {
      return; 
    }
  }
};
