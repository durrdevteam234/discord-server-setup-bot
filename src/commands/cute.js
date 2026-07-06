const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const database = require('../utils/database'); // Updated to use your live MongoDB layout connection

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cute')
    .setDescription('Configure cute text layouts for server setup templates')
    .addStringOption(option =>
      option.setName('style')
        .setDescription('Select an aesthetic font layout style')
        .setRequired(true)
        .addChoices(
          { name: 'Wide (ａｅｓｔｈｅｔｉｃ)', value: 'wide' },
          { name: 'Small Caps (sᴍᴀʟʟ ᴄᴀᴘs)', value: 'small-caps' },
          { name: 'Bubbles (ⓑⓤⓑⓑⓛⓔⓢ)', value: 'bubbles' },
          { name: 'Turn Off (Normal Text)', value: 'off' }
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  name: 'cute',

  async execute(interaction) {
    const isInteraction = interaction.isCommand ? interaction.isCommand() : false;
    const memberExecutor = interaction.member;
    const guildId = interaction.guildId;

    if (!memberExecutor.permissions.has(PermissionFlagsBits.Administrator) && 
        !memberExecutor.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ 
        content: '❌ You need **Administrator** or **Manage Server** permissions to use this configuration!', 
        ephemeral: true 
      });
    }

    try {
      // Safely process choice values from both Slack option maps and custom prefix wrapper inputs
      const style = typeof interaction.options.getString === 'function' 
        ? interaction.options.getString('style') 
        : interaction.options.getString;

      if (!style) return;

      // ========================================================
      // NEW: ATOMIC MONGO-DB DOCUMENT UPDATING
      // ========================================================
      await database.findOneAndUpdate(
        { guildId: guildId },
        { $set: { cuteStyle: style } },
        { upsert: true }
      ).catch(() => null);

      const isOff = style === 'off';
      
      const styleNames = {
        'wide': 'Wide Text Layout (ａｅｓｔｈｅｔｉｃ)',
        'small-caps': 'Small Caps Layout (sᴍᴀʟʟ ᴄᴀᴘs)',
        'bubbles': 'Bubble Text Layout (ⓑⓤⓑⓑⓛⓔⓢ)',
        'smallcaps': 'Small Caps Layout (sᴍᴀʟʟ ᴄᴀᴘs)' // Safe mapping aliases for old layout settings
      };

      const embed = new EmbedBuilder()
        .setColor(isOff ? '#808080' : '#FF69B4')
        .setTitle(isOff ? '😢 Cute Mode Disabled' : '✨ Cute Mode Configured! ✨')
        .setDescription(isOff 
          ? 'Cute templates have been turned off. Setup layouts are back to standard Discord styles.' 
          : `Templates will now build using the **${styleNames[style] || style.toUpperCase()}** configuration! (´｀)`
        );

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Cute command configuration error:', error);
      await interaction.reply({ content: `❌ Config Error: ${error.message}`, ephemeral: true }).catch(() => null);
    }
  },

  // ADDED: Full support for text prefix routing configuration commands
  async executePrefix(message, argsArray, client) {
    const guild = message.guild;
    if (!guild) return;

    const member = message.member;
    if (!member.permissions.has(PermissionFlagsBits.Administrator) && !member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return message.reply('❌ You require Manager or Administrator permissions to change font profiles.').catch(() => null);
    }

    let inputArg = (argsArray && argsArray) ? argsArray.toLowerCase().trim() : null;
    if (inputArg === 'smallcaps') inputArg = 'small-caps'; // Resolves script variations smoothly

    const validInputs = ['wide', 'small-caps', 'bubbles', 'off'];
    if (!inputArg || !validInputs.includes(inputArg)) {
      return message.reply('❌ Usage: `|cute <wide|small-caps|bubbles|off>`').catch(() => null);
    }

    const mockInteraction = {
      guild: message.guild,
      guildId: message.guild.id,
      member: message.member,
      options: { getString: inputArg }, 
      reply: async (options) => message.reply(options)
    };

    await this.execute(mockInteraction).catch(err => console.error('Error handling inline cute font wrapper:', err));
  }
};
