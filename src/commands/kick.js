const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { logAction = () => {} } = require('../utils/auditLog');
const database = require('../utils/database'); // Updated to point directly to your MongoDB client model
const { formatCute } = require('../utils/textFormatter.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a user from the server')
    .addUserOption(option => option.setName('user').setDescription('User to kick').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for kick').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  name: 'kick',

  async execute(interaction, client) {
    // Structural compatibility verification layer for hybrid interaction tracking 
    const isInteraction = interaction.isCommand ? interaction.isCommand() : false;
    const guild = interaction.guild;
    const author = isInteraction ? interaction.user : interaction.user; // interaction emulator maps message author to user field
    const memberExecutor = interaction.member;
    const guildId = interaction.guildId;

    if (!memberExecutor.permissions.has(PermissionFlagsBits.KickMembers)) {
      const msg = '❌ You need Kick Members permission!';
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

      // 🛑 ANTI-GHOST CHECK (Bypass Cache to verify presence)
      const member = await guild.members.fetch({ user: user.id, force: true }).catch(() => null);
      if (!member) {
        const msg = '❌ This user is not in the server! You cannot kick someone who has already left.';
        return isInteraction ? interaction.reply({ content: msg, ephemeral: true }) : interaction.reply(msg);
      }

      if (!member.kickable) {
        const msg = '❌ I cannot kick this user! Their roles are higher than mine or yours.';
        return isInteraction ? interaction.reply({ content: msg, ephemeral: true }) : interaction.reply(msg);
      }

      await member.kick(reason);

      // ========================================================
      // MONGO-DB UNIFIED MOD LOGS SYSTEM RESOLUTION
      // ========================================================
      const guildConfig = await database.findOne({ guildId: guildId }).catch(() => null) || {};
      
      if (guildConfig.modLogsEnabled && guildConfig.unifiedLogChannelId) {
        const modLogsChannel = guild.channels.cache.get(guildConfig.unifiedLogChannelId) || await guild.channels.fetch(guildConfig.unifiedLogChannelId).catch(() => null);
        
        if (modLogsChannel) {
          const embedLog = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('🛡️ Unified Moderation: User Kicked')
            .addFields(
              { name: 'Target User', value: `${user.username} (${user.id})` },
              { name: 'Responsible Staff', value: `${author.username}` },
              { name: 'Reason Given', value: reason }
            )
            .setTimestamp();
          await modLogsChannel.send({ embeds: [embedLog] }).catch(() => null);
        }
      }

      await logAction(guild, 'User Kicked', author, `User: ${user.username}, Reason: ${reason}`);

      const embed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('✅ User Kicked')
        .setDescription(`${user.username} has been kicked.\nReason: ${reason}`);

      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Kick error:', error);
      const msg = `❌ Error kicking user: ${error.message}`;
      return interaction.reply({ content: msg, ephemeral: true }).catch(() => null);
    }
  },
};
