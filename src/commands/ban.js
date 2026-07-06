const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { logAction } = require('../utils/auditLog');
const database = require('../utils/database'); // Updated to use your live MongoDB layout connection
const { formatCute } = require('../utils/textFormatter.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a user from the server')
    .addUserOption(option => option.setName('user').setDescription('User to ban').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for ban').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  name: 'ban',

  async execute(interaction, client) {
    // Structural compatibility verification layer for hybrid interaction tracking 
    const isInteraction = interaction.isCommand ? interaction.isCommand() : false;
    const guild = interaction.guild;
    const author = isInteraction ? interaction.user : interaction.user; // interaction emulator maps message author to user field
    const memberExecutor = interaction.member;
    const guildId = interaction.guildId;

    if (!memberExecutor.permissions.has(PermissionFlagsBits.BanMembers)) {
      const msg = '❌ You need Ban Members permission!';
      return isInteraction ? interaction.reply({ content: msg, ephemeral: true }) : interaction.reply(msg);
    }

    try {
      let user;
      let reason;

      if (isInteraction) {
        user = interaction.options.getUser('user');
        reason = interaction.options.getString('reason') || 'No reason provided';
      } else {
        // Read string entries directly via the robust options system built inside your messageCreate emulator
        user = interaction.options.getUser('user');
        reason = interaction.options.getString('reason') || 'No reason provided';
      }

      if (!user) {
        const msg = '❌ Please mention a valid user or provide a valid user ID.';
        return interaction.reply({ content: msg, ephemeral: true }).catch(() => null);
      }

      // 🛑 ANTI-DUPLICATE CHECK (Fetch via API, bypassing cache to see if already banned)
      const existingBan = await guild.bans.fetch({ user: user.id, cache: false }).catch(() => null);
      if (existingBan) {
        const msg = `❌ **${user.username}** is already banned from this server!`;
        return isInteraction ? interaction.reply({ content: msg, ephemeral: true }) : interaction.reply(msg);
      }

      // Bypass cache to fetch member presence accurately
      const member = await guild.members.fetch({ user: user.id, force: true }).catch(() => null);
      if (member && !member.bannable) {
        const msg = '❌ I cannot ban this user! Their roles are higher than mine or yours.';
        return isInteraction ? interaction.reply({ content: msg, ephemeral: true }) : interaction.reply(msg);
      }

      await guild.members.ban(user.id, { reason });

      // ========================================================
      // NEW: MONGO-D B UNIFIED MOD LOGS SYSTEM RESOLUTION
      // ========================================================
      const guildConfig = await database.findOne({ guildId: guildId }).catch(() => null) || {};
      
      if (guildConfig.modLogsEnabled && guildConfig.unifiedLogChannelId) {
        const modLogsChannel = guild.channels.cache.get(guildConfig.unifiedLogChannelId) || await guild.channels.fetch(guildConfig.unifiedLogChannelId).catch(() => null);
        
        if (modLogsChannel) {
          const embedLog = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('🛡️ Unified Moderation: User Banned')
            .addFields(
              { name: 'Target User', value: `${user.username} (${user.id})` },
              { name: 'Responsible Staff', value: `${author.username}` },
              { name: 'Reason Given', value: reason }
            )
            .setTimestamp();
          await modLogsChannel.send({ embeds: [embedLog] }).catch(() => null);
        }
      }

      await logAction(guild, 'User Banned', author, `User: ${user.username}, Reason: ${reason}`);

      const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('✅ User Banned')
        .setDescription(`${user.username} has been banned.\nReason: ${reason}`);

      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Ban error:', error);
      const msg = `❌ Error banning user: ${error.message}`;
      return interaction.reply({ content: msg, ephemeral: true }).catch(() => null);
    }
  },
};
