const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../utils/database');

const RATING_COMMENTARY = {
  low: ["Honestly, this ain't it chief. 📉", "Big yikes from me. 💀", "Absolute bottom tier content. 🗑️"],
  mid: ["Not terrible, but could be a lot better. 😐", "Perfectly balanced, as all things should be. ⚖️", "Pretty average, nothing crazy. 🎟️"],
  high: ["Wow, an absolute masterpiece! 🌟", "This is phenomenal! 🔥", "10/10, certified legendary state! 👑"]
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rate')
    .setDescription('Have the bot rate anything out of 10.')
    .addStringOption(opt => opt.setName('item').setDescription('What should I rate?').setRequired(true)),
  name: 'rate',

  async execute(interaction) {
    
    const item = interaction.options.getString('item');
    if (!item) {
      return interaction.reply({ content: '❌ You must specify an item to rate!', flags: [MessageFlags.Ephemeral] }).catch(() => null);
    }

    const rating = Math.floor(Math.random() * 11);
    
    let commentaryPool = RATING_COMMENTARY.mid;
    if (rating <= 3) commentaryPool = RATING_COMMENTARY.low;
    if (rating >= 8) commentaryPool = RATING_COMMENTARY.high;
    const comment = commentaryPool[Math.floor(Math.random() * commentaryPool.length)];

    let cuteStyle = 'off';
    try { cuteStyle = await db.getCuteStyle(interaction.guildId); } catch (e) {}
    const isCuteActive = cuteStyle !== 'off';

    const embed = new EmbedBuilder()
      .setColor(isCuteActive ? '#FF69B4' : '#F1C40F')
      .setTitle(isCuteActive ? '✨ 📊 BOT RATING SYSTEM ✨' : '📊 Bot Rating System')
      .setDescription(`I rate **${item}** a solid **${rating}/10**!\n\n*"${comment}"*`)
      .setFooter({ text: 'Opinions are computer-generated and definitive.' });
      
    await interaction.reply({ embeds: [embed] }).catch(() => null);
  },

  
};
