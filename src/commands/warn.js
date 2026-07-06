const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { logAction } = require('../utils/auditLog');
const database = require('../utils/database'); // Updated to use your live MongoDB layout connection

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a server member')
    .addUserOption(option => option.setName('user').setDescription('User to warn').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for warning').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  name: 'warn',

  async execute(interaction, client) {
    const isInteraction = interaction.isCommand ? interaction.isCommand() : false;
    const guild = interaction.guild;
    const author = interaction.user; 
    const memberExecutor = interaction.member;
    const guildId = interaction.guildId;

    if (!memberExecutor.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      const msg = '❌ You need Moderate Members permission to issue warnings!';
      return isInteraction ? interaction.reply({ content: msg, ephemeral: true }) : interaction.reply(msg);
    }

    try {
      let user;
      let reason;

      if (isInteraction) {
        user = interaction.options.getUser('user');
        reason = interaction.options.getString('reason');
      } else {
        user = interaction.options.getUser('user');
        reason = interaction.options.getString('reason');
      }

      if (!user) {
        const msg = '❌ Please mention a valid user or provide a valid user ID.';
        return interaction.reply({ content: msg, ephemeral: true }).catch(() => null);
      }

      // 🛑 ANTI-GHOST CHECK (Bypass Cache to verify presence)
      const member = await guild.members.fetch({ user: user.id, force: true }).catch(() => null);
      if (!member) {
        const msg = '❌ This user is not in the server! You cannot warn someone who is not here.';
        return isInteraction ? interaction.reply({ content: msg, ephemeral: true }) : interaction.reply(msg);
      }

      if (!reason) {
        const msg = '❌ Please provide a reason for the warning. Use: `|warn @user <reason>`';
        return isInteraction ? interaction.reply({ content: msg, ephemeral: true }) : interaction.reply(msg);
      }

      // ========================================================
      // NEW: MONGO-DB WARNING PERSISTENCE INFRASTRUCTURE
      // ========================================================
      const newWarning = {
        moderatorId: author.id,
        reason: reason,
        timestamp: new Date().toISOString()
      };

      // Push warning object directly into the nested guild config document
      const updatedConfig = await database.findOneAndUpdate(
        { guildId: guildId },
        { 
          $push: { 
            [`warnings.${user.id}`]: newWarning 
          } 
        },
        { upsert: true, new: true } // 'new: true' returns the modified document so we can read the warning length
      ).catch(() => null) || {};

      // Safeguard warning length extraction
      const totalWarnings = updatedConfig.warnings?.[user.id]?.length || 1;

      // DM the user safely
      await user.send(`⚠️ You have been warned in **${guild.name}**.\n**Reason:** ${reason}`).catch(() => null);

      // ========================================================
      // MONGO-DB UNIFIED MOD LOGS SYSTEM RESOLUTION
      // ========================================================
      const guildConfig = await database.findOne({ guildId: guildId }).catch(() => null) || {};
      
      if (guildConfig.modLogsEnabled && guildConfig.unifiedLogChannelId) {
        const modLogsChannel = guild.channels.cache.get(guildConfig.unifiedLogChannelId) || await guild.channels.fetch(guildConfig.unifiedLogChannelId).catch(() => null);
        
        if (modLogsChannel) {
          const embedLog = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🛡️ Unified Moderation: User Warned')
            .addFields(
              { name: 'Target User', value: `${user.username} (${user.id})`, inline: true },
              { name: 'Responsible Staff', value: `${author.username}`, inline: true },
              { name: 'Total Infractions', value: totalWarnings.toString(), inline: true },
              { name: 'Reason Given', value: reason }
            )
            .setTimestamp();
          await modLogsChannel.send({ embeds: [embedLog] }).catch(() => null);
        }
      }

      await logAction(guild, 'User Warned', author, `User: ${user.username}, Reason: ${reason}`);

      const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('⚠️ User Warned')
        .setDescription(`${user.username} has been warned.\nReason: ${reason}\nTotal warnings: **${totalWarnings}**`);

      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Warn error:', error);
      const msg = `❌ Error running warning system: ${error.message}`;
      return interaction.reply({ content: msg, ephemeral: true }).catch(() => null);
    }
  },
};
