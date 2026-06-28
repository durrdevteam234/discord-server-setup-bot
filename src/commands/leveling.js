const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const { readData, writeData } = require('../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leveling')
    .setDescription('Toggle the leveling system and configure the announcement channel')
    .addBooleanOption(option =>
      option.setName('enabled')
        .setDescription('Enable or disable server experience gain')
        .setRequired(true)
    )
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Channel where level-up messages are sent (leave blank to default to active chat)')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    // Permission validation gate
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator) && 
        !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ 
        content: '❌ You need **Administrator** or **Manage Server** permissions to use this configuration!', 
        ephemeral: true 
      });
    }

    try {
      const enabled = interaction.options.getBoolean('enabled');
      const announcementChannel = interaction.options.getChannel('channel');
      const guildId = interaction.guildId;

      const settings = readData('settings.json');
      if (!settings[guildId]) settings[guildId] = {};
      
      // Save settings parameters
      settings[guildId].levelingEnabled = enabled;
      settings[guildId].levelUpChannelId = announcementChannel ? announcementChannel.id : null;
      
      writeData('settings.json', settings);

      const embed = new EmbedBuilder()
        .setColor(enabled ? '#00FF00' : '#808080')
        .setTitle(enabled ? '📈 Leveling System Activated' : '⏸️ Leveling System Paused')
        .setDescription(enabled 
          ? `Members will earn XP! Level-up alerts: ${announcementChannel ? announcementChannel : '**Current Active Chat**'}`
          : 'Text XP tracking has been paused for this server.'
        );

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      console.error('Leveling config error:', error);
      await interaction.reply({ content: `❌ Config Error: ${error.message}`, ephemeral: true });
    }
  },
};
