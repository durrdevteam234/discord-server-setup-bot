const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
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
          { name: 'enable', value: 'on' },
          { name: 'disable', value: 'off' }
        )),
  name: 'fun-module',

  async execute(interaction) {
    const guild = interaction.guild;
    const guildId = interaction.guildId || guild?.id;
    if (!guildId) return;

    // 1. Unified Permission Checking Layer
    const member = interaction.member;
    if (!member.permissions.has(PermissionFlagsBits.Administrator) && !member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ 
        content: '❌ You require Manager or Administrator permissions to toggle modules.', 
        flags: [MessageFlags.Ephemeral] 
      }).catch(() => null);
    }

    // 2. Fetch Option Value safely
    const rawChoice = interaction.options.getString('status');
    if (!rawChoice) return;

    // Normalize option matching format to match the internal configuration string
    const choice = (rawChoice === 'enable' || rawChoice === 'on') ? 'on' : 'off';
    
    // 3. Database Write operations
    const settings = db.readData('settings.json') || {};
    if (!settings[guildId]) settings[guildId] = {};
    
    // Saves state as a predictable boolean value matching messageCreate framework filters
    settings[guildId].funModule = (choice === 'on'); 
    db.writeData('settings.json', settings);

    // 4. Create UI response Embed
    const embed = new EmbedBuilder()
      .setColor(choice === 'on' ? '#00FF00' : '#FF0000')
      .setTitle('🎛️ Module Configuration Saved')
      .setDescription(`The **Fun Module** features have been flipped **${choice === 'on' ? 'ENABLED' : 'DISABLED'}** server-wide.`);

    await interaction.reply({ embeds: [embed] }).catch(() => null);
  },

  async executePrefix(message, argsArray, client) {
    const guild = message.guild;
    if (!guild) return;

    // 1. Prefix Administrative Permission Gate
    const member = message.member;
    if (!member.permissions.has(PermissionFlagsBits.Administrator) && !member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return message.reply('❌ You require Manager or Administrator permissions to toggle modules.').catch(() => null);
    }

    // 2. Normalize and check raw user text input out of the passed arguments array safely
    const inputArg = (argsArray && argsArray[0]) ? argsArray[0].toLowerCase().trim() : null;
    const validInputs = ['enable', 'disable', 'on', 'off'];

    if (!inputArg || !validInputs.includes(inputArg)) {
      return message.reply('❌ Usage: `|fun-module <enable|disable>` or `|fun-module <on|off>`').catch(() => null);
    }

    // 3. Match format syntax directly with Slash layout structures
    const slashValueCompatible = (inputArg === 'enable' || inputArg === 'on') ? 'enable' : 'disable';

    // 4. Emulate balanced context block properties including the required guild ID field mapping
    const mockInteraction = {
      guild: message.guild,
      guildId: message.guild.id,
      member: message.member,
      options: { getString: (name) => slashValueCompatible },
      reply: async (options) => message.reply(options)
    };

    await this.execute(mockInteraction).catch(err => console.error('Error handling inline fun-module prefix wrapper:', err));
  }
};
