const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { logAction } = require('../utils/auditLog');
const { readData, writeData } = require('../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Mute a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to mute')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('duration')
        .setDescription('Mute duration')
        .setRequired(true)
        .addChoices(
          { name: '1 minute', value: '1m' },
          { name: '5 minutes', value: '5m' },
          { name: '10 minutes', value: '10m' },
          { name: '1 hour', value: '1h' },
          { name: '1 day', value: '1d' }
        )
    )
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for mute')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.reply({ content: '❌ You need Moderate Members permission!', ephemeral: true });
    }

    try {
      const user = interaction.options.getUser('user');
      const duration = interaction.options.getString('duration');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      const member = await interaction.guild.members.fetch(user.id);

      // Calculate mute duration
      const durationMs = {
        '1m': 60000,
        '5m': 300000,
        '10m': 600000,
        '1h': 3600000,
        '1d': 86400000,
      }[duration];

      // Mute user
      await member.timeout(durationMs, reason);

      // Save mute data
      const mutes = readData('mutes.json');
      if (!mutes[interaction.guildId]) mutes[interaction.guildId] = {};
      mutes[interaction.guildId][user.id] = {
        muteEnd: Date.now() + durationMs,
        reason,
      };
      writeData('mutes.json', mutes);

      // Log to mod-logs
      const modLogsChannel = interaction.guild.channels.cache.find(ch => ch.name === 'mod-logs');
      if (modLogsChannel) {
        const embed = new EmbedBuilder()
          .setColor('#FFFF00')
          .setTitle('User Muted')
          .addFields(
            { name: 'User', value: `${user.tag} (${user.id})` },
            { name: 'Moderator', value: `${interaction.user.tag}` },
            { name: 'Duration', value: duration },
            { name: 'Reason', value: reason }
          );
        await modLogsChannel.send({ embeds: [embed] });
      }

      // Log action
      await logAction(interaction.guild, 'User Muted', interaction.user, `User: ${user.tag}, Duration: ${duration}, Reason: ${reason}`);

      const embed = new EmbedBuilder()
        .setColor('#FFFF00')
        .setTitle('✅ User Muted')
        .setDescription(`${user.tag} has been muted for ${duration}.\nReason: ${reason}`);

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      console.error('Mute error:', error);
      await interaction.reply({ content: `❌ Error muting user: ${error.message}`, ephemeral: true });
    }
  },
};
