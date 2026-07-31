const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ComponentType,
} = require('discord.js');

// ============================================================================
// FULL HELP DIRECTORY
// Every command in the bot is listed here, grouped into browsable pages.
// Navigation uses a select menu so new pages scale cleanly.
// Pages are labeled generically ("Page 1", "Page 2", ...) rather than by
// category name — the label is derived from array position, not hardcoded,
// so it never needs updating as pages are added, removed, or reordered.
// (Owner-only utility commands are intentionally excluded from this list.)
// ============================================================================
const PREFIX_NOTE = '💡 All commands work with both `/` and the `|` prefix.';

const PAGES = [
  {
    key: 'general',
    emoji: '👤',
    color: '#5865F2',
    body:
      '`/help` - Open this interactive help directory.\n' +
      '`/capabilities` - A full, detailed tour of everything the bot can do.\n' +
      '`/purpose` - Learn about the bot and view its profile.\n' +
      '`/premium about/info` - Learn what ServerMiser Premium unlocks and compare it to Free.\n' +
      '`/level rank [user]` - Check your (or someone else\'s) level and XP.\n' +
      '`/level leaderboard` - View the top 10 ranked members.\n' +
      '`/level settings` - Configure the leveling system (staff).\n' +
      '`/level multiplier <amount>` - Set a server-wide XP multiplier (staff).\n' +
      '`/level xp add/remove/set/reset` - Manually adjust a member\'s XP (staff).\n' +
      '`/analytics setup/edit/delete/update` - Manage live server stat channels.',
  },
  {
    key: 'setup',
    emoji: '🛠️',
    color: '#EB459E',
    body:
      '`/setup <template> [clear]` - Build a full server layout from templates.\n' +
      '`/setup-audit` - Configure the audit log channel and tracked actions.\n' +
      '`/mod-logs-toggle` - Enable/disable moderation logging to a channel.\n' +
      '`/welcome` - Configure welcome/leave messages and embeds.\n' +
      '`/cute <style>` - Change the bot\'s text styling for setup templates.\n' +
      '`/fun-module` - Enable or disable the entire fun commands suite.\n' +
      '`/clear-channels` - Wipe all categories and channels from the server.',
  },
  {
    key: 'moderation',
    emoji: '🛡️',
    color: '#ED4245',
    body:
      '`/warn <user> <reason>` • `/warnings [user]` • `/unwarn <user> <index>` - Warn, view, and remove warnings.\n' +
      '`/mute <user> <duration> [reason]` • `/unmute <user>` - Timeout or restore a member.\n' +
      '`/kick <user> [reason]` - Kick a member.\n' +
      '`/ban <user> [reason]` • `/unban <username> [reason]` - Ban or unban.\n' +
      '`/automodrule setup/edit/delete` - Configure up to 20 background message filters.\n' +
      '`/purge <amount> [filters]` - Bulk delete messages by user, bots, or links.\n' +
      '`/lockdown on/off <channel>` - Freeze or thaw a channel during emergencies.\n' +
      '`/slowmode` - Set, edit, exempt roles from, or remove channel slowmode.\n' +
      '`/clearroles` - Forcefully delete all modifiable custom server roles.',
  },
  {
    key: 'roles',
    emoji: '🎭',
    color: '#FEE75C',
    body:
      '`/role user/remove` - Add or remove a role from a member.\n' +
      '`/role create/delete/rename/color/hoist/mentionable` - Manage role properties.\n' +
      '`/role everyone/bots/humans` - Mass-assign a role to a group.\n' +
      '`/role info/list` - Inspect the role hierarchy.\n' +
      '`/autorole` - Auto-grant a role when members join (all/bots/humans).\n' +
      '`/reactionroles` - Build interactive self-assignable role panels.\n' +
      '`/verification setup/edit/delete/disable` - Configure a member verification gate.',
  },
  {
    key: 'tickets',
    emoji: '🎫',
    color: '#57F287',
    body:
      '`/ticket panel` - Post the ticket-creation panel (staff).\n' +
      '`/ticket channel` - Configure the ticket category/settings (staff).\n' +
      '`/ticket ongoing` - View currently open tickets (staff).\n' +
      '`/ticket purge` - Bulk-close old tickets (staff).\n\n' +
      'Members open tickets from the panel for private help; staff manage and close them.',
  },
  {
    key: 'selfvoice',
    emoji: '🔊',
    color: '#3498DB',
    body:
      '`/selfvoice create [name] [limit]` - Create your own temp VC (when enabled).\n' +
      '`/selfvoice panel` - Resend the control panel for your active room.\n' +
      '`/selfvoice config` - View the current module configuration.\n' +
      '`/selfvoice setup` - Staff wizard to configure the module.\n' +
      '`/selfvoice set <setting> <value>` - Fine-tune defaults (staff).\n' +
      '`/selfvoice enable` • `disable` - Staff module toggle.\n\n' +
      'Owners of a temp VC get a control panel: rename, lock, hide, limit, bitrate, kick, transfer, claim, delete.',
  },
  {
    key: 'autoresponder',
    emoji: '💬',
    color: '#9B59B6',
    body:
      '`/autoresponder setup` - Step-by-step wizard with a live preview.\n' +
      '`/autoresponder add <trigger> <response>` - Quickly create a responder.\n' +
      '`/autoresponder list` • `info` • `edit` • `remove` • `toggle` • `test` - Manage responders.\n' +
      '`/autoresponder variables` - See all dynamic placeholders you can use.\n' +
      '`/autoresponder config` - View the module overview.\n' +
      '`/autoresponder enable` • `disable` - Staff module toggle.',
  },
  {
    key: 'engagement',
    emoji: '📣',
    color: '#F47FFF',
    body:
      '`/giveaway start/reroll/end` - Run timed giveaways with a winner draw.\n' +
      '`/poll create/setup` - Post a poll with vote buttons, with optional auto-close.\n' +
      '`/suggestions setup/submit/approve/deny/implement/list` - A full member suggestion box.\n' +
      '`/starboard setup/config/toggle/ignore` - Repost highly-starred messages to a channel.\n' +
      '`/birthdays set/remove/check/today/upcoming/list/config` - Track member birthdays.\n' +
      '`/invites check/leaderboard/config/toggle/stats` - Track who invited whom.\n' +
      '`/embed create/edit/send/save/load/list/delete` - Build and manage rich embeds.\n' +
      '`/automessage` - Schedule recurring messages to a channel.\n' +
      '`/autodelete` - Auto-delete messages in a channel after a set time.',
  },
  {
    key: 'fun',
    emoji: '🎉',
    color: '#F1C40F',
    body:
      '**Games:** `/trivia` `/wouldyourather` `/capital-quiz` `/dice-duel` `/coinflip` `/roll` `/8ball`\n' +
      '**Social:** `/hug` `/slap` `/roast` `/rate` `/predict-love` `/flavor`\n' +
      '**Content:** `/joke` `/dadjoke` `/meme` `/fortune` `/spacefact` `/cat` `/dog`\n' +
      '**Menu:** `/fun-menu` to browse the fun suite in one place.',
  },
];

// Every page is labeled purely by position — "Page 1", "Page 2", etc. —
// never by what's actually in it.
const pageLabel = (index) => `Page ${index + 1}`;

function buildEmbed(page, index) {
  return new EmbedBuilder()
    .setColor(page.color)
    .setTitle(`${page.emoji} ${pageLabel(index)}`)
    .setDescription(page.body)
    .setFooter({ text: `${PREFIX_NOTE}  •  ${pageLabel(index)} of ${PAGES.length}` })
    .setTimestamp();
}

function buildMenu(activeKey) {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('help_select')
      .setPlaceholder('📚 Choose a page to browse…')
      .addOptions(PAGES.map((p, i) => ({
        label: pageLabel(i),
        value: p.key,
        emoji: p.emoji,
        default: p.key === activeKey,
      }))),
  );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('View the full list of available bot commands by category.'),
  name: 'help',

  async execute(interaction, client) {
    const isInteraction = typeof interaction.isChatInputCommand === 'function' ? interaction.isChatInputCommand() : false;

    const first = PAGES[0];
    const payload = { embeds: [buildEmbed(first, 0)], components: [buildMenu(first.key)] };

    const response = await interaction.reply({ ...payload, fetchReply: true }).catch(() => null);
    if (!response) return;

    const authorId = isInteraction ? interaction.user.id : interaction.author.id;

    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 120000,
    });

    collector.on('collect', async (sel) => {
      if (sel.user.id !== authorId) {
        return sel.reply({ content: '❌ Run the command yourself to browse the menu!', ephemeral: true }).catch(() => null);
      }
      const index = PAGES.findIndex(p => p.key === sel.values[0]);
      const page = PAGES[index] || PAGES[0];
      await sel.update({ embeds: [buildEmbed(page, index)], components: [buildMenu(page.key)] }).catch(() => null);
    });

    collector.on('end', () => {
      const disabled = buildMenu('none');
      disabled.components[0].setDisabled(true);
      if (isInteraction) interaction.editReply({ components: [disabled] }).catch(() => null);
      else response.edit({ components: [disabled] }).catch(() => null);
    });
  },
};