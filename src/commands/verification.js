const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    ChannelType 
  } = require('discord.js');
  const mongoose = require('mongoose');
  const database = require('../utils/database'); // Points to your MongoDB client model
  
  // ==========================================
  // 1. EMBEDDED MONGOOSE VERIFICATION SCHEMA
  // ==========================================
  const VerificationSchema = new mongoose.Schema({
      guildId: { type: String, required: true, unique: true },
      enabled: { type: Boolean, default: false },
      securityLevel: { type: String, default: 'low' }, // low, medium, high
      verifiedRoleId: { type: String, default: null },
      panelChannelId: { type: String, default: null }
  });
  const VerificationModel = mongoose.models.VerificationRule || mongoose.model('VerificationRule', VerificationSchema);
  
  // Memory tracking variable array map for wizard configuration sessions
  const activeSetupSessions = new Map();
  
  module.exports = {
    data: new SlashCommandBuilder()
      .setName('verification')
      .setDescription('🛡️ Configure and manage multi-layered server user onboarding verification gates.')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addSubcommand(sub => sub.setName('setup').setDescription('Launch the interactive wizard configuration questionnaire drops'))
      .addSubcommand(sub => sub.setName('edit').setDescription('✏️ Modify an existing verification configuration with a skippable wizard'))
      .addSubcommand(sub => sub.setName('delete').setDescription('🗑️ Safely purge verification records with an absolute safety screen'))
      .addSubcommand(sub => sub.setName('disable').setDescription('🔴 Instantly shut down the lock validation gatekeeper layer')),
    name: 'verification',
  
    async execute(interaction, client) {
      const isInteraction = interaction.isCommand ? interaction.isCommand() : false;
      const guild = interaction.guild;
      const guildId = guild.id;
      const memberExecutor = interaction.member;
  
      if (memberExecutor && !memberExecutor.permissions.has(PermissionFlagsBits.Administrator)) {
        const lockMsg = '❌ **Access Denied:** You need `Administrator` permissions to run verification setups.';
        return isInteraction ? interaction.reply({ content: lockMsg, ephemeral: true }) : interaction.reply(lockMsg);
      }
  
      let subcommand = isInteraction ? interaction.options.getSubcommand() : interaction.options.getString('subcommand')?.toLowerCase();
      const doc = await VerificationModel.findOne({ guildId }).catch(() => null) || new VerificationModel({ guildId });
      const wizardKey = `${guildId}-${interaction.user.id}`;
  
      // ==========================================
      // ⚙️ WIZARD LAUNCH ENGINE: SETUP
      // ==========================================
      if (subcommand === 'setup') {
        if (isInteraction) await interaction.deferReply({ ephemeral: true });
        activeSetupSessions.set(wizardKey, { step: 1, mode: 'setup', securityLevel: 'low', verifiedRoleId: null, panelChannelId: null });
  
        const availableRoles = guild.roles.cache.filter(r => r.id !== guild.roles.everyone.id && !r.managed).first(24);
        if (availableRoles.length === 0) return interaction.reply('❌ This server lacks manually configurable roles. Run `|setup` first.').catch(() => null);
  
        const welcomeEmbed = new EmbedBuilder()
          .setTitle('🛡️ Verification Setup Wizard')
          .setDescription('**Step 1:** Select the target role that users will receive once they pass verification.')
          .setColor('#5865F2');
  
        const selectMenu = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('verify_wizard_step1')
            .setPlaceholder('Choose the member assignment role...')
            .addOptions(availableRoles.map(role => ({ label: role.name.slice(0, 24), value: role.id })))
        );
  
        return isInteraction ? interaction.editReply({ embeds: [welcomeEmbed], components: [selectMenu] }) : interaction.reply({ embeds: [welcomeEmbed], components: [selectMenu] });
      }
    // ==========================================
    // ✏️ WIZARD LAUNCH ENGINE: EDIT
    // ==========================================
    if (subcommand === 'edit') {
        if (!doc.enabled) {
          return interaction.reply({ content: '❌ **Error:** No verification setup was found to edit. Run `/verification setup` first.', ephemeral: true }).catch(() => null);
        }
        if (isInteraction) await interaction.deferReply({ ephemeral: true });
  
        activeSetupSessions.set(wizardKey, { 
          step: 1, 
          mode: 'edit', 
          securityLevel: doc.securityLevel, 
          verifiedRoleId: doc.verifiedRoleId, 
          panelChannelId: doc.panelChannelId 
        });
  
        const availableRoles = guild.roles.cache.filter(r => r.id !== guild.roles.everyone.id && !r.managed).first(24);
        
        const editEmbed = new EmbedBuilder()
          .setTitle('✏️ Edit Verification: Step 1 (Role)')
          .setDescription(`Current Role: <@&${doc.verifiedRoleId}>\n\nSelect a new role from the dropdown menu, or hit the **Skip Item** button to leave it unchanged.`)
          .setColor('#E67E22');
  
        const selectMenu = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('verify_wizard_step1')
            .setPlaceholder('Modify the member assignment role...')
            .addOptions(availableRoles.map(role => ({ label: role.name.slice(0, 24), value: role.id })))
        );
  
        const skipButton = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('verify_wizard_skip_step1').setLabel('Skip This Step').setStyle(ButtonStyle.Secondary)
        );
  
        return isInteraction 
          ? interaction.editReply({ embeds: [editEmbed], components: [selectMenu, skipButton] }) 
          : interaction.reply({ embeds: [editEmbed], components: [selectMenu, skipButton] });
      }
  
      // ==========================================
      // 🗑️ WIZARD LAUNCH ENGINE: DELETE
      // ==========================================
      if (subcommand === 'delete') {
        if (isInteraction) await interaction.deferReply({ ephemeral: true });
  
        const confirmEmbed = new EmbedBuilder()
          .setTitle('⚠️ Absolute Safety Confirmation Check')
          .setDescription(
            `### Are you absolutely sure?\n` +
            `Proceeding will completely erase all verification settings from your MongoDB cluster, turn off the security gate, and drop any active login check panels.\n\n` +
            `🚨 *Note: This operation cannot be reversed.*`
          )
          .setColor('#ED4245');
  
        const buttonsRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('verify_wizard_delete_confirm').setLabel('Yes, Delete Everything').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('verify_wizard_delete_cancel').setLabel('Cancel Operation').setStyle(ButtonStyle.Secondary)
        );
  
        return isInteraction 
          ? interaction.editReply({ embeds: [confirmEmbed], components: [buttonsRow] }) 
          : interaction.reply({ embeds: [confirmEmbed], components: [buttonsRow] });
      }
  
      if (subcommand === 'disable') {
        await VerificationModel.findOneAndUpdate({ guildId }, { $set: { enabled: false } });
        return interaction.reply({ content: '🔴 Onboarding checking layers have been pulled offline.' }).catch(() => null);
      }
    },
    async handleInteraction(interaction) {
        const guild = interaction.guild;
        const guildId = interaction.guildId;
        const userId = interaction.user.id;
        const wizardKey = `${guildId}-${userId}`;
    
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: '❌ Out of operational parameters.', ephemeral: true });
        }
    
        const doc = await VerificationModel.findOne({ guildId }).catch(() => null) || new VerificationModel({ guildId });
        
        if (interaction.customId === 'verify_wizard_delete_confirm') {
          await interaction.deferUpdate();
          await VerificationModel.deleteOne({ guildId });
          return interaction.editReply({ content: '🗑️ **Purge Successful:** Verification settings wiped cleanly out of MongoDB data arrays.', embeds: [], components: [] });
        }
        if (interaction.customId === 'verify_wizard_delete_cancel') {
          await interaction.deferUpdate();
          return interaction.editReply({ content: '✅ Deletion cancelled. Configuration traces remain safe.', embeds: [], components: [] });
        }
    
        const session = activeSetupSessions.get(wizardKey);
        if (!session) return;
    
        // 🔘 STEP 1 PROCESSING: CAPTURED ASSIGNED ROLE OR SKIP
        if ((interaction.customId === 'verify_wizard_step1' && interaction.isStringSelectMenu()) || interaction.customId === 'verify_wizard_skip_step1') {
          await interaction.deferUpdate();
          if (interaction.isStringSelectMenu()) session.verifiedRoleId = interaction.values[0];
          session.step = 2;
    
          const step2Embed = new EmbedBuilder()
            .setTitle(`${session.mode === 'edit' ? '✏️' : '🛡️'} Step 2: Choose Security Level Matrix`)
            .setDescription(
              `Current Level: \`${session.securityLevel.toUpperCase()}\`\n\n` +
              `Pick the strictness of the gatekeeper checks for newly joining profiles:\n\n` +
              `• **🟢 LOW SECURITY (Button Tap):** Cleanest flow. Users simply tap a verification button.\n` +
              `• **🟡 MEDIUM SECURITY (Math Challenge):** Requests users solve a dynamic math equation to pass.\n` +
              `• **🔴 HIGH SECURITY (CAPTCHA Verification):** Spawns complex alpha-numeric string validation gates.`
            )
            .setColor('#E67E22');
    
          const selectMenu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('verify_wizard_step2')
              .setPlaceholder('Choose a security gate strictness...')
              .addOptions([
                { label: 'Low Security (Button Tap)', value: 'low', emoji: '🟢' },
                { label: 'Medium Security (Math Equation)', value: 'medium', emoji: '🟡' },
                { label: 'High Security (CAPTCHA Code)', value: 'high', emoji: '🔴' }
              ])
          );
    
          const comps = [selectMenu];
          if (session.mode === 'edit') {
            comps.push(new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('verify_wizard_skip_step2').setLabel('Skip This Step').setStyle(ButtonStyle.Secondary)));
          }
    
          return interaction.editReply({ embeds: [step2Embed], components: comps });
        }
    
        // 🔘 STEP 2 PROCESSING: CAPTURED SECURITY LAYER CHOICE OR SKIP
        if ((interaction.customId === 'verify_wizard_step2' && interaction.isStringSelectMenu()) || interaction.customId === 'verify_wizard_skip_step2') {
          await interaction.deferUpdate();
          if (interaction.isStringSelectMenu()) session.securityLevel = interaction.values[0];
          session.step = 3;
    
          const targetTextChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).first(24);
          
          const step3Embed = new EmbedBuilder()
            .setTitle(`${session.mode === 'edit' ? '✏️' : '🛡️'} Step 3: Choose Deployment Channel Location`)
            .setDescription(`Current Anchorage Channel: <#${session.panelChannelId}>\n\nSelect a new text channel below to anchor your validation panel layout.`)
            .setColor('#9B59B6');
    
          const selectMenu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('verify_wizard_step3')
              .setPlaceholder('Select anchorage target landing room...')
              .addOptions(targetTextChannels.map(ch => ({ label: `# ${ch.name}`.slice(0, 24), value: ch.id })))
          );
    
          const comps = [selectMenu];
          if (session.mode === 'edit') {
            comps.push(new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('verify_wizard_skip_step3').setLabel('Skip This Step & Finalize').setStyle(ButtonStyle.Secondary)));
          }
    
          return interaction.editReply({ embeds: [step3Embed], components: comps });
        }
    // 🔘 STEP 3 PROCESSING: GENERATE RECONFIGURED PANEL WITH CORRESPONDING LEVEL FLAGS
    if ((interaction.customId === 'verify_wizard_step3' && interaction.isStringSelectMenu()) || interaction.customId === 'verify_wizard_skip_step3') {
        await interaction.deferUpdate();
        if (interaction.isStringSelectMenu()) session.panelChannelId = interaction.values[0];
  
        doc.enabled = true;
        doc.securityLevel = session.securityLevel;
        doc.verifiedRoleId = session.verifiedRoleId;
        doc.panelChannelId = session.panelChannelId;
        await doc.save();
  
        const panelTargetChannel = guild.channels.cache.get(session.panelChannelId);
        if (panelTargetChannel) {
          const levelColor = session.securityLevel === 'low' ? '#2ECC71' : session.securityLevel === 'medium' ? '#F1C40F' : '#E74C3C';
          const levelEmoji = session.securityLevel === 'low' ? '🟢' : session.securityLevel === 'medium' ? '🟡' : '🔴';
  
          const landingEmbed = new EmbedBuilder()
            .setTitle('🔒 Gatekeeper Verification Required')
            .setDescription(
              `### Welcome to ${guild.name}!\n` +
              `To protect our space from bot scripts and automated spam profiles, you must complete entry check authorization workflows before accessing any channels.\n\n` +
              `👉 **Gate Strictness:** ${levelEmoji} \`${session.securityLevel.toUpperCase()} SECURITY\`\n` +
              `Click the green launch button underneath to begin your verification check.`
            )
            .setColor(levelColor);
  
          const launchRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`verify_gate_launch_${session.securityLevel}`)
              .setLabel('Start Entry Verification Check')
              .setEmoji('🛡️')
              .setStyle(ButtonStyle.Success)
          );
          await panelTargetChannel.send({ embeds: [landingEmbed], components: [launchRow] });
        }
  
        activeSetupSessions.delete(wizardKey);
  
        const setupSuccess = new EmbedBuilder()
          .setTitle(`✅ Gatekeeper Setup ${session.mode === 'edit' ? 'Updated' : 'Configured'}!`)
          .setDescription(`• **Target Member Role:** <@&${session.verifiedRoleId}>\n• **Security Level:** \`${session.securityLevel.toUpperCase()}\`\n• **Panel Anchorage Room:** <#${session.panelChannelId}>`)
          .setColor('#2ECC71');
  
        return interaction.editReply({ embeds: [setupSuccess], components: [] });
      }
  
      // ========================================================
      // USER TESTING INTERFACE RUNTIME CONTROLLER HANDLING LOOPS
      // ========================================================
      if (interaction.customId && interaction.customId.startsWith('verify_gate_launch_')) {
        const challengeStyle = interaction.customId.split('_')[3]; // Extract 'low', 'medium', or 'high'
        const configRecord = await VerificationModel.findOne({ guildId }).catch(() => null);
        if (!configRecord || !configRecord.enabled) return interaction.reply({ content: '❌ Entry gate is offline.', ephemeral: true });
        if (interaction.member.roles.cache.has(configRecord.verifiedRoleId)) return interaction.reply({ content: '✅ You have already verified.', ephemeral: true });
  
        // LOW SECURITY: INSTANT BUTTON VERIFICATION CLEARANCE
        if (challengeStyle === 'low') {
           await interaction.member.roles.add(configRecord.verifiedRoleId).catch(() => null);
           return interaction.reply({ content: '🎉 **Verification Passed!** Server channels unblinded.', ephemeral: true });
        }
  
        // MEDIUM SECURITY: MULTIPLE-CHOICE MATH PROMPT CONFIGURATION
        if (challengeStyle === 'medium') {
           const fA = Math.floor(Math.random() * 8) + 4;
           const fB = Math.floor(Math.random() * 7) + 2;
           const answer = fA + fB;
           const optionValues = Array.from(new Set([answer, answer + 2, answer - 1, fA * 2])).sort((a, b) => a - b);
  
           const row = new ActionRowBuilder().addComponents(
             new StringSelectMenuBuilder()
               .setCustomId(`verify_user_solve_medium_${answer}`)
               .setPlaceholder('Select the correct numerical equation result value...')
               .addOptions(optionValues.map(v => ({ label: `Result: ${v}`, value: v.toString() })))
           );
           return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🧮 Math Equation Challenge').setDescription(`Solve this basic formula to prove you are an organic human user:\n\n### What is \`${fA} + ${fB}\`?`).setColor('#F1C40F')], components: [row], ephemeral: true });
        }
  
        // HIGH SECURITY: STRING MATCH ALPHA-NUMERIC CAPTCHA
        if (challengeStyle === 'high') {
           const codes = ['NX7B', 'K9WP', '4Z2Q', 'R6MY', 'L3HV'];
           const selectedCode = codes[Math.floor(Math.random() * codes.length)];
  
           const row = new ActionRowBuilder().addComponents(
             new StringSelectMenuBuilder()
               .setCustomId(`verify_user_solve_high_${selectedCode}`)
               .setPlaceholder('Select matching code configuration...')
               .addOptions(codes.map(c => ({ label: `Code String: ${c}`, value: c })))
           );
           return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🔠 CAPTCHA Code Validation').setDescription(`Select the exact alphanumeric string match character layout shown below:\n\n### Code: \` ${selectedCode} \``).setColor('#E74C3C')], components: [row], ephemeral: true });
        }
      }
  
      // EVALUATE RESPONSE MATCHES FOR MEDIUM AND HIGH CHECKS
      if (interaction.customId && interaction.customId.startsWith('verify_user_solve_')) {
         await interaction.deferUpdate();
         const parsingTokens = interaction.customId.split('_');
         const targetValidationString = parsingTokens[4]; // Extract target answer token
         const userSelectionChoiceInput = interaction.values[0];
  
         const configRecord = await VerificationModel.findOne({ guildId }).catch(() => null);
         if (!configRecord) return;
  
         if (userSelectionChoiceInput === targetValidationString) {
            await interaction.member.roles.add(configRecord.verifiedRoleId).catch(() => null);
            return interaction.followUp({ content: '🎉 **Verification Passed!** Access granted.', ephemeral: true });
         } else {
            return interaction.followUp({ content: '❌ **Verification Failed.** Incorrect selection string value. Please try again.', ephemeral: true });
         }
      }
    }
  };          