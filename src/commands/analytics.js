const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    ChannelType, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
  } = require('discord.js');
  const mongoose = require('mongoose');
  const database = require('../utils/database'); // Linked to your live Mongo connection
  
  // ==========================================
  // 1. EMBEDDED MONGOOSE ANALYTICS SCHEMA
  // ==========================================
  const AnalyticsSchema = new mongoose.Schema({
      guildId: { type: String, required: true, unique: true },
      enabled: { type: Boolean, default: false },
      categoryId: { type: String, default: null },
      totalChannelId: { type: String, default: null },
      humansChannelId: { type: String, default: null },
      botsChannelId: { type: String, default: null },
      wizardActive: { type: Boolean, default: false },
      wizardStep: { type: Number, default: 0 },
      wizardUserId: { type: String, default: null }
  });
  const AnalyticsModel = mongoose.models.AnalyticsRule || mongoose.model('AnalyticsRule', AnalyticsSchema);
  
  module.exports = {
    data: new SlashCommandBuilder()
      .setName('analytics')
      .setDescription('📊 Deploy live statistic counter channels forced to the top of your server list.')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addSubcommand(sub => sub.setName('setup').setDescription('Launch and deploy statistics channel grids'))
      .addSubcommand(sub => sub.setName('edit').setDescription('✏️ Modify your existing statistics channel layout settings'))
      .addSubcommand(sub => sub.setName('delete').setDescription('🗑️ Wipe current statistic channels and clear database traces'))
      .addSubcommand(sub => sub.setName('update').setDescription('🔄 Force an immediate on-demand refresh of counters')),
    name: 'analytics',
  
    async execute(interaction, client) {
      const isInteraction = interaction.isCommand ? interaction.isCommand() : false;
      const guild = interaction.guild;
      if (!guild) return;
      const guildId = guild.id;
      const memberExecutor = interaction.member;
  
      if (!memberExecutor.permissions.has(PermissionFlagsBits.ManageGuild) && 
          !memberExecutor.permissions.has(PermissionFlagsBits.Administrator)) {
        const lockMsg = '❌ **Access Denied:** You need `Manage Server` or `Administrator` privileges.';
        return isInteraction ? interaction.reply({ content: lockMsg, ephemeral: true }) : interaction.reply(lockMsg);
      }
  
      if (isInteraction) await interaction.deferReply({ ephemeral: true }).catch(() => null);
      const doc = await AnalyticsModel.findOne({ guildId }).catch(() => null) || new AnalyticsModel({ guildId });
      const commandName = isInteraction ? interaction.options.getSubcommand() : interaction.content?.split(/ +/)[1]?.toLowerCase();
  
      // ==========================================
      // MODULE FLOW A: SETUP COUNTER SYSTEM
      // ==========================================
      if (commandName === 'setup') {
        // Safe destruction layer: Wipe old active entries before deploying fresh nodes
        if (doc.categoryId) { const c = guild.channels.cache.get(doc.categoryId); if (c) await c.delete().catch(() => null); }
        if (doc.totalChannelId) { const c = guild.channels.cache.get(doc.totalChannelId); if (c) await c.delete().catch(() => null); }
        if (doc.humansChannelId) { const c = guild.channels.cache.get(doc.humansChannelId); if (c) await c.delete().catch(() => null); }
        if (doc.botsChannelId) { const c = guild.channels.cache.get(doc.botsChannelId); if (c) await c.delete().catch(() => null); }
  
        const totalMembers = guild.memberCount;
        const totalBots = guild.members.cache.filter(m => m.user.bot).size || 0;
        const totalHumans = totalMembers - totalBots;
  
        // Spawns structural stats framework category pinned to position 0
        const statsCategory = await guild.channels.create({
          name: '📊 SERVER STATS',
          type: ChannelType.GuildCategory,
          position: 0
        });
  
        const totalChan = await guild.channels.create({ name: `👥 Total Members: ${totalMembers}`, type: ChannelType.GuildVoice, parent: statsCategory.id, permissionOverwrites: [{ id: guild.roles.everyone.id, deny: [PermissionFlagsBits.Connect], allow: [PermissionFlagsBits.ViewChannel] }] });
        const humansChan = await guild.channels.create({ name: `🙋 Humans: ${totalHumans}`, type: ChannelType.GuildVoice, parent: statsCategory.id, permissionOverwrites: [{ id: guild.roles.everyone.id, deny: [PermissionFlagsBits.Connect], allow: [PermissionFlagsBits.ViewChannel] }] });
        const botsChan = await guild.channels.create({ name: `🤖 Bots: ${totalBots}`, type: ChannelType.GuildVoice, parent: statsCategory.id, permissionOverwrites: [{ id: guild.roles.everyone.id, deny: [PermissionFlagsBits.Connect], allow: [PermissionFlagsBits.ViewChannel] }] });
  
        doc.enabled = true;
        doc.categoryId = statsCategory.id;
        doc.totalChannelId = totalChan.id;
        doc.humansChannelId = humansChan.id;
        doc.botsChannelId = botsChan.id;
        doc.wizardActive = false;
        await doc.save();
  
        const successEmbed = new EmbedBuilder()
          .setTitle('✅ Counter Channels Deployed')
          .setDescription(`Successfully created your stats tracking layout pinned cleanly at position \`0\` of your server list.`)
          .setColor('#2ECC71');
  
        return isInteraction ? interaction.editReply({ embeds: [successEmbed] }) : interaction.reply({ embeds: [successEmbed] });
      }
    // ==========================================
    // MODULE FLOW B: EDIT COUNTER CONFIGURATIONS
    // ==========================================
    if (commandName === 'edit') {
        if (!doc.enabled || !doc.categoryId) {
          const err = '❌ **Error:** No analytics setup was found to edit. Run `/analytics setup` first.';
          return isInteraction ? interaction.editReply(err) : interaction.reply(err);
        }
  
        doc.wizardActive = true;
        doc.wizardStep = 1;
        doc.wizardUserId = interaction.user.id;
        await doc.save();
  
        const editEmbed = new EmbedBuilder()
          .setTitle('✏️ Edit Stats Channels: Step 1')
          .setDescription(`Would you like to change the category wrapper name? Current name is **📊 SERVER STATS**.\n\nClick **Change Name** to input modifications, or click the **Skip This Step** button to preserve it.`)
          .setColor('#E67E22');
  
        const buttonsRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`analytics_edit_action_modify_${interaction.user.id}`).setLabel('Change Name Layout').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId(`analytics_edit_action_skip_${interaction.user.id}`).setLabel('Skip This Step').setStyle(ButtonStyle.Secondary)
        );
  
        return isInteraction 
          ? interaction.editReply({ embeds: [editEmbed], components: [buttonsRow] }) 
          : interaction.reply({ embeds: [editEmbed], components: [buttonsRow] });
      }
  
      // ==========================================
      // MODULE FLOW C: PURGE COUNTERS FROM SERVER
      // ==========================================
      if (commandName === 'delete') {
        const confirmEmbed = new EmbedBuilder()
          .setTitle('⚠️ Absolute Safety Confirmation Check')
          .setDescription(
            `### Are you absolutely sure?\n` +
            `Proceeding will completely delete your stats tracking category, remove all voice counter nodes from your channel list, and drop all configuration files out of your database.\n\n` +
            `🚨 *Note: This operation cannot be reversed.*`
          )
          .setColor('#ED4245');
  
        const buttonsRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`analytics_delete_confirm_${interaction.user.id}`).setLabel('Yes, Delete Everything').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('analytics_delete_cancel').setLabel('Cancel Operation').setStyle(ButtonStyle.Secondary)
        );
  
        return isInteraction 
          ? interaction.editReply({ embeds: [confirmEmbed], components: [buttonsRow] }) 
          : interaction.reply({ embeds: [confirmEmbed], components: [buttonsRow] });
      }
  
      // ==========================================
      // MODULE FLOW D: FORCE UPDATE REFRESH LOOP
      // ==========================================
      if (commandName === 'update') {
        if (!doc.enabled || !doc.categoryId) {
          const err = '❌ **Error:** No active layouts configured. Run `/analytics setup` first.';
          return isInteraction ? interaction.editReply(err) : interaction.reply(err);
        }
  
        const totalBots = guild.members.cache.filter(m => m.user.bot).size || 0;
        const totalMembers = guild.memberCount;
        const totalHumans = totalMembers - totalBots;
  
        const tc = guild.channels.cache.get(doc.totalChannelId); if (tc) await tc.setName(`👥 Total Members: ${totalMembers}`).catch(() => null);
        const hc = guild.channels.cache.get(doc.humansChannelId); if (hc) await hc.setName(`🙋 Humans: ${totalHumans}`).catch(() => null);
        const bc = guild.channels.cache.get(doc.botsChannelId); if (bc) await bc.setName(`🤖 Bots: ${totalBots}`).catch(() => null);
  
        return isInteraction ? interaction.editReply({ content: '🔄 **Counters Refreshed:** Live analytics tracking nodes updated successfully.' }) : interaction.reply('🔄 **Counters Refreshed:** Live analytics tracking nodes updated successfully.');
      }
    },
  // ========================================================
  // 🔘 WIZARD INTERACTIVE SELECTION MENU HANDLING CONTROLLER
  // ========================================================
  async handleInteraction(interaction) {
    if (!interaction.isButton()) return;
    await interaction.deferUpdate().catch(() => null);

    const guild = interaction.guild;
    const guildId = interaction.guildId;
    const userId = interaction.user.id;
    const parts = interaction.customId.split('_');

    // --- DELETION SELECTION FLOW ENGINE CIRCUITS ---
    if (interaction.customId.startsWith('analytics_delete_confirm_')) {
      const doc = await AnalyticsModel.findOne({ guildId }).catch(() => null);
      if (doc) {
        if (doc.categoryId) { const c = guild.channels.cache.get(doc.categoryId); if (c) await c.delete().catch(() => null); }
        if (doc.totalChannelId) { const c = guild.channels.cache.get(doc.totalChannelId); if (c) await c.delete().catch(() => null); }
        if (doc.humansChannelId) { const c = guild.channels.cache.get(doc.humansChannelId); if (c) await c.delete().catch(() => null); }
        if (doc.botsChannelId) { const c = guild.channels.cache.get(doc.botsChannelId); if (c) await c.delete().catch(() => null); }
        await AnalyticsModel.deleteOne({ guildId });
      }
      return interaction.editReply({ content: '🗑️ **Purge Successful:** Stats layout dropped and wiped cleanly out of database tracks.', embeds: [], components: [] });
    }
    if (interaction.customId === 'analytics_delete_cancel') {
      return interaction.editReply({ content: '✅ Deletion cancelled. Active tracking nodes remain safe.', embeds: [], components: [] });
    }

    // --- PERSISTENT SKIPPABLE WIZARD SYSTEM RUNTIME MAPS ---
    const doc = await AnalyticsModel.findOne({ guildId }).catch(() => null);
    if (!doc || !doc.wizardActive || doc.wizardUserId !== userId) return;

    if (interaction.customId.startsWith('analytics_edit_action_skip_')) {
      doc.wizardActive = false;
      await doc.save();

      const skipFinalEmbed = new EmbedBuilder()
        .setTitle('✅ Configuration Maintained')
        .setDescription('No modifications were requested. Your existing statistics category tracker rules remain running intact.')
        .setColor('#3498DB');

      return interaction.editReply({ embeds: [skipFinalEmbed], components: [] });
    }

    if (interaction.customId.startsWith('analytics_edit_action_modify_')) {
      doc.wizardStep = 2;
      await doc.save();

      const step2Embed = new EmbedBuilder()
        .setTitle('✏️ Step 2: Choose Display Font Layout Type')
        .setDescription('Select the accent framework style you want to apply across all child voice counter channels node files below:')
        .setColor('#E67E22');

      const selectButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`analytics_style_choice_clean_${userId}`).setLabel('Classic Clean Layout').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`analytics_style_choice_tech_${userId}`).setLabel('Industrial Tracker Line').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`analytics_style_choice_secure_${userId}`).setLabel('Locked Protection Accent').setStyle(ButtonStyle.Danger)
      );

      return interaction.editReply({ embeds: [step2Embed], components: [selectButtons] });
    }
    if (interaction.customId.startsWith('analytics_style_choice_')) {
        const choiceType = parts[3]; // 'clean', 'tech', or 'secure'
        doc.wizardActive = false;
        await doc.save();
  
        const totalBots = guild.members.cache.filter(m => m.user.bot).size || 0;
        const totalMembers = guild.memberCount;
        const totalHumans = totalMembers - totalBots;
  
        let categoryName = '📊 SERVER STATS';
        let totalLabel = `👥 Total Members: ${totalMembers}`;
        let humansLabel = `🙋 Humans: ${totalHumans}`;
        let botsLabel = `🤖 Bots: ${totalBots}`;
  
        if (choiceType === 'tech') {
          categoryName = '⚙️ DATA CORE ──';
          totalLabel = `├ 🛰️ ALL FIELDS: ${totalMembers}`;
          humansLabel = `├ 👥 POPULATION: ${totalHumans}`;
          botsLabel = `└ 🤖 CONNECTORS: ${totalBots}`;
        } else if (choiceType === 'secure') {
          categoryName = '🔒 PROTECTION METRICS';
          totalLabel = `🔒 Verified Node: ${totalMembers}`;
          humansLabel = `🔒 Human Access: ${totalHumans}`;
          botsLabel = `🔒 Core Apps: ${totalBots}`;
        }
  
        // Re-format running voice channel parameters natively inside the live guild matrix
        const cat = guild.channels.cache.get(doc.categoryId); if (cat) await cat.setName(categoryName).catch(() => null);
        const tc = guild.channels.cache.get(doc.totalChannelId); if (tc) await tc.setName(totalLabel).catch(() => null);
        const hc = guild.channels.cache.get(doc.humansChannelId); if (hc) await hc.setName(humansLabel).catch(() => null);
        const bc = guild.channels.cache.get(doc.botsChannelId); if (bc) await bc.setName(botsLabel).catch(() => null);
  
        const finalizedEmbed = new EmbedBuilder()
          .setTitle('✅ Statistics System Re-Formatted!')
          .setDescription(`Successfully applied your font layout preferences. Your tracking channels have been modified to map the chosen configuration fields.`)
          .setColor('#2ECC71')
          .setTimestamp();
  
        return interaction.editReply({ embeds: [finalizedEmbed], components: [] });
      }
    }
  };
      