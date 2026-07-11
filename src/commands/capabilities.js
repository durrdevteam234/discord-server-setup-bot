const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
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
      'reaction roles, temporary voice channels, auto responders, starboard, suggestions, ' +
      'giveaways, embeds, birthdays, invite tracking, analytics, fun, and more.\n\n' +
      'Use the dropdown below to explore each area in detail. Every command works with ' +
      'both slash commands (`/`) and the text prefix (`|`).',
    fields: [
      { name: '🛠️ Server Setup', value: 'One-command templated server builds, audit logging, welcome/leave messages.' },
      { name: '🛡️ Moderation', value: 'Warn, mute, kick, ban, automod filters, and full mod logs.' },
      { name: '📈 Engagement', value: 'XP & leveling, leaderboards, tickets, suggestions, giveaways, analytics counters.' },
      { name: '🔊 Self Voice', value: 'Members spin up their own temporary, fully customizable voice channels.' },
      { name: '💬 Auto Responder', value: 'Automatic replies to custom triggers with dynamic variables.' },
      { name: '⭐ Starboard', value: 'Highlight popular messages once they hit a reaction threshold.' },
      { name: '🎂 Birthdays & 📨 Invites', value: 'Track member birthdays and who invited whom.' },
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
      { name: '`/welcome <#channel> <enabled> [join_message] [leave_message] [embed]`', value: 'Configure custom join/leave messages, with variables `{user}` `{server}` `{memberCount}`.' },
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
      { name: '`/autorole`', value: 'Automatically grant a role to members (and a separate role to bots) when they join.' },
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
      { name: '`/leveling <on/off>`', value: 'Enable the XP system that rewards chat activity, with an optional dedicated level-up announcement channel.' },
      { name: '`/rank`', value: 'Check your current level and XP progress.' },
      { name: '`/leaderboard`', value: 'See the top 10 most active members.' },
      { name: '`/ticket create` • `/ticket close`', value: 'Private support rooms members can open and staff can close.' },
      { name: '`/analytics`', value: 'Live auto-updating stat channels — member count, human/bot counts, boost count, or role count.' },
      { name: '`/suggestions`', value: 'A suggestion box with upvote/downvote buttons and a staff approval workflow.' },
      { name: '`/giveaway`', value: 'Run timed giveaways with an entry button and automatic winner selection.' },
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
      { name: '`/selfvoice create [name] [limit]`', value: 'Anyone (when enabled) creates a temp VC. It auto-deletes in ~10s unless you join, and self-destructs when you leave or the room is empty.' },
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
      { name: 'Match types', value: 'exact, contains, starts/ends with, wildcard, and regex — plus cooldowns, chance rolls, reactions, embeds, delete-trigger, DM/channel/reply modes, and role gating.' },
      { name: '`/autoresponder enable` • `disable`', value: 'Staff toggle for the whole module.' },
    ],
  },
  {
    key: 'community',
    label: 'Community Tools',
    emoji: '⭐',
    color: '#F47FFF',
    title: '⭐ Starboard, Birthdays & Invite Tracking',
    description: 'Extra tools that keep a community engaged and organized.',
    fields: [
      { name: '`/starboard`', value: 'Automatically repost popular messages to a starboard channel once they reach a reaction threshold.' },
      { name: '`/birthdays`', value: 'A wizard for members to register their birthday and get a shout-out on the day.' },
      { name: '`/invites`', value: 'Track who invited whom, with a setup wizard and per-member invite counts on join/leave.' },
      { name: '`/embed`', value: 'A guided embed builder with live preview buttons and modals — post custom rich embeds anywhere.' },
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

function buildMenu(activeKey, disabled = false) {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('capabilities_select')
      .setPlaceholder('📚 Browse a category…')
      .setDisabled(disabled)
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

    // NOTE: discord.js v14 removed the `fetchReply` option on
    // interaction.reply()/message.reply(). Passing it silently does
    // nothing, so `response` used to come back undefined and every
    // call below (createMessageComponentCollector, editReply, etc.)
    // was blowing up inside a swallowed .catch(() => null) — which is
    // why the dropdown never advanced past the first page.
    let response;
    if (isInteraction) {
      await interaction.reply(payload).catch(() => null);
      response = await interaction.fetchReply().catch(() => null);
    } else {
      response = await interaction.reply(payload).catch(() => null);
    }
    if (!response) return;

    const authorId = isInteraction ? interaction.user.id : interaction.author.id;

    // interactionCreate.js intercepts `capabilities_select` interactions
    // globally and routes them to this module's handleInteraction (see
    // below) before they'd ever reach a per-message collector, so this
    // component collector acts purely as a local safety net / timeout.
    const collector = response.createMessageComponentCollector({
      filter: (i) => i.customId === 'capabilities_select',
      time: 120000,
    });

    collector.on('collect', async (sel) => {
      if (sel.user.id !== authorId) {
        return sel.reply({ content: '❌ Run `/capabilities` yourself to browse!', ephemeral: true }).catch(() => null);
      }
      const cat = CATEGORIES.find(c => c.key === sel.values[0]) || CATEGORIES[0];
      await sel.update({ embeds: [buildEmbed(cat)], components: [buildMenu(cat.key)] }).catch(() => null);
    });

    collector.on('end', async () => {
      const lastKey = collector.lastCollectedKey || first.key;
      const disabledRow = buildMenu(lastKey, true);
      if (isInteraction) await interaction.editReply({ components: [disabledRow] }).catch(() => null);
      else await response.edit({ components: [disabledRow] }).catch(() => null);
    });
  },

  // ========================================================
  // Called by interactionCreate.js for every `capabilities_select`
  // component interaction. This was previously missing entirely,
  // which meant every dropdown click fell through to
  // `interaction.deferUpdate()` in interactionCreate.js and the menu
  // never actually changed pages.
  // ========================================================
  async handleInteraction(interaction, client) {
    if (!interaction.isStringSelectMenu || !interaction.isStringSelectMenu()) {
      return interaction.deferUpdate?.().catch(() => null);
    }
    const cat = CATEGORIES.find(c => c.key === interaction.values[0]) || CATEGORIES[0];
    await interaction.update({ embeds: [buildEmbed(cat)], components: [buildMenu(cat.key)] }).catch(() => null);
  },
};