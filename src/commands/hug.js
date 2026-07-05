const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/database');

const HUG_ACTIONS = [
  "wrapped their arms tightly around {target} for a massive, warm bear hug!",
  "gives {target} a comforting squeeze. Everything is going to be okay!",
  "tackles {target} with an unexpected, joyful surprise hug!",
  "gives {target} a polite but deeply genuine virtual embrace.",
  "runs over and engulfs {target} in a cozy, warm blanket-style hug!"
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hug')
    .setDescription('Give a member a warm, fuzzy virtual hug.')
    .addUserOption(option => option.setName('user').setDescription('The user to hug').setRequired(true)),
  name: 'hug',
  async execute(interaction) {
    const settings = db.readData('settings.json') || {};
    if (interaction.guild && settings[interaction.guild.id]?.funModule !== 'on') {
      return interaction.reply({ content: '❌ The Fun Module is currently disabled on this server!', ephemeral: true });
    }
    const target = interaction.options.getUser('user');
    const caller = interaction.user;
    
    const action = HUG_ACTIONS[Math.floor(Math.random() * HUG_ACTIONS.length)].replace('{target}', `**${target.username}**`);
    const embed = new EmbedBuilder()
      .setColor('#FFC0CB')
      .setDescription(`🤗 **${caller.username}** ${action}`);
    await interaction.reply({ embeds: [embed] });
  }
};