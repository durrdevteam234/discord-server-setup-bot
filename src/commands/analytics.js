const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    ChannelType,
    EmbedBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    ButtonBuilder, 
    ButtonStyle 
  } = require('discord.js');
  const mongoose = require('mongoose');
  const database = require('../utils/database'); // Bound to your live Atlas structure connection
  
  // ==========================================
  // 1. EMBEDDED MONGOOSE ANALYTICS SCHEMA
  // ==========================================
  const AnalyticsSchema = new mongoose.Schema({
      guildId: { type: String, required: true, unique: true },
      enabled: { type: Boolean, default: false },
      channelId: { type: String, default: null },   // Target counter voice channel
      metricType: { type: String, default: 'total_members' }, // total_members, organic_humans, total_bots, booster_count, active_roles
      customLabel: { type: String, default: '👥 Total Members:' }
  });
  const AnalyticsModel = mongoose.models.AnalyticsRule || mongoose.model('AnalyticsRule', AnalyticsSchema);
  
  // Memory tracking variable array map for step-by-step dynamic active wizard setups
  const activeAnalyticsWizards = new Map();
  
  module.exports = {
    data: new SlashCommandBuilder()
      .setName('analytics')
      .setDescription('📊 Deploy live, high-priority server stat counter channels forced to the top of your list.')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addSubcommand(sub => sub.setName('setup').setDescription('Launch the interactive configuration setup wizard node'))
      .addSubcommand(sub => sub.setName('edit').setDescription('✏️ Modify an existing analytics configuration with a skippable wizard'))
      .addSubcommand(sub => sub.setName('delete').setDescription('🗑️ Instantly drop active counter channels and clear database traces'))
      .addSubcommand(sub => sub.setName('update').setDescription('🔄 Force an immediate on-demand synchronization refresh of metric counters')),
    name: 'analytics',
  
    async execute(interaction, client) {
      const isInteraction = interaction.isCommand ? interaction.isCommand() : false;
      const guild = interaction.guild;
      const guildId = guild.id;
      const memberExecutor = interaction.member;
  
      // Enforce authorization safety guards across prefix strings or slash arrays
      if (!memberExecutor.permissions.has(PermissionFlagsBits.ManageGuild) && 
          !memberExecutor.permissions.has(PermissionFlagsBits.Administrator)) {
        const lockMsg = '❌ **Access Denied:** You need `Manage Server` or `Administrator` privileges to alter live analytics structures.';
        return isInteraction ? interaction.reply({ content: lockMsg, ephemeral: true }) : interaction.reply(lockMsg);
      }
  
      let subcommand = isInteraction ? interaction.options.getSubcommand() : interaction.options.getString('subcommand')?.toLowerCase();
      const doc = await AnalyticsModel.findOne({ guildId }).catch(() => null) || new AnalyticsModel({ guildId });
      const wizardId = `${guildId}-${interaction.user.id}`;
  
      // ==========================================
      // MODULE FLOW 1: WIZARD LAUNCH ENGINE: SETUP
      // ==========================================
      if (subcommand === 'setup' || !subcommand) {
        if (isInteraction) await interaction.deferReply({ ephemeral: true });
  
        activeAnalyticsWizards.set(wizardId, { step: 1, mode: 'setup', metricType: 'total_members', customLabel: '👥 Total Members:' });
  
        const welcomeEmbed = new EmbedBuilder()
          .setTitle('📊 ServerMiser Analytics: Setup Wizard')
          .setDescription(
            `Welcome to your guided statistics counter setup center.\n\n` +
            `We will create a specialized, high-priority **Voice Channel** pinned to the top of your server list to display real-time counters.\n\n` +
            `**Step 1:** Select the core metric calculation data you want this channel to track.`
          )
          .setColor('#3498DB')
          .setFooter({ text: 'Step 1: Choose Your Core Metric Target' });
  
        const selectMenu = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('analytics_wizard_step1')
            .setPlaceholder('Select a data metric to track live...')
            .addOptions([
              { label: 'Total Server Members', description: 'Counts every single user and application inside the guild.', value: 'total_members', emoji: '👥' },
              { label: 'Organic Human Accounts', description: 'Filters out automated systems to count organic traffic.', value: 'organic_humans', emoji: '🌱' },
              { label: 'Total Bot Configurations', description: 'Tracks the quantity of integrated automated bot accounts.', value: 'total_bots', emoji: '🤖' },
              { label: 'Premium Server Boosters', description: 'Displays the number of current active server tier boosters.', value: 'booster_count', emoji: '✨' },
              { label: 'Total Managed Roles', description: 'Tracks the total density size of your server role list hierarchy.', value: 'active_roles', emoji: '🎭' }
            ])
        );
  
        const payload = { embeds: [welcomeEmbed], components: [selectMenu] };
        return isInteraction ? interaction.editReply(payload) : interaction.reply(payload);
      }
    // ==========================================
    // MODULE FLOW 2: WIZARD LAUNCH ENGINE: EDIT
    // ==========================================
    if (subcommand === 'edit') {
        if (!doc.enabled) {
          return interaction.reply({ content: '❌ **Error:** No active counter channel found to edit. Run `/analytics setup` first.', ephemeral: true }).catch(() => null);
        }
        if (isInteraction) await interaction.deferReply({ ephemeral: true });
  
        activeAnalyticsWizards.set(wizardId, { 
          step: 1, 
          mode: 'edit', 
          metricType: doc.metricType, 
          customLabel: doc.customLabel 
        });
  
        const editEmbed = new EmbedBuilder()
          .setTitle('✏️ Edit Analytics: Step 1 (Metric Selection)')
          .setDescription(`Current Metric: \`${doc.metricType.toUpperCase()}\`\n\nSelect a new data metric from the dropdown menu, or hit the **Skip Item** button to leave it unchanged.`)
          .setColor('#E67E22');
  
        const selectMenu = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('analytics_wizard_step1')
            .setPlaceholder('Modify the metric target...')
            .addOptions([
              { label: 'Total Server Members', value: 'total_members', emoji: '👥' },
              { label: 'Organic Human Accounts', value: 'organic_humans', emoji: '🌱' },
              { label: 'Total Bot Configurations', value: 'total_bots', emoji: '🤖' },
              { label: 'Premium Server Boosters', value: 'booster_count', emoji: '✨' },
              { label: 'Total Managed Roles', value: 'active_roles', emoji: '🎭' }
            ])
        );
  
        const skipButton = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('analytics_wizard_skip_step1').setLabel('Skip This Step').setStyle(ButtonStyle.Secondary)
        );
  
        return isInteraction 
          ? interaction.editReply({ embeds: [editEmbed], components: [selectMenu, skipButton] }) 
          : interaction.reply({ embeds: [editEmbed], components: [selectMenu, skipButton] });
      }
  
      // ==========================================
      // MODULE FLOW 3: WIZARD LAUNCH ENGINE: DELETE
      // ==========================================
      if (subcommand === 'delete') {
        if (isInteraction) await interaction.deferReply({ ephemeral: true });
  
        const confirmEmbed = new EmbedBuilder()
          .setTitle('⚠️ Absolute Safety Confirmation Check')
          .setDescription(
            `### Are you absolutely sure?\n` +
            `Proceeding will completely erase your analytics tracking setup, delete the visual counter voice channel from the top of the server list, and drop data arrays out of MongoDB.\n\n` +
            `🚨 *Note: This operation cannot be reversed.*`
          )
          .setColor('#ED4245');
  
        const buttonsRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('analytics_wizard_delete_confirm').setLabel('Yes, Delete Everything').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('analytics_wizard_delete_cancel').setLabel('Cancel Operation').setStyle(ButtonStyle.Secondary)
        );
  
        return isInteraction 
          ? interaction.editReply({ embeds: [confirmEmbed], components: [buttonsRow] }) 
          : interaction.reply({ embeds: [confirmEmbed], components: [buttonsRow] });
      }
  
      // ==========================================
      // MODULE FLOW 4: FORCE REFRESH METRIC COUNTERS
      // ==========================================
      if (subcommand === 'update') {
        if (isInteraction) await interaction.deferReply({ ephemeral: true });
  
        if (!doc.enabled || !doc.channelId) {
          const noCounter = '❌ **Synchronization Error:** No active running analytics counter channels were found for this server.';
          return isInteraction ? interaction.editReply(noCounter) : interaction.reply(noCounter);
        }
  
        const counterChannel = guild.channels.cache.get(doc.channelId);
        if (!counterChannel) {
          return interaction.reply({ content: '❌ **Channel Missing:** The active counter channel has been deleted manually. Run `/analytics setup` to deploy a fresh node.', ephemeral: true }).catch(() => null);
        }
  
        let calculatedValue = guild.memberCount;
        if (doc.metricType === 'organic_humans') {
          calculatedValue = guild.members.cache.filter(m => !m.user.bot).size || guild.memberCount;
        } else if (doc.metricType === 'total_bots') {
          calculatedValue = guild.members.cache.filter(m => m.user.bot).size || 0;
        } else if (doc.metricType === 'booster_count') {
          calculatedValue = guild.premiumSubscriptionCount || 0;
        } else if (doc.metricType === 'active_roles') {
          calculatedValue = guild.roles.cache.size || 0;
        }
  
        await counterChannel.setName(`${doc.customLabel} ${calculatedValue}`).catch(() => null);
        await counterChannel.setPosition(0).catch(() => null); 
  
        const syncEmbed = new EmbedBuilder()
          .setTitle('🔄 Metrics Synchronized Successfully')
          .setDescription(`Your counter channel ${counterChannel} has been forcefully updated to render live data metrics.`)
          .addFields(
            { name: 'Tracked Class Type', value: `\`${doc.metricType.toUpperCase()}\``, inline: true },
            { name: 'Current Calculated Value', value: `\` ${calculatedValue} \``, inline: true }
          )
          .setColor('#2ECC71');
  
        return isInteraction ? interaction.editReply({ embeds: [syncEmbed] }) : interaction.reply({ embeds: [syncEmbed] });
      }
    }, 
  // ========================================================
  // 🔘 WIZARD INTERACTIVE SELECTION MENU SYSTEM PROCESSING CONTROLLER
  // ========================================================
  async handleInteraction(interaction) {
    const guild = interaction.guild;
    const guildId = interaction.guildId;
    const userId = interaction.user.id;
    const wizardId = `${guildId}-${userId}`;

    // Block non-administrator access loops
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild) && 
        !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Out of authorization boundary matrix parameters.', ephemeral: true });
    }

    const doc = await AnalyticsModel.findOne({ guildId }).catch(() => null) || new AnalyticsModel({ guildId });
    
    // 🗑️ DELETION LOGIC ROUTING EXECUTORS
    if (interaction.customId === 'analytics_wizard_delete_confirm') {
      await interaction.deferUpdate().catch(() => null);
      if (doc.channelId) {
         const oldChan = guild.channels.cache.get(doc.channelId);
         if (oldChan) await oldChan.delete().catch(() => null);
      }
      await AnalyticsModel.deleteOne({ guildId });
      return interaction.editReply({ content: '🗑️ **Purge Successful:** Analytics layout dropped and wiped out of MongoDB records.', embeds: [], components: [] });
    }
    if (interaction.customId === 'analytics_wizard_delete_cancel') {
      await interaction.deferUpdate().catch(() => null);
      return interaction.editReply({ content: '✅ Deletion cancelled. Analytics trackers remain safe.', embeds: [], components: [] });
    }

    const session = activeAnalyticsWizards.get(wizardId);
    if (!session) return;

    // 🔘 STEP 1 SUBMISSION: PROCESS METRIC TARGET SELECTION OR SKIP
    if ((interaction.customId === 'analytics_wizard_step1' && interaction.isStringSelectMenu()) || interaction.customId === 'analytics_wizard_skip_step1') {
      await interaction.deferUpdate().catch(() => null);
      if (interaction.isStringSelectMenu()) session.metricType = interaction.values[0]; 
      session.step = 2;

      const labelDefaults = {
        total_members: '👥 Total Members:',
        organic_humans: '🌱 Humans Population:',
        total_bots: '🤖 Integrated Bots:',
        booster_count: '✨ Premium Boosts:',
        active_roles: '🎭 Hierarchy Roles:'
      };
      
      // Only set dynamic default label if not skipping/in edit mode preservation track
      if (interaction.isStringSelectMenu()) {
        session.customLabel = labelDefaults[session.metricType];
      }

      const step2Embed = new EmbedBuilder()
        .setTitle(`${session.mode === 'edit' ? '✏️' : '📊'} Step 2: Choose Graphical Custom Label Style`)
        .setDescription(
          `**Selected Metric Target:** \`${session.metricType.toUpperCase()}\`\n\n` +
          `Choose the font framing header title asset style layout that will prefix your numerical metric result inside the voice channel name:\n\n` +
          `Current Label Framework: \`${session.customLabel}\``
        )
        .setColor('#E67E22');

      const step2SelectMenu = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('analytics_wizard_step2')
          .setPlaceholder('Choose a visual text label framework style...')
          .addOptions([
            { label: `Classic Title [Count]`, description: 'Classic clean font prefix design styling.', value: 'style_classic' },
            { label: `📊 SYSTEM ── [Count]`, description: 'Minimalist industrial horizontal spacer lines.', value: 'style_tech' },
            { label: `🪐 Orbit Track ── [Count]`, description: 'Cosmic themes tracking presentation profile layouts.', value: 'style_cosmic' },
            { label: `🔒 Locked Grid ── [Count]`, description: 'Strict protection lock accent theme profiles.', value: 'style_secure' }
          ])
      );

      const comps = [step2SelectMenu];
      if (session.mode === 'edit') {
        comps.push(new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('analytics_wizard_skip_step2').setLabel('Skip This Step & Finalize').setStyle(ButtonStyle.Secondary)));
      }

      return interaction.editReply({ embeds: [step2Embed], components: comps });
    }
    // 🔘 STEP 2 SUBMISSION: PROCESS TEXT STYLE LABELS OR SKIP FINALIZE TRIPPED
    if ((interaction.customId === 'analytics_wizard_step2' && interaction.isStringSelectMenu()) || interaction.customId === 'analytics_wizard_skip_step2') {
        await interaction.deferUpdate().catch(() => null);
        
        if (interaction.isStringSelectMenu()) {
          const chosenStyle = interaction.values[0];
          if (chosenStyle === 'style_classic') {
            const labelDefaults = {
              total_members: '👥 Total Members:',
              organic_humans: '🌱 Humans Population:',
              total_bots: '🤖 Integrated Bots:',
              booster_count: '✨ Premium Boosts:',
              active_roles: '🎭 Hierarchy Roles:'
            };
            session.customLabel = labelDefaults[session.metricType];
          } else if (chosenStyle === 'style_tech') {
             session.customLabel = '📊 SYSTEM ──';
          } else if (chosenStyle === 'style_cosmic') {
             session.customLabel = '🪐 Orbit Track ──';
          } else if (chosenStyle === 'style_secure') {
             session.customLabel = '🔒 Locked Grid ──';
          }
        }
  
        // Capture and reuse the same voice channel if modifying in edit mode to preserve sorting locations
        let counterChannelNode = doc.channelId ? guild.channels.cache.get(doc.channelId) : null;
  
        if (!counterChannelNode && doc.channelId) {
           // Channel was missing or dropped, clear it to recreate below
           doc.channelId = null;
        }
  
        // Calculate runtime variables
        let finalStartingCount = guild.memberCount;
        if (session.metricType === 'organic_humans') {
          finalStartingCount = guild.members.cache.filter(m => !m.user.bot).size || guild.memberCount;
        } else if (session.metricType === 'total_bots') {
          finalStartingCount = guild.members.cache.filter(m => m.user.bot).size || 0;
        } else if (session.metricType === 'booster_count') {
          finalStartingCount = guild.premiumSubscriptionCount || 0;
        } else if (session.metricType === 'active_roles') {
          finalStartingCount = guild.roles.cache.size || 0;
        }
  
        const generatedChannelNameStr = `${session.customLabel} ${finalStartingCount}`;
  
        if (counterChannelNode) {
           // Modify existing voice node name
           await counterChannelNode.setName(generatedChannelNameStr).catch(() => null);
           await counterChannelNode.setPosition(0).catch(() => null);
        } else {
           // Spawn an absolute fresh voice tracking node
           counterChannelNode = await guild.channels.create({
              name: generatedChannelNameStr,
              type: ChannelType.GuildVoice,
              position: 0, 
              permissionOverwrites: [
                {
                  id: guild.roles.everyone.id,
                  deny: [PermissionFlagsBits.Connect], 
                  allow: [PermissionFlagsBits.ViewChannel] 
                }
              ]
           });
        }
  
        // Update structural elements inside your MongoDB document
        doc.enabled = true;
        doc.channelId = counterChannelNode.id;
        doc.metricType = session.metricType;
        doc.customLabel = session.customLabel;
        await doc.save();
  
        activeAnalyticsWizards.delete(wizardId); 
  
        const saveEmbed = new EmbedBuilder()
          .setTitle(`✅ Analytics Channel ${session.mode === 'edit' ? 'Updated' : 'Deployed'}`)
          .setDescription(
            `Successfully customized your configuration matrices and synced the top-anchored tracker channel.\n\n` +
            `• **Deployed Channel Link:** ${counterChannelNode}\n` +
            `• **Monitored Metric:** \`${session.metricType.toUpperCase()}\`\n` +
            `• **Display Label Output:** \`${generatedChannelNameStr}\``
          )
          .setColor('#2ECC71')
          .setTimestamp();
  
        return interaction.editReply({ embeds: [saveEmbed], components: [] });
      }
    }
  };
      