const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/database');

const ROASTS = [
  "Your secrets are safe with me. I never even listened in the first place.",
  "I'm not saying I hate you, but I would unplug your life support to charge my phone.",
  "Light travels faster than sound. This is why some people appear bright until they speak.",
  "You bring everyone so much joy... when you leave the room.",
  "I'd agree with you, but then we'd both be wrong.",
  "If I had a face like yours, I'd sue my parents.",
  "Your Wi-Fi signal is stronger than your life choices.",
  "You are proof that evolution can go in reverse."
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roast')
    .setDescription('Deliver a savage, good-natured roast to a user.')
    .addUserOption(option => option.setName('user').setDescription('The user to roast').setRequired(true)),
  name: 'roast',
  async execute(interaction) {
    const settings = db.readData('settings.json') || {};
    if (interaction.guild && settings[interaction.guild.id]?.funModule !== 'on') {
      return interaction.reply({ content: '❌ The Fun Module is currently disabled on this server!', ephemeral: true });
    }
    const target = interaction.options.getUser('user');
    const roast = ROASTS[Math.floor(Math.random() * ROASTS.length)];

    const embed = new EmbedBuilder()
      .setColor('#D35400')
      .setTitle('🔥 Roasted!')
      .setDescription(`**${target.username}**, ${roast}`);
    await interaction.reply({ embeds: [embed] });
  }
};