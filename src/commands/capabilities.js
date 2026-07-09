const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
  } = require('discord.js');
  
  // ============================================================================
  // FULL CAPABILITY CATALOG
  // A rich, category-based tour of everything the bot can do. Anyone can run it.
  // ============================================================================
  const CATEGORIES = [
    {
      key: 'overview',
      label: 'Overview',
      emoji: '🌟',
      color: '#5865F2',
      title: '🌟 What This Bot Can Do',
      description:
        'A complete server management suite — moderation, leveling, tickets, automod, ' +
        'reaction roles, temporary voice channels, auto responders, fun, and more.\n\n' +
        'Use the dropdown below to explore each area in detail. Every command works with ' +
        'both slash commands (`/`) and the text prefix (`|`).',
      fields: [
        { name: '🛠️ Server Setup', value: 'One-command templated server builds, audit logging, welcome messages.' },
        { name: '🛡️ Moderation', value: 'Warn, mute, kick, ban, automod filters, and full mod logs.' },
        { name: '📈 Engagement', value: 'XP & leveling, leaderboards, reaction roles, ticket support system.' },
        { name: '🔊 Self Voice', value: 'Members spin up their own temporary, fully customizable voice channels.' },
        { name: '💬 Auto Responder', value: 'Automatic replies to custom triggers with dynamic variables.' },
        { name: '🎉 Fun', value: 'Games, memes, jokes, trivia, and social interaction commands.' },
      ],
    },
    {
      key: 'setup',
      label: 'Server Setup',
      emoji: '🛠️',
      color: '#EB459E',
      title: '🛠️ Server Setup & Configuration',
      description: 'Provision and configure your server in seconds.',
      fields: [
        { name: '`/setup <template> [clear]`', value: 'Build a full channel/role layout from templates (gaming, community, study, business, creative, development, finance, roleplay, minimalist, history, geography).' },
        { name: '`/setup-audit`', value: 'Configure which channel receives server audit logs.' },
        { name: '`/mod-logs-toggle`', value: 'Turn background moderation logging on or off.' },
        { name: '`/welcome`', value: 'Configure welcome messages for new members.' },
        { name: '`/clear-channels`', value: 'Mass-delete channels to reset the server layout.' },
        { name: '`/cute <style>`', value: 'Switch the bot\'s text styling (wide, small caps, bubbles).' },
        { name: '`/flavour`', value: 'Manage the bot\'s custom response speech variations.' },
      ],
    },
    {
      key: 'moderation',
      label: 'Moderation',
      emoji: '🛡️',
      color: '#ED4245',
      title: '🛡️ Moderation & Safety',
      description: 'Keep your community safe with a full moderation toolkit.',
      fields: [
        { name: '`/warn` • `/warnings`', value: 'Issue formal warnings and review a member\'s warning history.' },
        { name: '`/mute` • `/unmute`', value: 'Timeout members from chatting, then restore access.' },
        { name: '`/kick` • `/ban` • `/unban`', value: 'Remove or restore members with logged reasons.' },
        { name: '`/automodrule`', value: 'Configure up to 20 automod filters: spam, caps, invites, links, phishing, mass mentions, zalgo, raid defense, and more.' },
        { name: '`/clearroles`', value: 'Strip roles in bulk for cleanup or resets.' },
      ],
    },
    {
      key: 'roles',
      label: 'Roles',
      emoji: '🎭',
      color: '#FEE75C',
      title: '🎭 Role Management',
      description: 'Complete control over your server\'s roles.',
      fields: [
        { name: '`/role user` • `/role remove`', value: 'Add or remove roles from members.' },
        { name: '`/role create` • `/role delete`', value: 'Create and delete roles with custom colors.' },
        { name: '`/role everyone` • `bots` • `humans`', value: 'Mass-assign a role to whole groups.' },
        { name: '`/role color` • `rename` • `hoist` • `mentionable`', value: 'Modify any role property.' },
        { name: '`/role info` • `/role list`', value: 'Inspect the role hierarchy.' },
        { name: '`/autorole`', value: 'Automatically grant a role to members when they join.' },
        { name: '`/reactionroles`', value: 'Build interactive button/reaction role panels.' },
        { name: '`/verification`', value: 'Set up a verification gate for new members.' },
      ],
    },
    {
      key: 'engagement',
      label: 'Engagement',
      emoji: '📈',
      color: '#57F287',
      title: '📈 Leveling, Tickets & Analytics',
      description: 'Grow and support an active community.',
      fields: [
        { name: '`/leveling <on/off>`', value: 'Enable the XP system that rewards chat activity.' },
        { name: '`/rank`', value: 'Check your current level and XP progress.' },
        { name: '`/leaderboard`', value: 'See the top 10 most active members.' },
        { name: '`/ticket create` • `/ticket close`', value: 'Private support rooms members can open and staff can close.' },
        { name: '`/analytics`', value: 'View server activity and growth statistics.' },
        { name: '`/mydata`', value: 'View or manage the data the bot stores about you.' },
      ],
    },
    {
      key: 'selfvoice',
      label: 'Self Voice',
      emoji: '🔊',
      color: '#3498DB',
      title: '🔊 Self Voice — Temporary Voice Channels',
      description: 'Let members create their own on-demand voice channels that clean themselves up.',
      fields: [
        { name: '`/selfvoice create [name] [limit]`', value: 'Anyone (when enabled) creates a temp VC. It auto-deletes in ~10s unless you join, and self-destructs when you leave.' },
        { name: '`/selfvoice setup`', value: 'Staff wizard: category, default limit, grace period, privacy.' },
        { name: '`/selfvoice set <setting> <value>`', value: 'Fine-tune name template, limit, bitrate, grace, privacy, and more.' },
        { name: '`/selfvoice enable` • `disable`', value: 'Staff toggle for the whole module.' },
        { name: 'Owner control panel', value: 'Rename, lock, hide, set limit/bitrate/region, kick, transfer, claim, and delete — all from buttons in your room.' },
      ],
    },
    {
      key: 'autoresponder',
      label: 'Auto Responder',
      emoji: '💬',
      color: '#9B59B6',
      title: '💬 Auto Responder',
      description: 'Automatically reply to custom text triggers with dynamic, variable-rich messages.',
      fields: [
        { name: '`/autoresponder setup`', value: 'Step-by-step wizard to build a responder with live preview.' },
        { name: '`/autoresponder add <trigger> <response>`', value: 'Quickly create a responder.' },
        { name: '`/autoresponder variables`', value: 'See every placeholder ({user}, {server}, {random:a|b}, and many more).' },
        { name: '`/autoresponder list` • `info` • `edit` • `remove` • `toggle` • `test`', value: 'Manage and preview your responders.' },
        { name: 'Match types', value: 'exact, contains, starts/ends with, wildcard, and regex — plus cooldowns, chance rolls, reactions, embeds, and role gating.' },
        { name: '`/autoresponder enable` • `disable`', value: 'Staff toggle for the whole module.' },
      ],
    },
    {
      key: 'fun',
      label: 'Fun',
      emoji: '🎉',
      color: '#F1C40F',
      title: '🎉 Fun & Social',
      description: 'Keep the chat lively.',
      fields: [
        { name: 'Games', value: '`/trivia` `/wouldyourather` `/capital-quiz` `/dice-duel` `/coinflip` `/roll` `/dice` `/8ball`' },
        { name: 'Social', value: '`/hug` `/slap` `/roast` `/rate` `/predict-love`' },
        { name: 'Content', value: '`/joke` `/dadjoke` `/meme` `/fortune` `/spacefact` `/cat` `/dog`' },
        { name: 'Menu', value: '`/fun-menu` to explore, `/fun-module <on/off>` for staff to toggle the whole suite.' },
      ],
    },
  ];
  
  function buildEmbed(cat) {
    const embed = new EmbedBuilder()
      .setColor(cat.color)
      .setTitle(cat.title)
      .setDescription(cat.description)
      .setFooter({ text: 'Use the menu to browse • Slash (/) and prefix (|) both work' })
      .setTimestamp();
    for (const f of cat.fields) embed.addFields({ name: f.name, value: f.value });
    return embed;
  }
  
  function buildMenu(activeKey) {
    return new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('capabilities_select')
        .setPlaceholder('📚 Browse a category…')
        .addOptions(CATEGORIES.map(c => ({
          label: c.label,
          value: c.key,
          emoji: c.emoji,
          default: c.key === activeKey,
        }))),
    );
  }
  
  module.exports = {
    data: new SlashCommandBuilder()
      .setName('capabilities')
      .setDescription('A full, detailed tour of everything the bot can do.'),
    name: 'capabilities',
  
    async execute(interaction, client) {
      const isInteraction = typeof interaction.isChatInputCommand === 'function' ? interaction.isChatInputCommand() : false;
  
      const first = CATEGORIES[0];
      const payload = { embeds: [buildEmbed(first)], components: [buildMenu(first.key)] };
  
      let response;
      if (isInteraction) {
        response = await interaction.reply({ ...payload, fetchReply: true }).catch(() => null);
      } else {
        response = await interaction.reply({ ...payload, fetchReply: true }).catch(() => null);
      }
      if (!response) return;
  
      const authorId = isInteraction ? interaction.user.id : interaction.author.id;
  
      const collector = response.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        time: 120000,
      });
  
      collector.on('collect', async (sel) => {
        if (sel.user.id !== authorId) {
          return sel.reply({ content: '❌ Run `/capabilities` yourself to browse!', ephemeral: true }).catch(() => null);
        }
        const cat = CATEGORIES.find(c => c.key === sel.values[0]) || CATEGORIES[0];
        await sel.update({ embeds: [buildEmbed(cat)], components: [buildMenu(cat.key)] }).catch(() => null);
      });
  
      collector.on('end', () => {
        const disabled = buildMenu('none');
        disabled.components[0].setDisabled(true);
        if (isInteraction) interaction.editReply({ components: [disabled] }).catch(() => null);
        else response.edit({ components: [disabled] }).catch(() => null);
      });
    },
  };
  