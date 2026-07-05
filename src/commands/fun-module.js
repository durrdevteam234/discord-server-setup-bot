const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('fun-module')
    .setDescription('Enable or disable the fun commands module.')
    .addStringOption(option =>
      option.setName('status')
        .setDescription('Choose to enable or disable fun commands')
        .setRequired(true)
        .addChoices(
          { name: 'Enable', value: 'on' },
          { name: 'Disable', value: 'off' }
        )),
  name: 'fun-module',

  async execute(interaction) {
    const guild = interaction.guild;
    if (!guild) return;

    // Permissions gate check
    const member = interaction.member;
    if (!member.permissions.has(PermissionFlagsBits.Administrator) && !member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ content: '❌ You require Manager or Administrator permissions to toggle modules.', ephemeral: true });
    }

    const choice = interaction.options.getString('status');
    const settings = db.readData('settings.json') || {};
    
    if (!settings[guild.id]) settings[guild.id] = {};
    settings[guild.id].funModule = choice; // Saves cleanly as 'on' or 'off'
    
    db.writeData('settings.json', settings);

    const embed = new EmbedBuilder()
      .setColor(choice === 'on' ? '#00FF00' : '#FF0000')
      .setTitle('🎛️ Module Configuration Saved')
      .setDescription(`The **Fun Module** features have been flipped **${choice.toUpperCase()}** for this guild.`);

    await interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message, args, client) {
    const choice = args[0] ? args[0].toLowerCase() : null;
    if (choice !== 'on' && choice !== 'off') {
      return message.reply('❌ Usage: `|fun-module <on|off>`').catch(() => null);
    }

    const mockInteraction = {
      guild: message.guild,
      member: message.member,
      options: { getString: () => choice },
      reply: async (options) => message.reply(options)
    };
    await this.execute(mockInteraction);
  }
};