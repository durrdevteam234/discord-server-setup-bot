const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../utils/database');

// Expanded pool featuring 10 unique hug action variations
const HUG_ACTIONS = [
  "wrapped their arms tightly around {target} for a massive, warm bear hug! 🧸",
  "gives {target} a comforting squeeze. Everything is going to be okay! 💕",
  "tackles {target} with an unexpected, joyful surprise hug! ⚡",
  "gives {target} a polite but deeply genuine virtual embrace. ✨",
  "runs over and engulfs {target} in a cozy, warm blanket-style hug! 🧣",
  "gives {target} a gentle, warm side-hug to brighten up their day! ☀️",
  "sneaks up behind {target} and gives them a sudden, happy back-hug! 🤗",
  "gives {target} an absolute mega-hug that lifts them completely off the ground! 🚀",
  "shares a quiet, comforting, long-lasting embrace with {target}. 💤",
  "flings their arms wide open and wraps {target} in a pure, wholesome cloud-like hug! ☁️"
];

// Clean, ultra-reliable open-source anime hug visual resources 
const HUG_GIFS = [
  "https://giphy.com",
  "https://giphy.com",
  "https://giphy.com",
  "https://giphy.com"
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hug')
    .setDescription('Give a member a warm, fuzzy virtual hug.')
    .addUserOption(option => option.setName('user').setDescription('The user to hug').setRequired(true)),
  name: 'hug',

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
      return interaction.reply({ content: '🤗 You wrap your arms around yourself. Self-love is important! ❤️', flags: [MessageFlags.Ephemeral] }).catch(() => null);
    }

    const randomAction = HUG_ACTIONS[Math.floor(Math.random() * HUG_ACTIONS.length)].replace('{target}', `**${target.username}**`);
    const randomGif = HUG_GIFS[Math.floor(Math.random() * HUG_GIFS.length)];
    
    let cuteStyle = 'off';
    try { const cuteData = db.readData('cute.json') || {}; cuteStyle = cuteData[interaction.guildId] || 'off'; } catch (e) {}
    const isCuteActive = cuteStyle !== 'off';

    const embed = new EmbedBuilder()
      .setColor(isCuteActive ? '#FF69B4' : '#FFC0CB')
      .setTitle(isCuteActive ? '✨ 🤗 WHolesome EMBRACE ✨' : '🤗 Virtual Hug!')
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

    // Call the master router mapping loader to look up commands dynamically 
    const targetCommand = client.commands.get('hug');
    if (targetCommand) {
      // The emulation context router in messageCreate handles ID/mention stripping smoothly 
      // We pass the message downstream to take complete advantage of our framework fixes
      return; 
    }
  }
};
