const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  ChannelType,
} = require('discord.js');

// ============================================================================
// PREMIUM INFO & SALES COMMAND  +  BACKGROUND PROMO SWEEPER
// ServerMiser Premium is a companion bot that joins alongside this one once
// a server is authorized via Whop. It unlocks AI persona chat, cross-server
// phone calls, and the full Hoard economy/casino system, on top of
// everything the free bot already offers.
//
// This file does two things:
//   1. /premium about|info — the existing sales command members can run.
//   2. A quiet background sweeper (init(client) + setInterval, same pattern
//      as autodelete.js's sweeper) that occasionally drops a promo embed
//      into an active server on its own — NOT a command, nothing to
//      enable/disable/configure. index.js's command loader already calls
//      `command.init(client)` on anything it loads that has one, so
//      bundling the sweeper in here needs no other file to change.
// ============================================================================

const WHOP_URL = 'https://whop.com/servermiser/servermiser-premium';
const ACCENT_COLOR = '#F47FFF';

function buyButtonRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('✨ Buy Premium')
      .setStyle(ButtonStyle.Link)
      .setURL(WHOP_URL)
  );
}

// Exported so any other command can attach a consistent "Buy Premium"
// button to its own reply — e.g. a future premium-gated command that
// wants to tell a member they don't have access.
function noPremiumEmbed(description = 'This feature requires **ServerMiser Premium**, which isn\'t active in this server yet.') {
  return new EmbedBuilder()
    .setColor('#ED4245')
    .setTitle('🔒 Premium Required')
    .setDescription(description)
    .setFooter({ text: 'Unlock it below, or run /premium to learn more.' });
}

function buildAboutEmbed() {
  return new EmbedBuilder()
    .setColor(ACCENT_COLOR)
    .setTitle('✨ ServerMiser Premium')
    .setDescription(
      'Premium is a companion bot that joins alongside ServerMiser and unlocks a set of ' +
      'deeper, more powerful features on top of everything the free bot already does.\n\n' +
      'Once your server is authorized, Premium runs side-by-side with the free bot — ' +
      'no need to remove anything, no migration, just new capabilities added on.'
    )
    .addFields(
      { name: '🤖 AI Persona Chat', value: 'Give your server a fully customizable AI character — personality, backstory, tone, even its own name and avatar — that chats naturally in any channel you choose.' },
      { name: '📞 Cross-Server Phone', value: 'Call other Discord servers running Premium directly from a channel, like a phone line between communities — accept, decline, or hang up in real time.' },
      { name: '💰 The Hoard Economy', value: 'A full in-server economy: daily rewards, jobs, a shop, a leaderboard, and casino games like slots, blackjack, dice, and a weekly lottery — all shadowed by a nightly gremlin who taxes the richest members in the server.' },
    )
    .setFooter({ text: 'Run /premium info to see exactly what changes between Free and Premium.' });
}

function buildComparisonEmbed() {
  return new EmbedBuilder()
    .setColor(ACCENT_COLOR)
    .setTitle('⚖️ Free vs Premium')
    .setDescription('Premium includes everything in the Free tier, plus the additions below.')
    .addFields(
      {
        name: '🆓 Free — included for every server',
        value:
          '• Templated server setup & configuration\n' +
          '• Full moderation suite & automated protection\n' +
          '• Role management & self-service role panels\n' +
          '• Verification gate\n' +
          '• Ticket support system\n' +
          '• Suggestions, giveaways & starboard\n' +
          '• Birthdays & invite tracking\n' +
          '• Embed builder & scheduled announcements\n' +
          '• Leveling, ranks, leaderboard & live analytics\n' +
          '• Self Voice temporary channels\n' +
          '• Auto Responder\n' +
          '• Fun & social commands',
        inline: false,
      },
      {
        name: '✨ Premium — everything in Free, plus:',
        value:
          '• **AI Persona Chat** — a fully customizable AI character for your server\n' +
          '• **Cross-Server Phone** — call and connect with other Premium servers\n' +
          '• **The Hoard Economy** — jobs, a shop, a leaderboard, and casino games\n' +
          '• **The Miser** — a nightly tax event that adds a unique risk/reward twist',
        inline: false,
      },
    )
    .setFooter({ text: 'Nothing is removed or replaced — Premium runs as a companion bot alongside the free one.' });
}

/* ==========================================================================
 *  BACKGROUND PROMO SWEEPER
 *  Purely automatic — no command, no per-server opt-out or config. Every
 *  hour it re-rolls a small chance per server to post a promo embed
 *  (pricing starts at $1.99, with the Buy Premium button above) into a
 *  channel it picks for itself. A per-guild in-memory cooldown keeps any
 *  one server from getting hit twice in quick succession.
 * ========================================================================== */
const CHECK_INTERVAL_MS = 60 * 60 * 1000;   // sweep tick — re-evaluates every server once an hour
const POST_CHANCE_PER_TICK = 0.03;          // ~3% chance per guild per eligible tick
const MIN_GAP_MS = 20 * 60 * 60 * 1000;     // hard floor: never post in the same server more than once per ~20h

// In-memory only — a missed post after a restart just means the next
// hourly tick rolls again; there's nothing here worth persisting to Mongo.
const lastPromoAt = new Map();

const PROMO_LINES = [
  {
    title: '✨ Psst — Premium is here',
    body: 'ServerMiser Premium unlocks AI persona chat, cross-server phone calls, and the full Hoard economy — casino games, jobs, a shop, and a nightly gremlin who taxes the rich.\n\nPlans start at just **$1.99**.',
  },
  {
    title: '👹 The Miser is waiting',
    body: 'In Premium servers, a nightly tax event skims the richest wallets — on top of jobs, gambling, a shop, and a full leaderboard.\n\nGet started for as little as **$1.99**.',
  },
  {
    title: '🤖 Give this server a voice',
    body: 'Premium\'s AI Persona Chat gives your server a fully customizable AI character — personality, backstory, even its own name and avatar.\n\nStarting at just **$1.99**.',
  },
  {
    title: '📞 Call another server',
    body: 'Premium\'s cross-server phone lets you ring another Discord server running Premium, live, like a phone line between communities.\n\nUnlocks starting at **$1.99**.',
  },
];

function buildPromoEmbed() {
  const pick = PROMO_LINES[Math.floor(Math.random() * PROMO_LINES.length)];
  return new EmbedBuilder()
    .setColor(ACCENT_COLOR)
    .setTitle(pick.title)
    .setDescription(pick.body)
    .setFooter({ text: 'Run /premium info to compare Free and Premium side by side.' });
}

function canSend(guild, channel) {
  const me = guild.members.me;
  if (!me) return false;
  const perms = channel.permissionsFor(me);
  return !!perms && perms.has(PermissionFlagsBits.SendMessages) && perms.has(PermissionFlagsBits.EmbedLinks);
}

// Picks a text channel whose name suggests it's a general-purpose room,
// falling back to the first text channel the bot can actually speak in.
function pickPromoChannel(guild) {
  const named = guild.channels.cache.find(
    (c) => c.type === ChannelType.GuildText &&
      /general|chat|lounge|main/i.test(c.name) &&
      canSend(guild, c)
  );
  if (named) return named;

  return guild.channels.cache.find((c) => c.type === ChannelType.GuildText && canSend(guild, c)) || null;
}

async function maybePromoteGuild(guild) {
  try {
    const last = lastPromoAt.get(guild.id) || 0;
    if (Date.now() - last < MIN_GAP_MS) return;
    if (Math.random() > POST_CHANCE_PER_TICK) return;

    const channel = pickPromoChannel(guild);
    if (!channel) return;

    await channel.send({ embeds: [buildPromoEmbed()], components: [buyButtonRow()] }).catch(() => null);
    lastPromoAt.set(guild.id, Date.now());
  } catch (err) {
    console.error(`[Premium] Promo sweep failed in guild ${guild.id}:`, err.message);
  }
}

async function runPromoSweep(client) {
  for (const guild of client.guilds.cache.values()) {
    await maybePromoteGuild(guild);
  }
}

module.exports = {
  noPremiumEmbed,
  buyButtonRow,

  data: new SlashCommandBuilder()
    .setName('premium')
    .setDescription('Learn what ServerMiser Premium unlocks')
    .addSubcommand((sub) =>
      sub.setName('about').setDescription('See what ServerMiser Premium is and how to get it')
    )
    .addSubcommand((sub) =>
      sub.setName('info').setDescription('Compare Free and Premium side by side')
    ),

  name: 'premium',

  // Called once at startup by index.js's command loader
  // (`if (command.init) command.init(client)`), same pattern as
  // autodelete.js's background sweeper.
  init(client) {
    console.log('[Premium] Starting background promo sweeper (interval: ' + (CHECK_INTERVAL_MS / 60000) + 'm).');
    setInterval(() => runPromoSweep(client).catch((err) => console.error('[Premium] Sweep cycle failed:', err.message)), CHECK_INTERVAL_MS);
  },

  async execute(interaction) {
    const isInteraction = typeof interaction.isChatInputCommand === 'function' ? interaction.isChatInputCommand() : false;

    // Prefix mode has no structural requirement to specify a subcommand,
    // so default to "about" if the member just runs |premium with nothing else.
    const subcommand = isInteraction ? interaction.options.getSubcommand() : (interaction.options.getSubcommand() || 'about');

    if (subcommand === 'info') {
      return interaction.reply({ embeds: [buildComparisonEmbed()], components: [buyButtonRow()] }).catch(() => null);
    }

    return interaction.reply({ embeds: [buildAboutEmbed()], components: [buyButtonRow()] }).catch(() => null);
  },
};