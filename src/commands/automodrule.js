const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    ButtonBuilder, 
    ButtonStyle 
  } = require('discord.js');
  const mongoose = require('mongoose');
  const database = require('../utils/database');
  
  // ==========================================
  // 1. EMBEDDED MONGOOSE AUTOMOD SCHEMA
  // ==========================================
  const AutoModSchema = new mongoose.Schema({
      guildId: { type: String, required: true, unique: true },
      rules: { type: Map, of: new mongoose.Schema({
          ruleName: String,
          filterType: String,      
          actions: [String],        
          extraData: String,       
          enabled: { type: Boolean, default: true }
      }, { _id: false }), default: {} }
  });
  const AutoModModel = mongoose.models.AutoModRule || mongoose.model('AutoModRule', AutoModSchema);
  
  const activeWizards = new Map();
  
  module.exports = {
    data: new SlashCommandBuilder()
      .setName('automodrule')
      .setDescription('🛡️ Configure advanced auto-moderation filters via structured step dropdown questionnaires.')
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addSubcommand(sub => sub.setName('setup').setDescription('Launch the interactive configuration setup wizard node'))
      .addSubcommand(sub => sub.setName('list').setDescription('📋 Inspect all currently active running rules and active filters'))
      .addSubcommand(sub => sub.setName('delete').setDescription('🗑️ Instantly drop an active rules session out of your database')),
    name: 'automodrule',
  
    async execute(interaction, client) {
      const isInteraction = interaction.isCommand ? interaction.isCommand() : false;
      const guild = interaction.guild;
      const guildId = guild.id;
      const memberExecutor = interaction.member;
  
      if (!memberExecutor.permissions.has(PermissionFlagsBits.ModerateMembers) && 
          !memberExecutor.permissions.has(PermissionFlagsBits.Administrator)) {
        const lockMsg = '❌ **Access Denied:** You need `Moderate Members` or `Administrator` privileges to alter auto-moderation.';
        return isInteraction ? interaction.reply({ content: lockMsg, ephemeral: true }) : interaction.reply(lockMsg);
      }
  
      let subcommand = isInteraction ? interaction.options.getSubcommand() : interaction.options.getString('subcommand')?.toLowerCase();
      const doc = await AutoModModel.findOne({ guildId }).catch(() => null) || new AutoModModel({ guildId });
  
      if (subcommand === 'setup' || !subcommand) {
        if (isInteraction) await interaction.deferReply({ ephemeral: true });
  
        const wizardId = `${guildId}-${interaction.user.id}`;
        activeWizards.set(wizardId, { step: 1, ruleName: null, filterType: null, actions: [] });
  
        const welcomeEmbed = new EmbedBuilder()
          .setTitle('🛡️ ServerMiser Guard: AutoMod Setup Wizard')
          .setDescription('Welcome to your guided setup panel. Select your desired core filter from the menu array lists below to begin.')
          .setColor('#5865F2')
          .setFooter({ text: 'Step 1: Choose Your Core Filter Type Layer' });
  
        const selectMenu1 = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('automod_wizard_step1_p1')
            .setPlaceholder('Filter Options: List A...')
            .addOptions([
              { label: 'ALL CAPS', description: 'Blocks messages containing excessive capitalized letters.', value: 'all_caps', emoji: '🔠' },
              { label: 'Bad Words', description: 'Blocks customizable offensive terms from being posted.', value: 'bad_words', emoji: '🤬' },
              { label: 'Chat Clearing New Lines', description: 'Intercepts large vertical line spacing text blocks.', value: 'new_lines', emoji: '📉' },
              { label: 'Duplicate Texts', description: 'Prevents matching repetitive phrase copies.', value: 'duplicate_texts', emoji: '👯' },
              { label: 'Character Count Limit', description: 'Enforces character cap thresholds per room.', value: 'character_count', emoji: '📝' },
              { label: 'Emoji Spam Filter', description: 'Flags excessive emoji groupings inside text lines.', value: 'emoji_spam', emoji: '😂' },
              { label: 'Fast Message Spam', description: 'Mitigates instant burst message flooding loops.', value: 'fast_spam', emoji: '⏳' },
              { label: 'Image Spam Safeguard', description: 'Halts excessive media submissions.', value: 'image_spam', emoji: '🖼️' },
              { label: 'Invite Links Linkage', description: 'Blocks and intercepts server invites automatically.', value: 'invite_links', emoji: '🔗' },
              { label: 'Known Phishing Links', description: 'Blocks deceptive Nitro, Crypto & Discord scam links.', value: 'phishing_links', emoji: '🎣' }
            ])
        );
  
        const selectMenu2 = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('automod_wizard_step1_p2')
            .setPlaceholder('Filter Options: List B...')
            .addOptions([
              { label: 'Global Links Block', description: 'Restricts posting hyperlinks across rooms.', value: 'links', emoji: '🌐' },
              { label: 'Links Cooldown Rate', description: 'Imposes timing limits between posting hyperlinks.', value: 'links_cooldown', emoji: '⏱️' },
              { label: 'Mass Mentions Filter', description: 'Restricts excessive user/role ping patterns.', value: 'mass_mentions', emoji: '📢' },
              { label: 'Mentions Cooldown Rate', description: 'Imposes timing thresholds on ping routines.', value: 'mentions_cooldown', emoji: '🔔' },
              { label: 'Spoilers Filtering', description: 'Restricts hidden blocks or hidden text wrappers.', value: 'spoilers', emoji: '🙈' },
              { label: 'Masked Markdown Links', description: 'Blocks deceptive hidden URL links inside markdown text.', value: 'masked_links', emoji: '🥸' },
              { label: 'Stickers Sweeper', description: 'Restricts rich digital sticker submissions.', value: 'stickers', emoji: '🏷️' },
              { label: 'Stickers Cooldown Rate', description: 'Imposes timing buffers between sticker posts.', value: 'stickers_cooldown', emoji: '📊' },
              { label: 'Zalgo Text Corruptions', description: 'Flags visual glitch formatting styles automatically.', value: 'zalgo_text', emoji: '👹' },
              { label: 'Raid Bot Defenses', description: 'Flags new account traffic behaving like script raids.', value: 'raid_bots', emoji: '🚨' },
              { label: 'Unauthorized Bots', description: 'Instantly kicks rogue automated bot configurations joining.', value: 'unauthorized_bots', emoji: '🤖' }
            ])
        );
  
        const payload = { embeds: [welcomeEmbed], components: [selectMenu1, selectMenu2] };
        return isInteraction ? interaction.editReply(payload) : interaction.reply(payload);
      }
      if (subcommand === 'list') {
        if (isInteraction) await interaction.deferReply({ ephemeral: true });
  
        const rulesMap = doc.rules || new Map();
        if (rulesMap.size === 0) {
          return isInteraction ? interaction.editReply('📭 **System Record:** There are no custom auto-moderation layers active.') : interaction.reply('📭 No active layers.');
        }
  
        const listEmbed = new EmbedBuilder()
          .setTitle('📋 Running Server AutoModeration Framework Rules')
          .setColor('#3498DB')
          .setTimestamp();
  
        let outputText = '';
        rulesMap.forEach((rule) => {
          outputText += `👉 **Rule Key Name:** \`${rule.ruleName}\`\n` +
                        `• Filter Type: \`${rule.filterType.toUpperCase()}\`\n` +
                        `• Enforcement Actions: ${rule.actions.map(a => `\`${a.toUpperCase()}\``).join(', ')}\n\n`;
        });
        listEmbed.setDescription(outputText);
  
        return isInteraction ? interaction.editReply({ embeds: [listEmbed] }) : interaction.reply({ embeds: [listEmbed] });
      }
  
      if (subcommand === 'delete') {
        const rulesMap = doc.rules || new Map();
        if (rulesMap.size === 0) {
          return isInteraction ? interaction.reply({ content: '❌ No rules parameters inside this server to delete.', ephemeral: true }) : interaction.reply('❌ No rules to delete.');
        }
  
        if (isInteraction) await interaction.deferReply({ ephemeral: true });
  
        const dropdownOptions = [];
        rulesMap.forEach((rule, key) => {
          dropdownOptions.push({ label: `Delete: ${rule.ruleName}`, description: `Type: ${rule.filterType}`, value: key });
        });
  
        const deleteEmbed = new EmbedBuilder()
          .setTitle('🗑️ Purge Configuration Matrix')
          .setDescription('Select an active rule profile from the drop-down below to erase its settings.')
          .setColor('#ED4245');
  
        const actionRow = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('automod_wizard_delete_trigger')
            .setPlaceholder('Choose a rule configuration record to drop completely...')
            .addOptions(dropdownOptions)
        );
  
        return isInteraction ? interaction.editReply({ embeds: [deleteEmbed], components: [actionRow] }) : interaction.reply({ embeds: [deleteEmbed], components: [actionRow] });
      }
    },
    async handleInteraction(interaction) {
        const guildId = interaction.guildId;
        const userId = interaction.user.id;
        const wizardId = `${guildId}-${userId}`;
    
        if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers) && 
            !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: '❌ Out of authorization boundary matrix parameters.', ephemeral: true });
        }
    
        const doc = await AutoModModel.findOne({ guildId }).catch(() => null) || new AutoModModel({ guildId });
    
        if (interaction.customId === 'automod_wizard_delete_trigger' && interaction.isStringSelectMenu()) {
          await interaction.deferUpdate();
          doc.rules.delete(interaction.values[0]);
          await doc.save();
          return interaction.editReply({ embeds: [new EmbedBuilder().setTitle('🗑️ Rule Profile Deleted').setColor('#2ECC71')], components: [] });
        }
    
        const session = activeWizards.get(wizardId);
        if (!session) return;
    
        if ((interaction.customId === 'automod_wizard_step1_p1' || interaction.customId === 'automod_wizard_step1_p2') && interaction.isStringSelectMenu()) {
          await interaction.deferUpdate();
          session.filterType = interaction.values[0];
          session.step = 2;
    
          const step2Embed = new EmbedBuilder()
            .setTitle('🛡️ Step 2: Define Rule Profile Name')
            .setDescription(`You selected the **${session.filterType.toUpperCase()}** filter layout.\nChoose a profile name string key using the menu options below.`)
            .setColor('#E67E22');
    
          const step2SelectMenu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('automod_wizard_step2')
              .setPlaceholder('Choose a profile moniker rule naming structure...')
              .addOptions([
                { label: `Guard: ${session.filterType}`, value: `Guard-${session.filterType}` },
                { label: `Secure Layer: ${session.filterType}`, value: `Secure-${session.filterType}` },
                { label: `Lockdown: ${session.filterType}`, value: `Lockdown-${session.filterType}` }
              ])
          );
    
          return interaction.editReply({ embeds: [step2Embed], components: [step2SelectMenu] });
        }
    
        if (interaction.customId === 'automod_wizard_step2' && interaction.isStringSelectMenu()) {
          await interaction.deferUpdate();
          session.ruleName = interaction.values[0];
          session.step = 3;
    
          const step3Embed = new EmbedBuilder()
            .setTitle('🛡️ Step 3: Configure Unlimited Enforcement Action Chains')
            .setDescription(
              `**Configuring Rule Profile:** \`${session.ruleName}\`\n\n` +
              `Choose one or multiple security actions from the list underneath. You can combine multiple actions together.\n\n` +
              `• Selected Actions: ${session.actions.length > 0 ? session.actions.map(a => `\`${a}\``).join(', ') : '`None Chosen Yet` (Requires at least 1)'}`
            )
            .setColor('#9B59B6');
    
          const step3SelectMenu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('automod_wizard_step3')
              .setPlaceholder('Toggle and mix unlimited automation response items...')
              .addOptions([
                { label: '📥 Block message output', description: 'Deletes content text parameters instantly.', value: 'block_message', emoji: '❌' },
                { label: '📜 Log to Alert Channels', description: 'Forwards alert parameters straight to system mod logs.', value: 'log_to_channel', emoji: '🚨' },
                { label: '⏳ Timeout Offending User Account', description: 'Mutes user organic traffic streams instantly.', value: 'timeout_user', emoji: '🤐' },
                { label: '🤖 Kick Rogue User/App Profile', description: 'Instantly expels offending user configurations.', value: 'kick_user', emoji: '🔨' }
              ])
          );
    
          const actionButtons = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('automod_wizard_finalize_save').setLabel('Finalize & Save Rule Configuration').setStyle(ButtonStyle.Success).setDisabled(session.actions.length === 0),
            new ButtonBuilder().setCustomId('automod_wizard_reset_actions').setLabel('Clear Choices').setStyle(ButtonStyle.Secondary)
          );
    
          return interaction.editReply({ embeds: [step3Embed], components: [step3SelectMenu, actionButtons] });
        }
        if (interaction.customId === 'automod_wizard_step3' && interaction.isStringSelectMenu()) {
            await interaction.deferUpdate();
            const chosenValue = interaction.values[0];
            if (!session.actions.includes(chosenValue)) session.actions.push(chosenValue);
      
            const refreshEmbed = new EmbedBuilder()
              .setTitle('🛡️ Step 3: Configure Unlimited Enforcement Action Chains')
              .setDescription(`**Configuring:** \`${session.ruleName}\`\n\n• Selected Actions: ${session.actions.map(a => `\`${a.toUpperCase()}\``).join(', ')}`)
              .setColor('#9B59B6');
      
            const step3SelectMenu = new ActionRowBuilder().addComponents(
              new StringSelectMenuBuilder()
                .setCustomId('automod_wizard_step3')
                .setPlaceholder('Add another response choice...')
                .addOptions([
                  { label: '📥 Block message output', value: 'block_message', emoji: '❌' },
                  { label: '📜 Log to Alert Channels', value: 'log_to_channel', emoji: '🚨' },
                  { label: '⏳ Timeout Offending User Account', value: 'timeout_user', emoji: '🤐' },
                  { label: '🤖 Kick Rogue User/App Profile', value: 'kick_user', emoji: '🔨' }
                ])
            );
      
            const actionButtons = new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId('automod_wizard_finalize_save').setLabel('Finalize & Save Rule Configuration').setStyle(ButtonStyle.Success),
              new ButtonBuilder().setCustomId('automod_wizard_reset_actions').setLabel('Clear Choices').setStyle(ButtonStyle.Secondary)
            );
      
            return interaction.editReply({ embeds: [refreshEmbed], components: [step3SelectMenu, actionButtons] });
          }
      
          if (interaction.customId === 'automod_wizard_reset_actions' && interaction.isButton()) {
            await interaction.deferUpdate();
            session.actions = [];
            return interaction.editReply({ content: '🔄 Choice selection string pools reset successfully.' });
          }
      
          if (interaction.customId === 'automod_wizard_finalize_save' && interaction.isButton()) {
            await interaction.deferUpdate();
            if (session.actions.length === 0) return;
      
            doc.rules.set(session.ruleName.toLowerCase(), {
                ruleName: session.ruleName,
                filterType: session.filterType,
                actions: session.actions,
                extraData: 'Default_Core_Threshold_Profile',
                enabled: true
            });
      
            await doc.save();
            activeWizards.delete(wizardId);
      
            const saveEmbed = new EmbedBuilder()
              .setTitle('✅ AutoMod Rule System Live!')
              .setDescription(`Successfully saved and deployed your custom auto-mod filter rule profile to your server.\n\n• **Moniker Profile Identity:** \`${session.ruleName}\`\n• **Monitored Activity Matrix:** \`${session.filterType.toUpperCase()}\``)
              .setColor('#2ECC71');
      
            return interaction.editReply({ embeds: [saveEmbed], components: [] });
          }
        }
      };
              