/**
 * Server layout files: /setup export and /setup import.
 *
 * The file holds roles, categories, channels and their permission overwrites.
 * Overwrites point at roles by NAME (not ID), so a file exported from one
 * server can be rebuilt on any other server. Member-specific overwrites are
 * left out because those people won't exist on the other server.
 */

const { ChannelType, OverwriteType, PermissionsBitField } = require('discord.js');

const FORMAT = 'servermiser-layout';
const VERSION = 1;
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_ROLES = 250;
const MAX_CHANNELS = 500;

const SUPPORTED_TYPES = new Set([
  ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildCategory,
  ChannelType.GuildAnnouncement, ChannelType.GuildStageVoice, ChannelType.GuildForum,
]);
// Announcement, stage and forum channels need features some servers don't have.
const FALLBACK_TYPE = {
  [ChannelType.GuildAnnouncement]: ChannelType.GuildText,
  [ChannelType.GuildForum]: ChannelType.GuildText,
  [ChannelType.GuildStageVoice]: ChannelType.GuildVoice,
};

function exportLayout(guild) {
  const roleName = (id) => (id === guild.id ? '@everyone' : guild.roles.cache.get(id)?.name);

  const roles = guild.roles.cache
    .filter((role) => role.id !== guild.id && !role.managed)
    .sort((a, b) => b.position - a.position)
    .map((role) => ({
      name: role.name,
      color: role.hexColor,
      permissions: role.permissions.bitfield.toString(),
      hoist: role.hoist,
      mentionable: role.mentionable,
    }));

  const channels = guild.channels.cache
    .filter((channel) => SUPPORTED_TYPES.has(channel.type))
    .sort((a, b) => a.rawPosition - b.rawPosition)
    .map((channel) => ({
      name: channel.name,
      type: channel.type,
      category: channel.parent?.name ?? null,
      topic: channel.topic ?? null,
      nsfw: Boolean(channel.nsfw),
      slowmode: channel.rateLimitPerUser ?? 0,
      bitrate: channel.bitrate ?? null,
      userLimit: channel.userLimit ?? null,
      permissions: channel.permissionOverwrites.cache
        .filter((overwrite) => overwrite.type === OverwriteType.Role && roleName(overwrite.id))
        .map((overwrite) => ({
          role: roleName(overwrite.id),
          allow: overwrite.allow.bitfield.toString(),
          deny: overwrite.deny.bitfield.toString(),
        })),
    }));

  return {
    format: FORMAT,
    version: VERSION,
    exportedAt: new Date().toISOString(),
    source: guild.name,
    everyonePermissions: guild.roles.everyone.permissions.bitfield.toString(),
    roles,
    channels,
  };
}

/** Downloads and checks an uploaded layout file. Throws an Error with a readable message. */
async function readLayoutAttachment(attachment) {
  if (!attachment.name?.toLowerCase().endsWith('.json')) throw new Error('That isn\'t a `.json` layout file.');
  if (attachment.size > MAX_FILE_BYTES) throw new Error('That file is too big (2 MB max).');
  const response = await fetch(attachment.url, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error('I couldn\'t download that file. Try uploading it again.');
  let layout;
  try {
    layout = JSON.parse(await response.text());
  } catch {
    throw new Error('That file isn\'t valid JSON.');
  }
  return validateLayout(layout);
}

function validateLayout(layout) {
  if (layout?.format !== FORMAT) throw new Error('That isn\'t a ServerMiser layout file. Make one with `/setup export`.');
  if (layout.version > VERSION) throw new Error('That file was made by a newer version of ServerMiser.');
  if (!Array.isArray(layout.roles) || !Array.isArray(layout.channels)) throw new Error('That layout file is damaged.');
  if (layout.roles.length > MAX_ROLES || layout.channels.length > MAX_CHANNELS) throw new Error('That layout has more roles or channels than Discord allows.');

  const text = (value, max) => (typeof value === 'string' ? value.slice(0, max) : null);
  const bits = (value) => {
    try { return new PermissionsBitField(BigInt(value)).bitfield; } catch { return 0n; }
  };

  const roles = layout.roles
    .filter((role) => text(role?.name, 100))
    .map((role) => ({
      name: text(role.name, 100),
      color: /^#[0-9a-f]{6}$/i.test(role.color) ? role.color : null,
      permissions: bits(role.permissions),
      hoist: Boolean(role.hoist),
      mentionable: Boolean(role.mentionable),
    }));

  const channels = layout.channels
    .filter((channel) => text(channel?.name, 100) && SUPPORTED_TYPES.has(channel.type))
    .map((channel) => ({
      name: text(channel.name, 100),
      type: channel.type,
      category: text(channel.category, 100),
      topic: text(channel.topic, 1024),
      nsfw: Boolean(channel.nsfw),
      slowmode: Math.min(21600, Math.max(0, Number(channel.slowmode) || 0)),
      bitrate: Number(channel.bitrate) || null,
      userLimit: Math.min(99, Math.max(0, Number(channel.userLimit) || 0)),
      permissions: (Array.isArray(channel.permissions) ? channel.permissions : [])
        .filter((overwrite) => text(overwrite?.role, 100))
        .map((overwrite) => ({ role: overwrite.role, allow: bits(overwrite.allow), deny: bits(overwrite.deny) })),
    }));

  return { source: text(layout.source, 100) || 'another server', exportedAt: layout.exportedAt, roles, channels };
}

/** What an import would add, without changing anything. */
function planImport(guild, layout) {
  const hasRole = (name) => guild.roles.cache.some((role) => role.name === name);
  const hasChannel = (channel) => guild.channels.cache.some((existing) => existing.name === channel.name
    && (existing.type === channel.type || existing.type === FALLBACK_TYPE[channel.type])
    && (channel.type === ChannelType.GuildCategory || (existing.parent?.name ?? null) === channel.category));

  const roles = layout.roles.filter((role) => !hasRole(role.name));
  const categories = layout.channels.filter((channel) => channel.type === ChannelType.GuildCategory && !hasChannel(channel));
  const channels = layout.channels.filter((channel) => channel.type !== ChannelType.GuildCategory && !hasChannel(channel));
  const skipped = layout.roles.length + layout.channels.length - roles.length - categories.length - channels.length;
  return { roles, categories, channels, skipped };
}

/**
 * Creates everything in the plan. Existing roles and channels are never
 * changed or deleted. `onProgress(text)` is called now and then for status updates.
 */
async function applyImport(guild, plan, { reason, onProgress = async () => {} }) {
  const me = guild.members.me;
  const result = { roles: 0, channels: 0, failed: [], trimmed: [] };
  const total = plan.roles.length + plan.categories.length + plan.channels.length;
  let done = 0;
  const tick = async () => {
    done += 1;
    if (done % 10 === 0) await onProgress(`Building... ${done}/${total}`).catch(() => null);
  };

  // Highest role first: each new role is placed at the bottom, so earlier ones end up above later ones.
  for (const role of plan.roles) {
    // The bot can only hand out permissions it has itself.
    const permissions = new PermissionsBitField(role.permissions).bitfield & me.permissions.bitfield;
    if (permissions !== role.permissions) result.trimmed.push(role.name);
    const created = await guild.roles.create({
      name: role.name, color: role.color ?? undefined, permissions,
      hoist: role.hoist, mentionable: role.mentionable, reason,
    }).catch(() => null);
    if (created) result.roles += 1;
    else result.failed.push(`role ${role.name}`);
    await tick();
  }

  const overwritesFor = (channel) => channel.permissions
    .map((overwrite) => {
      const role = overwrite.role === '@everyone'
        ? guild.roles.everyone
        : guild.roles.cache.find((existing) => existing.name === overwrite.role);
      return role ? { id: role.id, type: OverwriteType.Role, allow: overwrite.allow, deny: overwrite.deny } : null;
    })
    .filter(Boolean);

  const create = async (channel, parent) => {
    const options = {
      name: channel.name, type: channel.type, parent: parent ?? undefined,
      topic: channel.topic ?? undefined, nsfw: channel.nsfw, rateLimitPerUser: channel.slowmode || undefined,
      userLimit: channel.userLimit || undefined, permissionOverwrites: overwritesFor(channel), reason,
    };
    if (channel.bitrate) options.bitrate = Math.min(channel.bitrate, guild.maximumBitrate ?? 96000);
    let created = await guild.channels.create(options).catch(() => null);
    if (!created && FALLBACK_TYPE[channel.type] !== undefined) {
      created = await guild.channels.create({ ...options, type: FALLBACK_TYPE[channel.type] }).catch(() => null);
    }
    if (created) result.channels += 1;
    else result.failed.push(`channel ${channel.name}`);
    await tick();
    return created;
  };

  for (const category of plan.categories) await create(category, null);
  for (const channel of plan.channels) {
    const parent = channel.category
      ? guild.channels.cache.find((existing) => existing.type === ChannelType.GuildCategory && existing.name === channel.category)
      : null;
    await create(channel, parent?.id);
  }
  return result;
}

module.exports = { exportLayout, readLayoutAttachment, validateLayout, planImport, applyImport };
