const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { readData, writeData } = require('../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leveling')
    .setDescription('Toggle the member leveling system on or off')
    .addBooleanOption(option =>
      option.setName('enabled')
        .setDescription('Enable or disable server experience gain')
        .setRequired(true)
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
      const enabled = interaction.options.getBoolean('enabled');
      const guildId = interaction.guildId;

      const settings = readData('settings.json');
      if (!settings[guildId]) settings[guildId] = {};
      
      settings[guildId].levelingEnabled = enabled;
      writeData('settings.json', settings);

      const embed = new EmbedBuilder()
        .setColor(enabled ? '#00FF00' : '#808080')
        .setTitle(enabled ? '📈 Leveling System Activated' : '⏸️ Leveling System Paused')
        .setDescription(enabled 
          ? 'Members will now earn XP and level up by chatting!' 
          : 'Text XP tracking has been paused for this server.'
        );

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      console.error('Leveling config error:', error);
      await interaction.reply({ content: `❌ Config Error: ${error.message}`, ephemeral: true });
    }
  },
};
