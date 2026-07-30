const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags,
    EmbedBuilder,
    ChannelType
  } = require('discord.js');
  const { Schema, model, models } = require('mongoose');

  // ─────────────────────────────────────────────────────────────
  // Database Config & Schema Definitions
  // ─────────────────────────────────────────────────────────────

  const ACCENT_COLOR = 0xed4245;
  const SWEEP_INTERVAL_MS = 30 * 1000; // How often the background sweeper checks bound channels

  const AutoDeleteSchema = new Schema({
    channelId: { type: String, required: true, unique: true },
    guildId: { type: String, required: true },
    lifespanSeconds: { type: Number, required: true }
  });

  const AutoDelete = models.AutoDelete || model('AutoDelete', AutoDeleteSchema);

  // Short, human-friendly ID derived from the Mongo document's own _id —
  // no separate field needed, and it's stable for the life of the profile.
  function shortId(doc) {
    return String(doc._id).slice(-6).toUpperCase();
  }

  // ─────────────────────────────────────────────────────────────
  // Slash Command Definition (Restricted to Administrators)
  // ─────────────────────────────────────────────────────────────

  const data = new SlashCommandBuilder()
    .setName('autodelete')
    .setDescription('Configure a customizable automatic message destruction profile for a channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addSubcommand((sub) =>
      sub
        .setName('channel')
        .setDescription('Bind (or disable) an auto-delete profile on a channel')
        .addIntegerOption((opt) =>
          opt.setName('seconds').setDescription('Lifespan of new text inside the channel in seconds (0 to turn off)').setRequired(true).setMinValue(0)
        )
        .addChannelOption((opt) =>
          opt.setName('channel').setDescription('The channel to bind to (defaults to current)').addChannelTypes(ChannelType.GuildText).setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('ongoing')
        .setDescription('List every active auto-delete profile in this server, with its ID')
    );

  // ─────────────────────────────────────────────────────────────
  // Formatting & Execution Log Logic
  // ─────────────────────────────────────────────────────────────

  function isPrefixMode(interaction) {
    return typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand() === false;
  }

  function parsePrefixArgs(interaction) {
    const tokens = String(interaction.content || '').trim().split(/\s+/);
    let seconds = null;
    let targetChannel = interaction.channel;

    for (let i = 1; i < tokens.length; i++) {
      const val = parseInt(tokens[i], 10);
      if (!isNaN(val)) {
        seconds = val;
        break;
      }
    }

    if (interaction.mentions?.channels?.size > 0) {
      targetChannel = interaction.mentions.channels.first();
    }

    return { seconds, targetChannel };
  }

  // ─────────────────────────────────────────────────────────────
  // Runtime Transaction Controller Entry Points
  // ─────────────────────────────────────────────────────────────

  async function processConfiguration(interaction, seconds, targetChannel) {
    if (!targetChannel.permissionsFor(interaction.guild.members.me).has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({
        content: `❌ I lack the **Manage Messages** bot client permissions flag configuration inside ${targetChannel}.`,
        flags: [MessageFlags.Ephemeral]
      });
    }

    if (seconds === 0) {
      await AutoDelete.deleteOne({ channelId: targetChannel.id });
      return interaction.reply({ content: `✅ Auto-delete profile disabled for ${targetChannel}. Messages will persist indefinitely.` });
    }

    const profile = await AutoDelete.findOneAndUpdate(
      { channelId: targetChannel.id },
      {
        channelId: targetChannel.id,
        guildId: interaction.guild.id,
        lifespanSeconds: seconds
      },
      { upsert: true, new: true }
    );

    const embed = new EmbedBuilder()
      .setTitle('⏳ Auto-Delete Sequence Configured')
      .setDescription(`Messages sent in this channel are now swept and removed once they exceed the configured lifespan.\nSweeps run automatically every ${SWEEP_INTERVAL_MS / 1000} seconds — deletion is not instant per-message.`)
      .addFields(
        { name: 'Target Channel', value: `${targetChannel}`, inline: true },
        { name: 'Lifespan Interval', value: `\`${seconds} second${seconds === 1 ? '' : 's'}\``, inline: true },
        { name: 'Profile ID', value: `\`${shortId(profile)}\``, inline: true }
      )
      .setColor(ACCENT_COLOR)
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }

  async function handleOngoing(interaction) {
    const profiles = await AutoDelete.find({ guildId: interaction.guild.id }).lean();

    if (profiles.length === 0) {
      const embed = new EmbedBuilder()
        .setColor(ACCENT_COLOR)
        .setTitle('⏳ Active Auto-Delete Profiles')
        .setDescription('No channels in this server currently have an auto-delete profile bound.');
      return interaction.reply({ embeds: [embed] });
    }

    const lines = profiles.map((p) =>
      `\`${shortId(p)}\` — <#${p.channelId}> — every message older than **${p.lifespanSeconds}s** is swept`
    );

    const embed = new EmbedBuilder()
      .setColor(ACCENT_COLOR)
      .setTitle('⏳ Active Auto-Delete Profiles')
      .setDescription(lines.join('\n'))
      .setFooter({ text: `${profiles.length} active profile${profiles.length === 1 ? '' : 's'}  •  sweeps run every ${SWEEP_INTERVAL_MS / 1000}s` });

    return interaction.reply({ embeds: [embed] });
  }

  // ─────────────────────────────────────────────────────────────
  // Background Sweeper — replaces the old per-message instant
  // warn-then-delete flow. Instead of reacting the instant someone
  // sends a message, this runs on a fixed interval and bulk-deletes
  // anything in bound channels that has aged past its lifespan.
  // ─────────────────────────────────────────────────────────────

  async function sweepChannel(client, profile) {
    try {
      const guild = client.guilds.cache.get(profile.guildId);
      if (!guild) return;

      const channel = guild.channels.cache.get(profile.channelId) ||
        await guild.channels.fetch(profile.channelId).catch(() => null);
      if (!channel || !channel.isTextBased?.()) return;

      const me = guild.members.me;
      if (!me || !channel.permissionsFor(me)?.has(PermissionFlagsBits.ManageMessages)) return;

      const cutoff = Date.now() - profile.lifespanSeconds * 1000;
      const recentMessages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
      if (!recentMessages || recentMessages.size === 0) return;

      const expired = recentMessages.filter((m) => !m.pinned && m.createdTimestamp <= cutoff);
      if (expired.size === 0) return;

      if (expired.size === 1) {
        await expired.first().delete().catch(() => null);
      } else {
        // bulkDelete's filterOld flag silently skips anything older than
        // 14 days (Discord's own hard limit), so this stays safe even if
        // lifespanSeconds is set unusually high.
        await channel.bulkDelete(expired, true).catch(() => null);
      }
    } catch (err) {
      console.error(`[AutoDelete] Sweep failed for channel ${profile.channelId}:`, err.message);
    }
  }

  async function runSweep(client) {
    try {
      const profiles = await AutoDelete.find({}).lean();
      for (const profile of profiles) {
        await sweepChannel(client, profile);
      }
    } catch (err) {
      console.error('[AutoDelete] Sweep cycle failed:', err.message);
    }
  }

  module.exports = {
    data,

    // Called once at startup by index.js's command loader (`if (command.init) command.init(client)`),
    // matching the pattern already used by selfvoice/giveaway/birthdays/invites.
    init(client) {
      console.log('[AutoDelete] Starting background sweeper (interval: ' + (SWEEP_INTERVAL_MS / 1000) + 's).');
      setInterval(() => runSweep(client), SWEEP_INTERVAL_MS);
    },

    async execute(interaction) {
      if (!interaction.member?.permissions?.has(PermissionFlagsBits.Administrator)) {
        const denyText = '❌ Access Denied: This utility requires **Administrator** security clearance.';
        return isPrefixMode(interaction) ? interaction.reply({ content: denyText }) : interaction.reply({ content: denyText, flags: [MessageFlags.Ephemeral] });
      }

      if (isPrefixMode(interaction)) {
        const subcommand = interaction.options.getSubcommand();
        if (subcommand === 'ongoing') {
          return handleOngoing(interaction);
        }
        const parsed = parsePrefixArgs(interaction);
        if (parsed.seconds === null || parsed.seconds < 0) {
          return interaction.reply({ content: '❌ Invalid utilization structure.\n**Usage:** `|autodelete channel [seconds] [#channel]` (Set to 0 to disable), or `|autodelete ongoing`' });
        }
        return processConfiguration(interaction, parsed.seconds, parsed.targetChannel);
      }

      const subcommand = interaction.options.getSubcommand();
      if (subcommand === 'ongoing') {
        return handleOngoing(interaction);
      }

      const seconds = interaction.options.getInteger('seconds');
      const channel = interaction.options.getChannel('channel') || interaction.channel;
      return processConfiguration(interaction, seconds, channel);
    },

    // Kept as a no-op so the existing call site in messageCreate.js's
    // background automation loop doesn't need to change or error —
    // deletion is now handled entirely by the interval sweeper above,
    // not triggered per-message.
    async trackAndQueueDeletion() {
      return;
    }
  };