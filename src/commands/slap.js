const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/database');

const SLAP_ACTIONS = [
  "slapped {target} across the face with a giant, smelly yellow trout!",
  "clobbered {target} with a squeaky squeegee toy mallet!",
  "slapped the keyboard right out from under {target}'s hands!",
  "hit {target} with a legendary, ultra-powerful backhand slap!",
  "challenges {target} to reality with a sudden wake-up slap!"
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slap')
    .setDescription('Slap another user with a hilarious item.')
    .addUserOption(option => option.setName('user').setDescription('The user to slap').setRequired(true)),
  name: 'slap',
  async execute(interaction) {
    const settings = db.readData('settings.json') || {};
    if (interaction.guild && settings[interaction.guild.id]?.funModule !== 'on') {
      return interaction.reply({ content: '❌ The Fun Module is currently disabled on this server!', ephemeral: true });
    }
    const target = interaction.options.getUser('user');
    const caller = interaction.user;

    const action = SLAP_ACTIONS[Math.floor(Math.random() * SLAP_ACTIONS.length)].replace('{target}', `**${target.username}**`);
    const embed = new EmbedBuilder()
      .setColor('#E74C3C')
      .setDescription(`💥 **${caller.username}** ${action}`);
    await interaction.reply({ embeds: [embed] });
  }
};