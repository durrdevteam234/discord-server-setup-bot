const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { logAction } = require('../utils/auditLog');
const database = require('../utils/database'); // Updated to use your live MongoDB layout connection

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
    const guild = interaction.guild;
    const author = interaction.user; 
    const memberExecutor = interaction.member;
    const guildId = interaction.guildId;

    if (!memberExecutor.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      const msg = '❌ You need Moderate Members permission!';
      return isInteraction ? interaction.reply({ content: msg, ephemeral: true }) : interaction.reply(msg);
    }

    try {
      let user;
      let durationInput;
      let reason;

      if (isInteraction) {
        user = interaction.options.getUser('user');
        durationInput = interaction.options.getString('duration');
        reason = interaction.options.getString('reason') || 'No reason provided';
      } else {
        user = interaction.options.getUser('user');
        durationInput = interaction.options.getString('duration');
        reason = interaction.options.getString('reason') || 'No reason provided';
      }

      if (!user) {
        const msg = '❌ Please mention a valid user or provide a valid user ID.';
        return interaction.reply({ content: msg, ephemeral: true }).catch(() => null);
      }

      const member = await guild.members.fetch({ user: user.id, force: true }).catch(() => null);
      if (!member) {
        const msg = '❌ This user is not in the server! You cannot mute someone who is not here.';
        return isInteraction ? interaction.reply({ content: msg, ephemeral: true }) : interaction.reply(msg);
      }

      if (!durationInput) {
        const msg = '❌ Please specify a duration. Example: `30m`, `4h`, `5d`, `2w`';
        return isInteraction ? interaction.reply({ content: msg, ephemeral: true }) : interaction.reply(msg);
      }

      const durationRegex = /^(\d+)([mhdw])$/i;
      const match = durationInput.match(durationRegex);

      if (!match) {
        const msg = '❌ Invalid format! Use numbers followed by unit: `m` (minutes), `h` (hours), `d` (days), `w` (weeks).';
        return isInteraction ? interaction.reply({ content: msg, ephemeral: true }) : interaction.reply(msg);
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
        return isInteraction ? interaction.reply({ content: msg, ephemeral: true }) : interaction.reply(msg);
      }

      if (!member.moderatable) {
        const msg = '❌ I cannot mute this user! Their roles might be higher than mine or yours.';
        return isInteraction ? interaction.reply({ content: msg, ephemeral: true }) : interaction.reply(msg);
      }

      await member.timeout(durationMs, reason);

      // ========================================================
      // NEW: MONGO-DB TIMEOUT BACKEND INFRASTRUCTURE WRITING
      // ========================================================
      const muteExpiryTime = Date.now() + durationMs;
      await database.findOneAndUpdate(
        { guildId: guildId },
        { 
          $set: { 
            [`activeMutes.${user.id}`]: { muteEnd: muteExpiryTime, reason: reason }
          } 
        },
        { upsert: true }
      ).catch(() => null);

      // ========================================================
      // MONGO-DB UNIFIED MOD LOGS SYSTEM RESOLUTION
      // ========================================================
      const guildConfig = await database.findOne({ guildId: guildId }).catch(() => null) || {};
      
      if (guildConfig.modLogsEnabled && guildConfig.unifiedLogChannelId) {
        const modLogsChannel = guild.channels.cache.get(guildConfig.unifiedLogChannelId) || await guild.channels.fetch(guildConfig.unifiedLogChannelId).catch(() => null);
        
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

      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Mute error:', error);
      const msg = `❌ Error muting user: ${error.message}`;
      return interaction.reply({ content: msg, ephemeral: true }).catch(() => null);
    }
  },
};
