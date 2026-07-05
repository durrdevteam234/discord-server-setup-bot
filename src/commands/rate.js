const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/database');

const RATING_COMMENTARY = {
  low: ["Honestly, this ain't it chief.", "Big yikes from me.", "Absolute bottom tier content."],
  mid: ["Not terrible, but could be a lot better.", "Perfectly balanced, as all things should be.", "Pretty average, nothing crazy."],
  high: ["Wow, an absolute masterpiece!", "This is phenomenal!", "10/10, certified legendary state!"]
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rate')
    .setDescription('Have the bot rate anything out of 10.')
    .addStringOption(opt => opt.setName('item').setDescription('What should I rate?').setRequired(true)),
  name: 'rate',
  async execute(interaction) {
    const settings = db.readData('settings.json') || {};
    if (interaction.guild && settings[interaction.guild.id]?.funModule !== 'on') {
      return interaction.reply({ content: '❌ The Fun Module is currently disabled on this server!', ephemeral: true });
    }
    const item = interaction.options.getString('item');
    const rating = Math.floor(Math.random() * 11);
    
    let commentaryPool = RATING_COMMENTARY.mid;
    if (rating <= 3) commentaryPool = RATING_COMMENTARY.low;
    if (rating >= 8) commentaryPool = RATING_COMMENTARY.high;
    const comment = commentaryPool[Math.floor(Math.random() * commentaryPool.length)];

    const embed = new EmbedBuilder()
      .setColor('#F1C40F')
      .setTitle('📊 Bot Rating System')
      .setDescription(`I rate **${item}** a solid **${rating}/10**!\n\n*"${comment}"*`);
    await interaction.reply({ embeds: [embed] });
  }
};