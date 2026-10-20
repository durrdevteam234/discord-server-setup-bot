const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags,
    EmbedBuilder,
    ChannelType
  } = require('discord.js');
const database = require('../utils/database');

// ─────────────────────────────────────────────────────────────
// Config Constants
// ─────────────────────────────────────────────────────────────

const ACCENT_COLOR_LOCK = 0xed4245;  // Red for Locked
const ACCENT_COLOR_UNLOCK = 0x57f287; // Green for Unlocked

// ─────────────────────────────────────────────────────────────
// Slash Command Definition (Restricted to Administrators)
// ─────────────────────────────────────────────────────────────

const data = new SlashCommandBuilder()
  .setName('lockdown')
  .setDescription('Freeze or thaw text channels during emergencies')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .setDMPermission(false)
  .addSubcommand((sub) =>
    sub
      .setName('on')
      .setDescription('Lock down a channel to prevent standard users from messaging')
      .addChannelOption((opt) =>
        opt
          .setName('channel')
          .setDescription('The channel to lock (defaults to current)')
          .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
          .setRequired(false)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName('off')
      .setDescription('Lift a lockdown and allow standard text activity again')
      .addChannelOption((opt) =>
        opt
          .setName('channel')
          .setDescription('The channel to unlock (defaults to current)')
          .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
          .setRequired(false)
      )
  );

async function verifyAdminPermissions(interaction) {
    return interaction.member?.permissions?.has(PermissionFlagsBits.Administrator) || false;
}
// ─────────────────────────────────────────────────────────────
// Core Lockdown Execution Engine
// ─────────────────────────────────────────────────────────────

async function executeLockdown(interaction, actionType, targetChannel) {
  // Guard against structural channel types that do not support permission overrides
  if (targetChannel.type !== ChannelType.GuildText && targetChannel.type !== ChannelType.GuildAnnouncement) {
    return interaction.reply({
      content: '❌ Lockdown modifications can only be performed on standard text channels.',
      flags: [MessageFlags.Ephemeral]
    });
  }

  // Double check Bot Client internal permissions inside the specific channel context
  if (!targetChannel.permissionsFor(interaction.guild.members.me).has(PermissionFlagsBits.ManageRoles)) {
    return interaction.reply({
      content: `❌ I lack the **Manage Roles / Permissions** channel permission to modify ${targetChannel}.`,
      flags: [MessageFlags.Ephemeral]
    });
  }

  // Replying happens after a loop over every role, which can outlast Discord's
  // 3-second window on big servers.
  await interaction.deferReply();
  const reason = `${actionType === 'on' ? 'Emergency lockdown initiated' : 'Lockdown lifted'} by Admin: ${interaction.user.tag}`;

  try {
    if (actionType === 'on') {
      const existing = await database.findOne({ guildId: interaction.guildId });
      if (existing?.lockdowns?.[targetChannel.id]) {
        return interaction.editReply({ content: `⚠️ ${targetChannel} is already locked. Use \`/lockdown off\` first.` });
      }

      // Remember each overwrite's previous SendMessages/AddReactions state so the
      // unlock can put it back exactly. Unlocking used to reset them to neutral,
      // which opened read-only channels (and muted roles) to everyone.
      const saved = {};
      const everyoneRole = interaction.guild.roles.everyone;
      const targets = [everyoneRole, ...[...interaction.guild.roles.cache.values()].filter(
        (role) => role.id !== everyoneRole.id && targetChannel.permissionOverwrites.cache.has(role.id)
      )];
      for (const role of targets) {
        saved[role.id] = previousState(targetChannel.permissionOverwrites.cache.get(role.id));
        await targetChannel.permissionOverwrites.edit(role, { SendMessages: false, AddReactions: false }, { reason }).catch(() => null);
      }
      await database.findOneAndUpdate(
        { guildId: interaction.guildId },
        { $set: { [`lockdowns.${targetChannel.id}`]: saved } }
      );

      const embed = new EmbedBuilder()
        .setTitle('🔒 Channel Locked Down')
        .setDescription(`This channel has been placed under administrative lockdown. No members can send messages until the lockdown is lifted.`)
        .addFields(
          { name: 'Target Channel', value: `${targetChannel}`, inline: true },
          { name: 'Enforced By', value: `${interaction.user}`, inline: true }
        )
        .setColor(ACCENT_COLOR_LOCK)
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });

    } else if (actionType === 'off') {
      const config = await database.findOne({ guildId: interaction.guildId });
      const saved = config?.lockdowns?.[targetChannel.id];

      if (saved) {
        for (const [roleId, state] of Object.entries(saved)) {
          if (!interaction.guild.roles.cache.has(roleId)) continue;
          await targetChannel.permissionOverwrites.edit(roleId, state, { reason }).catch(() => null);
        }
        await database.findOneAndUpdate(
          { guildId: interaction.guildId },
          { $unset: { [`lockdowns.${targetChannel.id}`]: '' } }
        );
      } else {
        // Locked before saved states existed: fall back to clearing the denies.
        await targetChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: null, AddReactions: null }, { reason });
      }

      const embed = new EmbedBuilder()
        .setTitle('🔓 Lockdown Lifted')
        .setDescription(`The administrative lockdown has been removed. Members can now send messages again.`)
        .addFields(
          { name: 'Target Channel', value: `${targetChannel}`, inline: true },
          { name: 'Authorized By', value: `${interaction.user}`, inline: true }
        )
        .setColor(ACCENT_COLOR_UNLOCK)
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

  } catch (err) {
    console.error('Lockdown overwrite processing hit an internal error:', err);
    return interaction.editReply({ content: '❌ An operational error occurred while modifying channel permissions.' });
  }
}

// true = allowed, false = denied, null = not set
function previousState(overwrite) {
  const state = {};
  for (const flag of ['SendMessages', 'AddReactions']) {
    state[flag] = overwrite?.allow.has(flag) ? true : overwrite?.deny.has(flag) ? false : null;
  }
  return state;
}

// ─────────────────────────────────────────────────────────────
// Exports & Runtime Router
// ─────────────────────────────────────────────────────────────

module.exports = {
  data,
  async execute(interaction) {
    // 1. Guard Entry: Enforce Admin authorization restriction globally across formats
    const isAdmin = await verifyAdminPermissions(interaction);
    if (!isAdmin) {
      const rejectText = '❌ Access Denied: This utility requires **Administrator** security clearance.';
      return interaction.reply({ content: rejectText, flags: [MessageFlags.Ephemeral] });
    }

    // 3. Slash Command Parsing Routing Table
    const sub = interaction.options.getSubcommand();
    const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

    if (sub === 'on') return executeLockdown(interaction, 'on', targetChannel);
    if (sub === 'off') return executeLockdown(interaction, 'off', targetChannel);
  }
};
  