const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { logAction } = require('../utils/auditLog');
const database = require('../utils/database'); // Updated to point directly to your MongoDB client model

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Unmute a user')
    .addUserOption(option => option.setName('user').setDescription('User to unmute').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  name: 'unmute',

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

      if (isInteraction) {
        user = interaction.options.getUser('user');
      } else {
        user = interaction.options.getUser('user');
      }

      if (!user) {
        const msg = '❌ Please mention a valid user or provide a valid user ID.';
        return interaction.reply({ content: msg, ephemeral: true }).catch(() => null);
      }

      const member = await guild.members.fetch(user.id).catch(() => null);
      if (!member) {
        const msg = '❌ This user is not in the server.';
        return isInteraction ? interaction.reply({ content: msg, ephemeral: true }) : interaction.reply(msg);
      }

      // Remove the native Discord timeout
      await member.timeout(null);

      // ========================================================
      // NEW: MONGO-DB ACTIVE TIMEOUT RECORD CLEANUP
      // ========================================================
      await database.findOneAndUpdate(
        { guildId: guildId },
        { 
          $unset: { 
            [`activeMutes.${user.id}`]: "" 
          } 
        }
      ).catch(() => null);

      // ========================================================
      // MONGO-DB UNIFIED MOD LOGS SYSTEM RESOLUTION
      // ========================================================
      const guildConfig = await database.findOne({ guildId: guildId }).catch(() => null) || {};
      
      if (guildConfig.modLogsEnabled && guildConfig.unifiedLogChannelId) {
        const modLogsChannel = guild.channels.cache.get(guildConfig.unifiedLogChannelId) || await guild.channels.fetch(guildConfig.unifiedLogChannelId).catch(() => null);
        
        if (modLogsChannel) {
          const embedLog = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🛡️ Unified Moderation: User Unmuted')
            .addFields(
              { name: 'Target User', value: `${user.username} (${user.id})`, inline: true },
              { name: 'Responsible Staff', value: `${author.username}`, inline: true }
            )
            .setTimestamp();
          await modLogsChannel.send({ embeds: [embedLog] }).catch(() => null);
        }
      }

      await logAction(guild, 'User Unmuted', author, `User: ${user.username}`);

      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✅ User Unmuted')
        .setDescription(`${user.username} has been unmuted.`);

      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Unmute error:', error);
      const msg = `❌ Error unmuting user: ${error.message}`;
      return interaction.reply({ content: msg, ephemeral: true }).catch(() => null);
    }
  },
};
