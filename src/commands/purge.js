const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags,
    EmbedBuilder,
    ChannelType
  } = require('discord.js');

// ─────────────────────────────────────────────────────────────
// Config Constants
// ─────────────────────────────────────────────────────────────

const MAX_PURGE_AMOUNT = 100;
const ACCENT_COLOR = 0xed4245;

// ─────────────────────────────────────────────────────────────
// Slash Command Definition (Restricted to Administrators)
// ─────────────────────────────────────────────────────────────

const data = new SlashCommandBuilder()
  .setName('purge')
  .setDescription('Bulk delete messages using advanced filtering')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .setDMPermission(false)
  .addSubcommand((sub) =>
    sub
      .setName('any')
      .setDescription('Delete any recent messages matching no specific filter')
      .addIntegerOption((opt) =>
        opt
          .setName('amount')
          .setDescription('Number of messages to clear (1 - 100)')
          .setRequired(true)
          .setMinValue(1)
          .setMaxValue(MAX_PURGE_AMOUNT)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName('user')
      .setDescription('Purge messages sent exclusively by a specific member')
      .addUserOption((opt) =>
        opt
          .setName('target')
          .setDescription('The member whose messages you want to scrub')
          .setRequired(true)
      )
      .addIntegerOption((opt) =>
        opt
          .setName('amount')
          .setDescription('Number of past channel messages to analyze (1 - 100)')
          .setRequired(true)
          .setMinValue(1)
          .setMaxValue(MAX_PURGE_AMOUNT)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName('bot')
      .setDescription('Purge messages sent exclusively by automated bots')
      .addIntegerOption((opt) =>
        opt
          .setName('amount')
          .setDescription('Number of past channel messages to analyze (1 - 100)')
          .setRequired(true)
          .setMinValue(1)
          .setMaxValue(MAX_PURGE_AMOUNT)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName('links')
      .setDescription('Purge recent messages containing HTTP/HTTPS links')
      .addIntegerOption((opt) =>
        opt
          .setName('amount')
          .setDescription('Number of past channel messages to analyze (1 - 100)')
          .setRequired(true)
          .setMinValue(1)
          .setMaxValue(MAX_PURGE_AMOUNT)
      )
  );

async function verifyAdminPermissions(interaction) {
  return interaction.member?.permissions?.has(PermissionFlagsBits.Administrator) || false;
}

// ─────────────────────────────────────────────────────────────
// Core Purge Execution Engine
// ─────────────────────────────────────────────────────────────

async function executePurge(interaction, filterType, amount, targetUser = null) {
  if (interaction.channel.type !== ChannelType.GuildText && interaction.channel.type !== ChannelType.GuildAnnouncement) {
    return interaction.reply({
      content: '❌ Bulk message deletions can only be performed in standard text channels.',
      flags: [MessageFlags.Ephemeral]
    });
  }

  if (!interaction.channel.permissionsFor(interaction.guild.members.me).has(PermissionFlagsBits.ManageMessages)) {
    return interaction.reply({
      content: '❌ I lack the **Manage Messages** channel permission to clean up chat blocks.',
      flags: [MessageFlags.Ephemeral]
    });
  }

  await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

  try {
    const fetchedMessages = await interaction.channel.messages.fetch({ limit: amount });
    const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;

    let messagesToDelete = fetchedMessages.filter((msg) => {
      if (msg.createdTimestamp < fourteenDaysAgo) return false;
      if (msg.pinned) return false; 

      switch (filterType) {
        case 'user':
          return targetUser ? msg.author.id === targetUser.id : false;
        case 'bot':
          return msg.author.bot;
        case 'links':
          return /https?:\/\/[^\s]+/i.test(msg.content);
        case 'any':
        default:
          return true;
      }
    });

    if (messagesToDelete.size === 0) {
      const emptyContent = '❌ No recent messages (under 14 days old and unpinned) matched your filter.';
      return interaction.editReply({ content: emptyContent });
    }

    const deletedCollection = await interaction.channel.bulkDelete(messagesToDelete, true);

    const embed = new EmbedBuilder()
      .setTitle('🧹 Channel Purge Complete')
      .setDescription('Successfully scrubbed localized message entries from this system node.')
      .addFields(
        { name: 'Filter Applied', value: `\`${filterType.toUpperCase()}\``, inline: true },
        { name: 'Messages Deleted', value: `\`${deletedCollection.size}\``, inline: true }
      )
      .setColor(ACCENT_COLOR)
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error('Purge transaction process hit a structural error:', err);
    const errorContent = '❌ An internal error occurred while executing the bulk deletion routine.';
    return interaction.editReply({ content: errorContent });
  }
}

// ─────────────────────────────────────────────────────────────
// Exports & Runtime Router
// ─────────────────────────────────────────────────────────────

module.exports = {
  data,
  async execute(interaction) {
    const isAdmin = await verifyAdminPermissions(interaction);
    if (!isAdmin) {
      const rejectText = '❌ Access Denied: This utility requires **Administrator** security clearance.';
      return interaction.reply({ content: rejectText, flags: [MessageFlags.Ephemeral] });
    }

    const sub = interaction.options.getSubcommand();
    const amount = interaction.options.getInteger('amount');

    if (sub === 'any') return executePurge(interaction, 'any', amount);
    if (sub === 'bot') return executePurge(interaction, 'bot', amount);
    if (sub === 'links') return executePurge(interaction, 'links', amount);
    if (sub === 'user') {
      const target = interaction.options.getUser('target');
      return executePurge(interaction, 'user', amount, target);
    }
  }
};
  