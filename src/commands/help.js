const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('View the full list of available bot commands across pages.'),
  name: 'help',

  async execute(interaction, client) {
    // Detect if this is a slash interaction or a traditional text/prefix message
    const isInteraction = interaction.isChatInputCommand ? interaction.isChatInputCommand() : (interaction.options && !interaction.isMock ? true : false);

    if (isInteraction) {
      await interaction.deferReply().catch(() => null);
    }

    const prefixText = "💡 Prefer text shortcuts? You can also trigger these commands using the prefix: |";

    // =========================================================
    // PAGE 1: USER COMMANDS (CORE + FUN SUMMARY)
    // =========================================================
    const userCommandsPart1 = 
      "`/help` - View this interactive multi-page help directory menu.\n" +
      "`/purpose` - Learn about the bot and view its official profile picture.\n" +
      "`/rank` - Check your personal server level and current XP progress.\n" +
      "`/leaderboard` - View top 10 users ranked by level experience.\n" +
      "`/ticket create` - Open a secure, private assistance room for help.\n" +
      "`/fun-menu` - Explore what the Fun Module is and view its options.\n" +
      "`/joke` / `/dadjoke` - Get a clean, funny random joke.\n" +
      "`/fortune` - Reveals a mystical prediction about your future.\n" +
      "`/spacefact` - Get a mind-blowing cosmic planetary space fact.\n" +
      "`/cat` / `/dog` - Fetch an optimized random animated animal picture.\n" +
      "`/trivia` - Spits out a random brain-teaser trivia question.";

    // =========================================================
    // PAGE 2: USER COMMANDS (FUN INTERACTIONS CONT.)
    // =========================================================
    const userCommandsPart2 =
      "`/wouldyourather` - Presents an impossible split decision puzzle.\n" +
      "`/capital-quiz` - Tests your geographic knowledge of world capitals.\n" +
      "`/hug <user>` - Give a member a warm, fuzzy virtual hug.\n" +
      "`/slap <user>` - Slap another user with a giant yellow trout.\n" +
      "`/dice-duel <opponent>` - Challenge another user to a dice duel.\n" +
      "`/predict-love <a, b>` - Calculate compatibility percentage.\n" +
      "`/coinflip` / `/roll` / `/dice` - Run probability rolling games.\n" +
      "`/roast <user>` - Fire off a lighthearted, witty burn at a friend.\n" +
      "`/rate <item>` - Let the bot assess any object from 1 to 10.\n" +
      "`/meme` - Spits out a random funny, relatable lifestyle meme.";

    // =========================================================
    // PAGE 3: STAFF COMMANDS (UTILITIES & UTILITY SWITCHES)
    // =========================================================
    const staffCommandsPart1 =
      "`/cute <style>` - Change font layout display display options.\n" +
      "`/setup <template> [clear]` - Run server template builder layouts.\n" +
      "`/setup-audit` - Configure the server log recording channels.\n" +
      "`/mod-logs-toggle` - Enable or disable background moderation logs.\n" +
      "`/leveling <on/off>` - Enable or disable the XP tracking loops.\n" +
      "`/fun-module <on/off>` - Turn the server fun suite globally on or off.\n" +
      "`/ticket close` - Permanently lock and archive an active support ticket.\n" +
      "`/flavour` - View or manage custom bot response speech variations.\n" +
      "`/clear-channels` - Mass delete and purge chat layers quickly.";

    // =========================================================
    // PAGE 4: STAFF COMMANDS (ROLES, MODERATION & REACTION ROLES)
    // =========================================================
    const staffCommandsPart2 =
      "`/role user <member> <role>` — Add a specific role assignment.\n" +
      "`/role remove <member> <role>` — Remove a role from a member.\n" +
      "`/role create <name> [color]` — Build a new custom server role.\n" +
      "`/role delete <role>` — Discard an old role folder from the list.\n" +
      "`/role everyone/bots/humans` — Mass-assign roles directly to targets.\n" +
      "`/role info/list [role]` — View server role directory hierarchies.\n" +
      "`/role color/rename/hoist/mentionable` — Modify individual properties.\n" +
      "`/warn <user> <reason>` - Formally warn a problematic member.\n" +
      "`/warnings [user]` - View the moderation infraction warning logs.\n" +
      "`/mute <user> [reason]` - Mute a user from channels and text rooms.\n" +
      "`/unmute <user>` - Restore standard text and voice privileges.\n" +
      "`/kick <user> [reason]` - Kick a problematic member from the guild.\n" +
      "`/ban <user> [reason]` - Hard ban a malicious member from the server.\n" +
      "`/unban <username> [reason]` - Revoke a server ban using their unique username.\n" +
      "`/reactionroles <subcommand>` - Deploy, edit, or test custom button/dropdown role panels.";

    // =========================================================
    // EMBED LAYOUT BUILDER BLOCKS
    // =========================================================
    const embedPage1 = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('📚 Help Menu — Page 1/4 (User Commands)')
      .setDescription('Use the action row buttons below to browse instructions.')
      .addFields({ name: '👤 Public User Utilities', value: userCommandsPart1 })
      .setFooter({ text: prefixText })
      .setTimestamp();

    const embedPage2 = new EmbedBuilder()
      .setColor('#FF69B4')
      .setTitle('📚 Help Menu — Page 2/4 (User Commands Cont.)')
      .setDescription('Use the action row buttons below to browse instructions.')
      .addFields({ name: '🎭 Interactive & Whimsical Modules', value: userCommandsPart2 })
      .setFooter({ text: prefixText })
      .setTimestamp();

    const embedPage3 = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('🛡️ Help Menu — Page 3/4 (Staff Commands)')
      .setDescription('Administrative template controls and status toggle options.')
      .addFields({ name: '⚙️ Configuration & Setup Controls', value: staffCommandsPart1 })
      .setFooter({ text: prefixText })
      .setTimestamp();

    const embedPage4 = new EmbedBuilder()
      .setColor('#E74C3C')
      .setTitle('🛡️ Help Menu — Page 4/4 (Staff Commands Cont.)')
      .setDescription('Advanced utility structures to manage roles, users, and panels quickly.')
      .addFields({ name: '🔒 Server Security & Role Administration', value: staffCommandsPart2 })
      .setFooter({ text: prefixText })
      .setTimestamp();

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('help_page1').setLabel('Page 1 (User)').setStyle(ButtonStyle.Primary).setDisabled(true),
      new ButtonBuilder().setCustomId('help_page2').setLabel('Page 2 (User)').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('help_page3').setLabel('Page 3 (Staff)').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('help_page4').setLabel('Page 4 (Staff)').setStyle(ButtonStyle.Secondary)
    );

    // Send using the right method depending on if it's an interaction or a message
    const response = isInteraction 
      ? await interaction.editReply({ embeds: [embedPage1], components: [buttons] }).catch(() => null)
      : await interaction.reply({ embeds: [embedPage1], components: [buttons], fetchReply: true }).catch(() => null);

    if (!response) return;

    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 90000
    });

    collector.on('collect', async (btnInteraction) => {
      // Correctly get author ID based on command type
      const authorId = isInteraction ? interaction.user.id : interaction.author.id;
      if (btnInteraction.user.id !== authorId) {
        return btnInteraction.reply({ content: '❌ Run the command yourself to flip pages!', ephemeral: true }).catch(() => null);
      }

      buttons.components.forEach(btn => btn.setDisabled(false));

      if (btnInteraction.customId === 'help_page1') {
        buttons.components[0].setDisabled(true);
        await btnInteraction.update({ embeds: [embedPage1], components: [buttons] }).catch(() => null);
      } else if (btnInteraction.customId === 'help_page2') {
        buttons.components[1].setDisabled(true);
        await btnInteraction.update({ embeds: [embedPage2], components: [buttons] }).catch(() => null);
      } else if (btnInteraction.customId === 'help_page3') {
        buttons.components[2].setDisabled(true);
        await btnInteraction.update({ embeds: [embedPage3], components: [buttons] }).catch(() => null);
      } else if (btnInteraction.customId === 'help_page4') {
        buttons.components[3].setDisabled(true);
        await btnInteraction.update({ embeds: [embedPage4], components: [buttons] }).catch(() => null);
      }
    });

    collector.on('end', () => {
      buttons.components.forEach(btn => btn.setDisabled(true));
      if (isInteraction) {
        interaction.editReply({ components: [buttons] }).catch(() => null);
      } else {
        response.edit({ components: [buttons] }).catch(() => null);
      }
    });
  }
};