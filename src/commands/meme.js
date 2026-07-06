const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../utils/database');

const MEMES = [
  { title: "When you check your phone at 2 AM and the screen brightness completely melts your eyes", url: "https://tenor.com" },
  { title: "Me explaining a funny story to my friends vs how it actually happened in real life", url: "https://tenor.com" },
  { title: "When you walk into a room with maximum confidence but completely forget why you went in there", url: "https://tenor.com" },
  { title: "That one friend who says 'I am 5 minutes away' but is still fast asleep in bed", url: "https://tenor.com" },
  { title: "Me calculating exactly how much sleep I will get if I fall asleep right this split-second", url: "https://tenor.com" },
  { title: "When you close an app on your phone because you are bored, only to immediately reopen it", url: "https://tenor.com" },
  { title: "When you wave back at someone in public only to realize they were waving at the person behind you", url: "https://tenor.com" },
  { title: "Watching your food rotate in the microwave like it is a top-tier cinematic feature film", url: "https://tenor.com" },
  { title: "When you accidentally push a commercial door that explicitly has a giant 'PULL' sign on it", url: "https://tenor.com" },
  { title: "The absolute heart-stopping panic when you reach into your pocket and don't feel your phone", url: "https://tenor.com" },
  { title: "Me looking at my total bank account balance after saying 'treat yourself' just one minor time", url: "https://tenor.com" },
  { title: "The exact facial expression you make when the waiter is bringing your food over to the table", url: "https://tenor.com" },
  { title: "When you hear your own voice on an audio recording and wonder how anyone stands talking to you", url: "https://tenor.com" },
  { title: "Me laughing at a random joke three hours later when I finally understand what it meant", url: "https://tenor.com" },
  { title: "When you finish an exam and have absolutely zero idea if you got a 100% score or a 0% score", url: "https://tenor.com" }
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('meme')
    .setDescription('Spits out a random funny, relatable lifestyle meme.'),
  name: 'meme',

  async execute(interaction) {
    const settings = db.readData('settings.json') || {};
    const currentGuildSettings = settings[interaction.guildId] || {};

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
      .setFooter({ text: 'Everyday Life Relatable Content' });
      
    await interaction.reply({ 
      content: selected.url,
      embeds: [embed] 
    }).catch(() => null);
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
      .setFooter({ text: 'Everyday Life Relatable Content' });
      
    return message.reply({ 
      content: selected.url,
      embeds: [embed] 
    }).catch(() => null);
  }
};
