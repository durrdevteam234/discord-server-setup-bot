const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../utils/database');

const MEMES = [
  { title: "When you wake up checking your phone and the brightness melts your eyes", url: "https://unsplash.com" },
  { title: "Me explaining a story to my friends vs how it actually happened", url: "https://unsplash.com" },
  { title: "When you walk into a room and completely forget why you went in there", url: "https://unsplash.com" },
  { title: "That one friend who says 'I am 5 minutes away' but is still in bed", url: "https://unsplash.com" },
  { title: "When you hear your own voice on a video recording", url: "https://unsplash.com" },
  { title: "Me calculating exactly how much sleep I will get if I fall asleep right now", url: "https://unsplash.com" },
  { title: "When you wave back at someone who was actually waving to the person behind you", url: "https://unsplash.com" },
  { title: "When you close an app because you are bored, only to immediately reopen the exact same app", url: "https://unsplash.com" },
  { title: "Trying to look casual when you walk past a mirror in public", url: "https://unsplash.com" },
  { title: "When you order something online and track it every 5 minutes like it's a dynamic race", url: "https://unsplash.com" },
  { title: "Me looking at my bank account after saying 'treat yourself' just one time", url: "https://unsplash.com" },
  { title: "The exact facial expression you make when the waiter is bringing your food to the table", url: "https://unsplash.com" },
  { title: "When someone says 'let's do a quick icebreaker' at the start of a meeting", url: "https://unsplash.com" },
  { title: "Me laughing at a joke three hours later when I finally understand what it actually meant", url: "https://unsplash.com" },
  { title: "When you finish a master exam and have absolutely zero idea if you got a 100% or a 0%", url: "https://unsplash.com" },
  { title: "Watching your food rotate in the microwave like it's a top-tier cinematic feature film", url: "https://unsplash.com" },
  { title: "When you accidentally drop your ice cream scoop but try to catch it with your shoe mid-air", url: "https://unsplash.com" },
  { title: "When you push a door that explicitly says 'PULL' with maximum confidence", url: "https://unsplash.com" },
  { title: "The absolute panic when you reach into your pocket and don't feel your phone", url: "https://unsplash.com" },
  { title: "Me checking the fridge for the fourth time in an hour hoping new groceries magically spawned", url: "https://unsplash.com" }
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
      .setImage(selected.url)
      .setFooter({ text: 'Everyday Life Relatable Content' });
      
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
      .setFooter({ text: 'Everyday Life Relatable Content' });
      
    await message.reply({ embeds: [embed] }).catch(() => null);
  }
};
