const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { logAction } = require('../utils/auditLog');
const { readData, writeData } = require('../utils/database');
const { formatCute } = require('../utils/textFormatter.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to warn')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for warning')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.reply({ content: '❌ You need Moderate Members permission!', ephemeral: true });
    }

    try {
      const user = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      const guildId = interaction.guildId;

      if (user.bot) {
        return interaction.reply({ content: '❌ You cannot issue an infraction warning to a bot application.', ephemeral: true });
      }

      // Add warning to database registry
      const warnings = readData('warnings.json');
      if (!warnings[guildId]) warnings[guildId] = {};
      if (!warnings[guildId][user.id]) warnings[guildId][user.id] = [];

      warnings[guildId][user.id].push({
        reason,
        date: new Date().toISOString(),
        moderator: interaction.user.tag,
      });

      writeData('warnings.json', warnings);

      const warningCount = warnings[guildId][user.id].length;

      // Check for cute mode styled channel name variants
      const cuteData = readData('cute.json');
      const cuteStyle = cuteData[guildId] || 'off';
      const cuteChannelName = cuteStyle !== 'off' ? formatCute('mod-logs', cuteStyle, '🛡️') : 'mod-logs';

      // Log to mod-logs channel layout target
      const modLogsChannel = interaction.guild.channels.cache.find(ch => ch.name === 'mod-logs' || ch.name === cuteChannelName);
      if (modLogsChannel) {
        const embed = new EmbedBuilder()
          .setColor('#FF6600')
          .setTitle('User Warned')
          .addFields(
            { name: 'User', value: `${user.tag} (${user.id})` },
            { name: 'Moderator', value: `${interaction.user.tag}` },
            { name: 'Reason', value: reason },
            { name: 'Warning Count', value: warningCount.toString() }
          );
        await modLogsChannel.send({ embeds: [embed] });
      }

      // Log action internally via logging engine
      await logAction(interaction.guild, 'User Warned', interaction.user, `User: ${user.tag}, Reason: ${reason}, Count: ${warningCount}`);

      const embed = new EmbedBuilder()
        .setColor('#FF6600')
        .setTitle('✅ User Warned')
        .setDescription(`${user.tag} has been warned.\nReason: ${reason}\nTotal Warnings: ${warningCount}`);

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      console.error('Warn error:', error);
      await interaction.reply({ content: `❌ Error warning user: ${error.message}`, ephemeral: true });
    }
  },
};
