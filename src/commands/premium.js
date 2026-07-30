const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

// ============================================================================
// PREMIUM INFO & SALES COMMAND
// ServerMiser Premium is a companion bot that joins alongside this one once
// a server is authorized via Whop. It unlocks AI persona chat, cross-server
// phone calls, and the full Hoard economy/casino system, on top of
// everything the free bot already offers.
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