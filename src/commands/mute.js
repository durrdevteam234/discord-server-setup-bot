const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { logAction } = require('../utils/auditLog');
const db = require('../utils/database'); // Restored your internal adapter mapping

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Mute a user for a custom duration (1m to 28d)')
    .addUserOption(option => option.setName('user').setDescription('User to mute').setRequired(true))
    .addStringOption(option =>
      option.setName('duration')
        .setDescription('Mute duration (e.g., 30m, 2h, 7d, 3w)')
        .setRequired(true)
    )
    .addStringOption(option => option.setName('reason').setDescription('Reason for mute').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  name: 'mute',

  async execute(interaction, client) {
    const isInteraction = interaction.isCommand ? interaction.isCommand() : false;

    if (isInteraction) {
      await interaction.deferReply().catch(() => null);
    } else {
      await interaction.reply('⏳ Processing mute transaction...').catch(() => null);
    }

    const guild = interaction.guild;
    const author = interaction.user; 
    const memberExecutor = interaction.member;
    const guildId = interaction.guildId;

    if (!memberExecutor.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      const msg = '❌ You need Moderate Members permission!';
      return isInteraction ? interaction.editReply({ content: msg }) : interaction.reply(msg);
    }

    try {
      const user = interaction.options.getUser('user');
      const durationInput = interaction.options.getString('duration');
      const reason = interaction.options.getString('reason') || 'No reason provided';

      if (!user) {
        const msg = '❌ Please mention a valid user or provide a valid user ID.';
        return isInteraction ? interaction.editReply({ content: msg }) : interaction.reply(msg);
      }

      const member = await guild.members.fetch({ user: user.id, force: true }).catch(() => null);
      if (!member) {
        const msg = '❌ This user is not in the server! You cannot mute someone who is not here.';
        return isInteraction ? interaction.editReply({ content: msg }) : interaction.reply(msg);
      }

      if (!durationInput) {
        const msg = '❌ Please specify a duration. Example: `30m`, `4h`, `5d`, `2w`';
        return isInteraction ? interaction.editReply({ content: msg }) : interaction.reply(msg);
      }

      const durationRegex = /^(\d+)([mhdw])$/i;
      const match = durationInput.match(durationRegex);

      if (!match) {
        const msg = '❌ Invalid format! Use numbers followed by unit: `m` (minutes), `h` (hours), `d` (days), `w` (weeks).';
        return isInteraction ? interaction.editReply({ content: msg }) : interaction.reply(msg);
      }

      const amount = parseInt(match[1], 10);
      const unit = match[2].toLowerCase();

      let durationMs = 0;
      if (unit === 'm') durationMs = amount * 60 * 1000;
      if (unit === 'h') durationMs = amount * 60 * 60 * 1000;
      if (unit === 'd') durationMs = amount * 24 * 60 * 60 * 1000;
      if (unit === 'w') durationMs = amount * 7 * 24 * 60 * 60 * 1000;

      const MIN_MS = 60 * 1000;
      const MAX_MS = 28 * 24 * 60 * 60 * 1000;

      if (durationMs < MIN_MS || durationMs > MAX_MS) {
        const msg = '❌ Duration must be between **1 minute (1m)** and **28 days (28d)**!';
        return isInteraction ? interaction.editReply({ content: msg }) : interaction.reply(msg);
      }

      if (!member.moderatable) {
        const msg = '❌ I cannot mute this user! Their roles might be higher than mine or yours.';
        return isInteraction ? interaction.editReply({ content: msg }) : interaction.reply(msg);
      }

      await member.timeout(durationMs, reason);

      // 🌟 ADAPTER RESOLUTION: Safe write data processing back to collection schemas
      const mutes = (await db.readData('mutes.json')) || {};
      if (!mutes[guildId]) mutes[guildId] = {};
      mutes[guildId][user.id] = { muteEnd: Date.now() + durationMs, reason };
      await db.writeData('mutes.json', mutes);

      const settings = (await db.readData('settings.json')) || {};
      const currentGuildSettings = settings[guildId] || {};
      
      if (currentGuildSettings.modLogsEnabled && currentGuildSettings.unifiedLogChannelId) {
        const modLogsChannel = guild.channels.cache.get(currentGuildSettings.unifiedLogChannelId) || await guild.channels.fetch(currentGuildSettings.unifiedLogChannelId).catch(() => null);
        
        if (modLogsChannel) {
          const embedLog = new EmbedBuilder()
            .setColor('#FFFF00')
            .setTitle('🛡️ Unified Moderation: User Muted')
            .addFields(
              { name: 'Target User', value: `${user.username} (${user.id})`, inline: true },
              { name: 'Responsible Staff', value: `${author.username}`, inline: true },
              { name: 'Mute Duration', value: durationInput.toLowerCase(), inline: true },
              { name: 'Reason Given', value: reason }
            )
            .setTimestamp();
          await modLogsChannel.send({ embeds: [embedLog] }).catch(() => null);
        }
      }

      await logAction(guild, 'User Muted', author, `User: ${user.username}, Duration: ${durationInput}, Reason: ${reason}`);

      const embed = new EmbedBuilder()
        .setColor('#FFFF00')
        .setTitle('✅ User Muted')
        .setDescription(`${user.username} has been muted for ${durationInput.toLowerCase()}.\nReason: ${reason}`);

      return isInteraction ? interaction.editReply({ embeds: [embed] }) : interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Mute error:', error);
      const msg = `❌ Error muting user: ${error.message}`;
      return isInteraction ? interaction.editReply({ content: msg }) : interaction.reply(msg);
    }
  },
};
