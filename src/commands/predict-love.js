const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/database');

const LOVE_COMMENTS = [
  "💔 A complete mismatch. Avoid at all costs!",
  "📉 Just friends territory. Better luck next time.",
  "😐 There is a tiny spark, but it needs a lot of work.",
  "✨ Promising vibes! The universe might be cooking something up.",
  "💖 A match made in heaven! Absolutely beautiful compatibility!"
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('predict-love')
    .setDescription('Calculate the ultimate romantic compatibility percentage.')
    .addStringOption(opt => opt.setName('first').setDescription('First item/person').setRequired(true))
    .addStringOption(opt => opt.setName('second').setDescription('Second item/person').setRequired(true)),
  name: 'predict-love',
  async execute(interaction) {
    const settings = db.readData('settings.json') || {};
    if (interaction.guild && settings[interaction.guild.id]?.funModule !== 'on') {
      return interaction.reply({ content: '❌ The Fun Module is currently disabled on this server!', ephemeral: true });
    }
    const a = interaction.options.getString('first');
    const b = interaction.options.getString('second');
    const percentage = Math.floor(Math.random() * 101);

    let comment = LOVE_COMMENTS[0];
    if (percentage > 20) comment = LOVE_COMMENTS[1];
    if (percentage > 50) comment = LOVE_COMMENTS[2];
    if (percentage > 75) comment = LOVE_COMMENTS[3];
    if (percentage > 90) comment = LOVE_COMMENTS[4];

    const embed = new EmbedBuilder()
      .setColor('#E91E63')
      .setTitle('❤️ Love Match Predictor')
      .setDescription(`💘 Compatibility match rating between **${a}** and **${b}** is **${percentage}%**!\n\n${comment}`);
    await interaction.reply({ embeds: [embed] });
  }
};