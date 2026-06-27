const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { readData, writeData } = require('../utils/database');
const { formatCute } = require('../utils/textFormatter.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('welcome')
    .setDescription('Configure welcome and leave system settings')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub =>
      sub.setName('setup')
        .setDescription('Set up channels and messages')
        .addChannelOption(opt => 
          opt.setName('channel')
            .setDescription('The channel for welcome/leave logs')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText) // 🛡️ Fix: Restrict to Text Channels only
        )
        .addStringOption(opt => opt.setName('welcome_text').setDescription('Use {user} and {server} in text').setRequired(false))
        .addStringOption(opt => opt.setName('leave_text').setDescription('Use {user} and {server} in text').setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('toggle')
        .setDescription('Turn the system on or off')
        .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable or disable system').setRequired(true))
    ),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator) && 
        !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ 
        content: '❌ You need **Administrator** or **Manage Server** permissions to use the welcome configuration!', 
        ephemeral: true 
      });
    }

    try {
      const subcommand = interaction.options.getSubcommand();
      const guildId = interaction.guildId;
      const settings = readData('settings.json');
      if (!settings[guildId]) settings[guildId] = {};

      if (subcommand === 'setup') {
        let channel = interaction.options.getChannel('channel');
        const welcomeText = interaction.options.getString('welcome_text') || 'Welcome {user} to {server}! 🎉';
        const leaveText = interaction.options.getString('leave_text') || '{user} has left the server. 😢';

        const cuteData = readData('cute.json');
        const cuteStyle = cuteData[guildId] || 'off';

        if (cuteStyle !== 'off') {
          try {
            const cleanName = channel.name.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase() || 'welcome';
            const cuteChannelName = formatCute(cleanName, cuteStyle, '👋');
            await channel.setName(cuteChannelName);
          } catch (err) {
            console.error('Could not rename channel to cute text style:', err);
          }
        }

        // 🔄 Fix: Standardized to welcomeChannelId to match setup.js and events folder
        settings[guildId].welcomeChannelId = channel.id; 
        settings[guildId].welcomeText = welcomeText;
        settings[guildId].leaveText = leaveText;
        if (settings[guildId].welcomeEnabled === undefined) settings[guildId].welcomeEnabled = true;

        writeData('settings.json', settings);

        const titleText = cuteStyle !== 'off' ? formatCute('Welcome System Configured', cuteStyle, '⚙️') : '⚙️ Welcome System Configured';

        const embed = new EmbedBuilder()
          .setColor('#FF69B4')
          .setTitle(titleText)
          .addFields(
            { name: 'Log Channel', value: `<#${channel.id}>`, inline: true },
            { name: 'Status', value: settings[guildId].welcomeEnabled ? '🟢 Enabled' : '🔴 Disabled', inline: true },
            { name: 'Welcome Message', value: welcomeText },
            { name: 'Leave Message', value: leaveText }
          );

        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      if (subcommand === 'toggle') {
        const enabled = interaction.options.getBoolean('enabled');
        settings[guildId].welcomeEnabled = enabled;
        writeData('settings.json', settings);

        return interaction.reply({
          content: `✅ Welcome and Leave logs have been ${enabled ? '**enabled** 🟢' : '**disabled** 🔴'}.`,
          ephemeral: true
        });
      }
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: `❌ Error: ${error.message}`, ephemeral: true });
    }
  }
};
