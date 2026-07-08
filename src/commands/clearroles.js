const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
  } = require('discord.js');
  const { logAction } = require('../utils/auditLog');
  
  module.exports = {
    data: new SlashCommandBuilder()
      .setName('clearroles')
      .setDescription('🗑️ Forcefully delete all modifiable custom server roles instantly.')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    name: 'clearroles',
  
    async execute(interaction, client) {
      const isInteraction = interaction.isCommand ? interaction.isCommand() : false;
      const guild = interaction.guild;
      const memberExecutor = interaction.member;
  
      if (!guild) return;
  
      // 1. Enforce strict Manage Server or Admin permission checks
      if (!memberExecutor.permissions.has(PermissionFlagsBits.ManageGuild) && 
          !memberExecutor.permissions.has(PermissionFlagsBits.Administrator)) {
        const lockMsg = '❌ **Access Denied:** You need **Manage Server** or **Administrator** permissions to execute this command.';
        return isInteraction ? interaction.reply({ content: lockMsg, ephemeral: true }) : interaction.reply(lockMsg);
      }
  
      // 2. Clear Warning Embed Configuration
      const warningEmbed = new EmbedBuilder()
        .setTitle('⚠️ OPERATIONAL WARNING: WIPE ALL ROLES')
        .setDescription(
          `### Absolute Safety Confirmation Check\n` +
          `You are about to forcefully **DELETE ALL CUSTOM ROLES** inside this server.\n\n` +
          `• Skipped: The base \`@everyone\` role.\n` +
          `• Skipped: Roles managed by bot integrations or located above the bot's hierarchy rank.\n\n` +
          `*Are you absolutely sure you want to delete them? This cannot be reversed.*`
        )
        .setColor('#ED4245')
        .setTimestamp();
  
      const choiceButtonsRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`clear_roles_matrix_execute_${interaction.user.id}`)
          .setLabel('Yes, Delete All Roles')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🗑️'),
        new ButtonBuilder()
          .setCustomId(`clear_roles_matrix_cancel_${interaction.user.id}`)
          .setLabel('Cancel Purge')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('✅')
      );
  
      const payload = { embeds: [warningEmbed], components: [choiceButtonsRow] };
      return isInteraction ? interaction.reply(payload) : interaction.reply(payload);
    },
  
    // ========================================================
    // 🔘 INTERACTIVE OPERATION CONTROLLER (BUTTON PIPELINES)
    // ========================================================
    async handleInteraction(interaction) {
      if (!interaction.isButton()) return;
  
      const parts = interaction.customId.split('_');
      const actionType = parts[3]; 
      const commandCallerId = parts[4];
      const guild = interaction.guild;
  
      // Direct caller constraint safety check
      if (interaction.user.id !== commandCallerId) {
        return interaction.reply({ content: '❌ **Access Restricted:** This control panel is only responsive to the administrator who initialized it.', ephemeral: true });
      }
  
      // BUTTON EVENT: OPERATION CANCELLED
      if (actionType === 'cancel') {
        await interaction.deferUpdate().catch(() => null);
        return interaction.editReply({ 
          content: '✅ **Purge Terminated:** Role structure purge aborted safely.', 
          embeds: [], 
          components: [] 
        });
      }
  
      // BUTTON EVENT: COMMENCING DELETION
      if (actionType === 'execute') {
        await interaction.deferUpdate().catch(() => null);
        
        await interaction.editReply({ 
          content: '⏳ **Purge Matrix Initialized:** Deleting server role list...', 
          embeds: [], 
          components: [] 
        });
  
        // Targets all editable, non-managed roles, ignoring @everyone
        const targets = guild.roles.cache.filter(role => 
          role.id !== guild.roles.everyone.id && 
          !role.managed && 
          role.editable
        );
  
        if (targets.size === 0) {
          return interaction.editReply({ content: '📭 **Complete:** No customizable or modifiable roles were discovered to wipe.' });
        }
  
        let deletedCount = 0;
        let failureCount = 0;
  
        for (const role of targets.values()) {
          try {
            await role.delete(`Force clear executed by: ${interaction.user.tag}`);
            deletedCount++;
            try { await logAction(guild, 'Role Deleted', interaction.user, `Moniker Profile: ${role.name}`); } catch (_) {}
          } catch (err) {
            failureCount++;
            console.error(`Unable to drop role ${role.name}:`, err.message);
          }
        }
  
        const performanceEmbed = new EmbedBuilder()
          .setTitle('🗑️ Server Roles Purged successfully')
          .setDescription(`The structural deletion factory cycle has successfully completed.`)
          .addFields(
            { name: 'Successfully Deleted', value: `\` ${deletedCount} custom roles \``, inline: true },
            { name: 'Skipped / Unreachable', value: `\` ${failureCount} roles \``, inline: true }
          )
          .setColor('#ED4245')
          .setTimestamp();
  
        return interaction.editReply({ content: null, embeds: [performanceEmbed] });
      }
    }
  };
  