const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { readData, writeData } = require('../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('welcome')
    .setDescription('Configure the join/leave welcome announcement logs channel')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('The channel where welcome and goodbye embeds will be posted')
        .setRequired(true)
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
      const channel = interaction.options.getChannel('channel');
      const guildId = interaction.guildId;

      const settings = readData('settings.json') || {};
      if (!settings[guildId]) settings[guildId] = {};
      
      // Save ONLY the channel ID
      settings[guildId].welcomeChannelId = channel.id;
      writeData('settings.json', settings);

      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('👋 Welcome System Configured')
        .setDescription(`Join and Leave embed banners will now be automatically logged in ${channel}!`);

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      console.error('Welcome command configuration error:', error);
      await interaction.reply({ content: `❌ Config Error: ${error.message}`, ephemeral: true });
    }
  },
};
