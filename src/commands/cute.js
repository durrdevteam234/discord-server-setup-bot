const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { readData, writeData } = require('../utils/database');

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
    // Limits visibility in Discord's UI to users who can manage the server or have admin access
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    // Permission validation gate for both Slash and Prefix command configurations
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator) && 
        !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ 
        content: '❌ You need **Administrator** or **Manage Server** permissions to use this configuration!', 
        ephemeral: true 
      });
    }

    try {
      const style = interaction.options.getString('style');
      const guildId = interaction.guildId;

      const cuteData = readData('cute.json');
      
      cuteData[guildId] = style; 
      writeData('cute.json', cuteData);

      const isOff = style === 'off';
      
      const styleNames = {
        'wide': 'Wide Text Layout (ａｅｓｔｈｅｔｉｃ)',
        'small-caps': 'Small Caps Layout (sᴍᴀʟʟ ᴄᴀᴘs)',
        'bubbles': 'Bubble Text Layout (ⓑⓤⓑⓑⓛⓔⓢ)'
      };

      const embed = new EmbedBuilder()
        .setColor(isOff ? '#808080' : '#FF69B4')
        .setTitle(isOff ? '😢 Cute Mode Disabled' : '✨ Cute Mode Configured! ✨')
        .setDescription(isOff 
          ? 'Cute templates have been turned off. Setup layouts are back to standard Discord styles.' 
          : `Templates will now build using the **${styleNames[style]}** configuration! (´｀)♡`
        );

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      console.error('Cute command configuration error:', error);
      await interaction.reply({ content: `❌ Config Error: ${error.message}`, ephemeral: true });
    }
  },
};
