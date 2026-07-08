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
  const database = require('../utils/database'); // Points to your MongoDB model connection
  
  // ==========================================
  // 1. EMBEDDED MONGOOSE VERIFICATION SCHEMA
  // ==========================================
  const VerificationSchema = new mongoose.Schema({
      guildId: { type: String, required: true, unique: true },
      enabled: { type: Boolean, default: false },
      securityLevel: { type: String, default: 'low' }, // low, medium, high
      challengeMethod: { type: String, default: 'button' }, // specific challenge type
      verifiedRoleId: { type: String, default: null },
      panelChannelId: { type: String, default: null }
  });
  const VerificationModel = mongoose.models.VerificationRule || mongoose.model('VerificationRule', VerificationSchema);
  
  // Memory tracking variable map for active wizard configuration sessions
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
        activeSetupSessions.set(wizardKey, { step: 1, mode: 'setup', securityLevel: 'low', challengeMethod: 'button', verifiedRoleId: null, panelChannelId: null });
  
        const availableRoles = guild.roles.cache.filter(r => r.id !== guild.roles.everyone.id && !r.managed).first(24);
        if (availableRoles.length === 0) return interaction.reply('❌ This server lacks manually configurable roles. Run `|setup` first.').catch(() => null);
  
        const welcomeEmbed = new EmbedBuilder()
          .setTitle('🛡️ Verification Setup Wizard')
          .setDescription('**Step 1:** Select the target member role that users will receive once they pass verification.')
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
          challengeMethod: doc.challengeMethod,
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
      // 🗑️ WIZARD LAUNCH ENGINE: DELETE & DISABLE
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
   // ========================================================
  // 🔘 WIZARD INTERACTIVE SELECTION MENU HANDLING CONTROLLER
  // ========================================================
  async handleInteraction(interaction) {
    const guild = interaction.guild;
    const guildId = interaction.guildId;
    const userId = interaction.user.id;
    const wizardKey = `${guildId}-${userId}`;

    if (interaction.customId === 'verify_wizard_delete_confirm') {
      await interaction.deferUpdate().catch(() => null);
      await VerificationModel.deleteOne({ guildId }).catch(() => null);
      return interaction.editReply({ content: '🗑️ **Purge Successful:** Verification settings wiped cleanly out of MongoDB data arrays.', embeds: [], components: [] });
    }
    if (interaction.customId === 'verify_wizard_delete_cancel') {
      await interaction.deferUpdate().catch(() => null);
      return interaction.editReply({ content: '✅ Deletion cancelled. Configuration traces remain safe.', embeds: [], components: [] });
    }

    const session = activeSetupSessions.get(wizardKey);
    if (!session) return; 

    // 🔘 STEP 1 SUBMISSION: CHOOSE ASSIGNED ROLE
    if ((interaction.customId === 'verify_wizard_step1' && interaction.isStringSelectMenu()) || interaction.customId === 'verify_wizard_skip_step1') {
      await interaction.deferUpdate().catch(() => null);
      if (interaction.isStringSelectMenu()) session.verifiedRoleId = interaction.values[0]; 
      session.step = 2;

      const step2Embed = new EmbedBuilder()
        .setTitle(`${session.mode === 'edit' ? '✏️' : '🛡️'} Step 2: Select Challenge Security Level`)
        .setDescription(
          `**Current Role Target:** <@&${session.verifiedRoleId}>\n\n` +
          `Choose the security level and specific challenge model you want to deploy to incoming servers users:\n\n` +
          `**🟢 LOW SECURITY**\n` +
          `• \`button\` - Simple minimalist click confirmation rule layer.\n` +
          `• \`terms\` - User must view and agree to terms via an accept button.\n\n` +
          `**🟡 MEDIUM SECURITY**\n` +
          `• \`math\` - Standard addition formula verification calculations.\n` +
          `• \`colors\` - Select the matching color layout out of random arrays.\n` +
          `• \`odd_one\` - Identify the unique emoji item icon variant.\n\n` +
          `**🔴 HIGH SECURITY**\n` +
          `• \`captcha\` - Random alpha-numeric code tracking input arrays.\n` +
          `• \`reverse_text\` - Spell a randomly provided word code backwards.\n` +
          `• \`double_auth\` - Complete a combined math check AND a code check.`
        )
        .setColor('#E67E22');

      const selectMenu = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('verify_wizard_step2')
          .setPlaceholder('Choose a specific security verification style...')
          .addOptions([
            { label: 'Low: Simple Button Click', value: 'low_button', emoji: '🟢' },
            { label: 'Low: Accept Rules Agreement', value: 'low_terms', emoji: '📜' },
            { label: 'Medium: Math Equation Core', value: 'medium_math', emoji: '🧮' },
            { label: 'Medium: Color Matching Matrix', value: 'medium_colors', emoji: '🎨' },
            { label: 'Medium: Emoji Odd-One-Out', value: 'medium_odd_one', emoji: '🧩' },
            { label: 'High: Alphanumeric CAPTCHA Code', value: 'high_captcha', emoji: '🔴' },
            { label: 'High: Reverse Text Spelling', value: 'high_reverse_text', emoji: '🔄' },
            { label: 'High: Double Authentication Gate', value: 'high_double_auth', emoji: '🔒' }
          ])
      );

      const comps = [selectMenu];
      if (session.mode === 'edit') {
        comps.push(new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('verify_wizard_skip_step2').setLabel('Skip This Step').setStyle(ButtonStyle.Secondary)));
      }

      return interaction.editReply({ embeds: [step2Embed], components: comps });
    }

    // 🔘 STEP 2 SUBMISSION: CAPTURED SECURITY LAYER CHOICE
    if ((interaction.customId === 'verify_wizard_step2' && interaction.isStringSelectMenu()) || interaction.customId === 'verify_wizard_skip_step2') {
      await interaction.deferUpdate().catch(() => null);
      if (interaction.isStringSelectMenu()) {
        const parsedParts = interaction.values[0].split('_'); 
        session.securityLevel = parsedParts[0]; 
        session.challengeMethod = parsedParts.slice(1).join('_'); 
      }
      session.step = 3;

      const targetTextChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).first(24);
      
      const step3Embed = new EmbedBuilder()
        .setTitle(`${session.mode === 'edit' ? '✏️' : '🛡️'} Step 3: Choose Deployment Channel Location`)
        .setDescription(`Current Anchorage Channel: <#${session.panelChannelId || interaction.channelId}>\n\nSelect a text channel below to drop your persistent validation panel layout.`)
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

    // 🔘 STEP 3 SUBMISSION: GENERATE PERSISTENT LANDING PANEL AND COMMIT TO MONGO
    if ((interaction.customId === 'verify_wizard_step3' && interaction.isStringSelectMenu()) || interaction.customId === 'verify_wizard_skip_step3') {
      await interaction.deferUpdate().catch(() => null);
      if (interaction.isStringSelectMenu()) session.panelChannelId = interaction.values[0]; 

      doc.enabled = true;
      doc.securityLevel = session.securityLevel;
      doc.challengeMethod = session.challengeMethod;
      doc.verifiedRoleId = session.verifiedRoleId;
      doc.panelChannelId = session.panelChannelId || interaction.channelId;
      await doc.save();

      const targetChannelIdString = String(doc.panelChannelId);
      const panelTargetChannel = guild.channels.cache.get(targetChannelIdString) || await guild.channels.fetch(targetChannelIdString).catch(() => null);
      
      if (panelTargetChannel) {
        const lvlColor = doc.securityLevel === 'low' ? '#2ECC71' : doc.securityLevel === 'medium' ? '#F1C40F' : '#E74C3C';
        const lvlEmoji = doc.securityLevel === 'low' ? '🟢' : doc.securityLevel === 'medium' ? '🟡' : '🔴';

        const landingEmbed = new EmbedBuilder()
          .setTitle('🔒 Gatekeeper Verification Center')
          .setDescription(
            `### Welcome to ${guild.name}!\n` +
            `To safely unlock access lanes and drop initial server onboarding blind restrictions, you must complete entry check authorization workflows.\n\n` +
            `👉 **Gate Strictness:** ${lvlEmoji} \`${doc.securityLevel.toUpperCase()} SECURITY\`\n` +
            `👉 **Challenge Protocol:** \`${doc.challengeMethod.toUpperCase().replace('_', ' ')}\` loops.\n\n` +
            `Click the green launch button underneath to verify your profile.`
          )
          .setColor(lvlColor);

        const launchRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`verify_gate_launch_${doc.securityLevel}_${doc.challengeMethod}`)
            .setLabel('Start Entry Verification Check')
            .setEmoji('🛡️')
            .setStyle(ButtonStyle.Success)
        );
        await panelTargetChannel.send({ embeds: [landingEmbed], components: [launchRow] }).catch(() => null);
      }

      activeSetupSessions.delete(wizardKey);

      const setupSuccess = new EmbedBuilder()
        .setTitle(`✅ Gatekeeper Setup ${session.mode === 'edit' ? 'Updated' : 'Configured'}!`)
        .setDescription(`• **Target Member Role:** <@&${session.verifiedRoleId}>\n• **Security Class:** \`${session.securityLevel.toUpperCase()}\`\n• **Method Layer:** \`${session.challengeMethod.toUpperCase()}\`\n• **Anchorage Room:** <#${doc.panelChannelId}>`)
        .setColor('#2ECC71');

      return interaction.editReply({ embeds: [setupSuccess], components: [] });
    }
    // ========================================================
    // USER INTERACTION GATE: DYNAMIC CHALLENGE ACTIONS LOOP
    // ========================================================
    if (interaction.customId && interaction.customId.startsWith('verify_gate_launch_')) {
        const parts = interaction.customId.split('_');
        const sLevel = parts[3]; 
        const cMethod = parts.slice(4).join('_'); 
  
        const configRecord = await VerificationModel.findOne({ guildId }).catch(() => null);
        if (!configRecord || !configRecord.enabled) {
          return interaction.reply({ content: '❌ Entry gate validation systems are currently offline.', ephemeral: true }).catch(() => null);
        }
        if (interaction.member.roles.cache.has(configRecord.verifiedRoleId)) {
          return interaction.reply({ content: '✅ **Verification Check Cleared:** You already hold member roles.', ephemeral: true }).catch(() => null);
        }
  
        // --- 🟢 LOW SECURITY CHALLENGE CHANNELS ---
        if (sLevel === 'low' && cMethod === 'button') {
          await interaction.member.roles.add(configRecord.verifiedRoleId).catch(() => null);
          return interaction.reply({ content: '🎉 **Verification Passed!** Initial server blind layers unblinded. Welcome inside!', ephemeral: true }).catch(() => null);
        }
  
        if (sLevel === 'low' && cMethod === 'terms') {
          const termsEmbed = new EmbedBuilder()
            .setTitle('📜 Community Guidelines Agreement')
            .setDescription('By checking accept, you agree to respect server room boundaries, treat server members with dignity, and follow admin rules inside this space.')
            .setColor('#2ECC71');
          const termsRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`verify_user_solve_low_terms_accept`).setLabel('I Accept These Guidelines').setStyle(ButtonStyle.Success)
          );
          return interaction.reply({ embeds: [termsEmbed], components: [termsRow], ephemeral: true }).catch(() => null);
        }
  
        // --- 🟡 MEDIUM SECURITY CHALLENGE CHANNELS ---
        if (sLevel === 'medium' && cMethod === 'math') {
          const fA = Math.floor(Math.random() * 8) + 4;
          const fB = Math.floor(Math.random() * 7) + 2;
          const answer = fA + fB;
          const optionValues = Array.from(new Set([answer, answer + 2, answer - 1, fA * 2])).sort((a, b) => a - b);
  
          const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId(`verify_user_solve_medium_math_${answer}`)
              .setPlaceholder('Select result calculation...')
              .addOptions(optionValues.map(v => ({ label: `Result: ${v}`, value: v.toString() })))
          );
          return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🧮 Math Verification').setDescription(`Solve this basic formula to prove you are an organic human user:\n\n### What is \`${fA} + ${fB}\`?`).setColor('#F1C40F')], components: [row], ephemeral: true }).catch(() => null);
        }
  
        if (sLevel === 'medium' && cMethod === 'colors') {
          const colorsList = ['Red', 'Blue', 'Green', 'Yellow'];
          const targetColor = colorsList[Math.floor(Math.random() * colorsList.length)];
          const colorRow = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId(`verify_user_solve_medium_colors_${targetColor}`)
              .setPlaceholder('Pick the requested text color name...')
              .addOptions(colorsList.map(c => ({ label: `Color: ${c}`, value: c })))
          );
          return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🎨 Color Matrix Check').setDescription(`Click the dropdown selection mapping row that explicitly reads: **${targetColor.toUpperCase()}**`).setColor('#F1C40F')], components: [colorRow], ephemeral: true }).catch(() => null);
        }
  
        if (sLevel === 'medium' && cMethod === 'odd_one') {
          const items = ['🍎', '🍏', '🍐', '🍊'];
          const targetIcon = '🍊'; 
          const oddRow = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId(`verify_user_solve_medium_oddone_${targetIcon}`)
              .setPlaceholder('Identify the odd icon item out...')
              .addOptions(items.map(i => ({ label: `Icon Selection Item: ${i}`, value: i })))
          );
          return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🧩 Odd-One-Out Puzzle').setDescription('One item option inside the dropdown listing array has a completely different asset fruit type. Identify it: \n\n` 🍎  |  🍏  |  Automated  |  🍊 `').setColor('#F1C40F')], components: [oddRow], ephemeral: true }).catch(() => null);
        }
  
        // --- 🔴 HIGH SECURITY CHALLENGE CHANNELS ---
        if (sLevel === 'high' && cMethod === 'captcha') {
          const codes = ['NX7B', 'K9WP', '4Z2Q', 'R6MY', 'L3HV'];
          const code = codes[Math.floor(Math.random() * codes.length)];
          const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId(`verify_user_solve_high_captcha_${code}`)
              .setPlaceholder('Select exact alphanumeric code match...')
              .addOptions(codes.map(c => ({ label: `Code Verification Match: ${c}`, value: c })))
          );
          return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🔠 CAPTCHA Challenge').setDescription(`Select the exact alpha-numeric value string match array: \n\n### Code: \` ${code} \``).setColor('#E74C3C')], components: [row], ephemeral: true }).catch(() => null);
        }
  
        if (sLevel === 'high' && cMethod === 'reverse_text') {
          const wordsList = ['SERVER', 'MISER', 'GUARD', 'SHIELD', 'FORGE'];
          const selectedWord = wordsList[Math.floor(Math.random() * wordsList.length)];
          const reversedAnswer = selectedWord.split('').reverse().join('');
          
          const reverseRow = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId(`verify_user_solve_high_reverse_${reversedAnswer}`)
              .setPlaceholder('Spell the provided word reversed backwards...')
              .addOptions(wordsList.map(w => ({ label: `Spelling Reverse: ${w.split('').reverse().join('')}`, value: w.split('').reverse().join('') })))
          );
          return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🔄 Reverse Spelling Challenge').setDescription(`Look closely at the token word text: **\`${selectedWord}\`**\nSelect the option row that spells it perfectly backwards.`).setColor('#E74C3C')], components: [reverseRow], ephemeral: true }).catch(() => null);
        }
  
        if (sLevel === 'high' && cMethod === 'double_auth') {
          const factorA = Math.floor(Math.random() * 4) + 5; 
          const factorB = Math.floor(Math.random() * 3) + 2; 
          const sum = factorA + factorB;
          const securityTokens = ['9WXP', '2Q7Z', '4M1L'];
          const token = securityTokens[Math.floor(Math.random() * securityTokens.length)];
          const compoundKey = `${sum}-${token}`;
  
          const doubleRow = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('verify_user_solve_high_double_choice')
              .setPlaceholder('Select the matching unified formula result token...')
              .addOptions([
                { label: `Compound Token: ${sum} | Code: ${token}`, value: compoundKey },
                { label: `Compound Token: ${sum + 1} | Code: ${token}`, value: `${sum + 1}-${token}` },
                { label: `Compound Token: ${sum} | Code: 9WXP`, value: `${sum}-9WXP` }
              ])
          );
          return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🔒 Combined Double Authentication Gate').setDescription(`Complete both analytical checkpoints simultaneously:\n\n1. What is \`${factorA} + ${factorB}\`?\n2. Match this Code: \`${token}\``).setColor('#E74C3C')], components: [doubleRow], ephemeral: true }).catch(() => null);
        }
      }
  
      // ==========================================
      // 🔘 ANSWER SUBMISSION PROCESSING CIRCUITS
      // ==========================================
      if (interaction.customId && interaction.customId.startsWith('verify_user_solve_')) {
         await interaction.deferUpdate().catch(() => null);
         
         const parsingTokens = interaction.customId.split('_');
         const isLowTerms = parsingTokens[3] === 'low' && parsingTokens[4] === 'terms';
         const isDoubleAuth = parsingTokens[3] === 'high' && parsingTokens[4] === 'double';
         
         const targetValidationString = isLowTerms ? 'accept' : isDoubleAuth ? interaction.values[0] : parsingTokens[parsingTokens.length - 1];
         const userSelectionChoiceInput = isLowTerms ? 'accept' : interaction.values[0]; 
  
         const configRecord = await VerificationModel.findOne({ guildId }).catch(() => null);
         if (!configRecord) return;
  
         if (userSelectionChoiceInput === targetValidationString) {
            await interaction.member.roles.add(configRecord.verifiedRoleId).catch(() => null);
            return interaction.followUp({ content: '🎉 **Verification Passed!** Initial server blind restrictions dropped successfully. Welcome inside!', ephemeral: true }).catch(() => null);
         } else {
            return interaction.followUp({ content: '❌ **Verification Failed.** Your choice input does not match the target validation check rules. Please click the panel check button to try again.', ephemeral: true }).catch(() => null);
         }
      }
    }
  };
  