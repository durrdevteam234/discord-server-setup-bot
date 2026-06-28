const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { readData, writeData } = require('../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('welcome')
    .setDescription('Configure the welcome/goodbye system toggle and logs channel')
    .addBooleanOption(option =>
      option.setName('enabled')
        .setDescription('Turn the welcome/goodbye announcement system ON or OFF')
        .setRequired(true)
    )
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('The channel where welcome and goodbye embeds will be posted')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator) && 
        !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ 
        content: '❌ You need **Administrator** or **Manage Server** permissions to use this configuration!', 
        ephemeral: true 
      });
    }

    try {
      const enabled = interaction.options.getBoolean('enabled');
      const channel = interaction.options.getChannel('channel');
      const guildId = interaction.guildId;

      const settings = readData('settings.json') || {};
      if (!settings[guildId]) settings[guildId] = {};
      
      // Save settings flags securely
      settings[guildId].welcomeEnabled = enabled;
      if (channel) {
        settings[guildId].welcomeChannelId = channel.id;
      }
      
      writeData('settings.json', settings);

      // Get current channel configuration or fall back to saved settings text label
      const savedChannelId = settings[guildId].welcomeChannelId;
      const displayChannelText = channel ? channel : (savedChannelId ? `<#${savedChannelId}>` : '**Not Configured Yet**');

      const embed = new EmbedBuilder()
        .setColor(enabled ? '#00FF00' : '#808080')
        .setTitle(enabled ? '✨ Welcome System Activated' : '⏸️ Welcome System Paused')
        .setDescription(enabled 
          ? `Join/Leave clean embed cards are now active in: ${displayChannelText}`
          : 'Join/Leave welcome announcement cards are now paused.'
        );

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      console.error('Welcome command configuration error:', error);
      await interaction.reply({ content: `❌ Config Error: ${error.message}`, ephemeral: true });
    }
  },
};
