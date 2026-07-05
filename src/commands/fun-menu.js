const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/database'); // Resolves file access pathway
const formatter = require('../utils/textFormatter.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('fun-menu')
    .setDescription('Explore what the Fun Module offers.'),
  name: 'fun-menu',

  async execute(interaction) {
    const guildId = interaction.guild?.id;
    let cuteStyle = 'off';

    // Fixed the crash by using your database framework readData method instead of .get()
    if (guildId) {
      try {
        const cuteData = db.readData('cute.json') || {};
        cuteStyle = cuteData[guildId] || 'off';
      } catch (e) {
        console.error("Error reading cute data in fun-menu:", e);
      }
    }

    const titleText = formatter.formatCute('Fun Module Menu', cuteStyle, '✨');
    const embedColor = cuteStyle !== 'off' ? '#FF69B4' : '#00FF00';

    const embed = new EmbedBuilder()
      .setColor(embedColor)
      .setTitle(titleText)
      .setDescription('Welcome to the **Fun & Entertainment Hub**! Engage your server members with interactive mini-games and visual prompts.')
      .addFields(
        { name: '🎮 Games', value: '`/dice-duel`, `/trivia`, `/capital-quiz`, `/wouldyourather`', inline: false },
        { name: '🎭 Text & Whimsy', value: '`/joke`, `/fortune`, `/spacefact`', inline: false },
        { name: '🐱 Media Animals', value: '`/cat`, `/dog`', inline: false },
        { name: '💖 Social Actions', value: '`/hug`, `/slap`, `/predict-love`', inline: false }
      )
      .setFooter({ text: `Style Profile: ${cuteStyle.toUpperCase()}` });

    await interaction.reply({ embeds: [embed] }).catch(() => null);
  },

  async executePrefix(message, args, client) {
    const mockInteraction = {
      guild: message.guild,
      reply: async (options) => message.reply(options)
    };
    await this.execute(mockInteraction);
  }
};