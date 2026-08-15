const { Events, EmbedBuilder } = require('discord.js');
const { isModLogsEnabled, resolveModLogChannel } = require('../utils/auditLog');

// ============================================================
// CONSOLIDATED AUDIT LOG EVENT HANDLERS
// All server activity logging lives here in one file.
// Each handler checks modLogsEnabled + resolves the log channel.
// ============================================================

const CHANNEL_TYPE_NAMES = {
  0: 'Text Channel',
  2: 'Voice Channel',
  4: 'Category',
  5: 'Announcement Channel',
  13: 'Stage Channel',
  15: 'Forum Channel',
};

// ─── Message Edited ─────────────────────────────────────────
async function onMessageUpdate(oldMessage, newMessage) {
  try {
    if (!newMessage.guild || !newMessage.author || newMessage.author.bot) return;
    if (!oldMessage.content || !newMessage.content) return;
    if (oldMessage.content === newMessage.content) return;

    const guild = newMessage.guild;
    if (!(await isModLogsEnabled(guild))) return;
    const channel = await resolveModLogChannel(guild);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor('#FAA61A')
      .setTitle('✏️ Message Edited')
      .setDescription(`**Author:** ${newMessage.author} (${newMessage.author.id})\n**Channel:** ${newMessage.channel}\n[Jump to message](https://discord.com/channels/${guild.id}/${newMessage.channel.id}/${newMessage.id})`)
      .addFields(
        { name: 'Before', value: oldMessage.content.slice(0, 1024) || '*Empty*' },
        { name: 'After', value: newMessage.content.slice(0, 1024) || '*Empty*' }
      )
      .setTimestamp();

    await channel.send({ embeds: [embed] }).catch(() => null);
  } catch (error) {
    console.error('[Audit:MessageUpdate]', error.message);
  }
}

// ─── Message Deleted ────────────────────────────────────────
async function onMessageDelete(message) {
  try {
    if (!message.guild || !message.author || message.author.bot) return;
    if (!message.content) return;

    const guild = message.guild;
    if (!(await isModLogsEnabled(guild))) return;
    const channel = await resolveModLogChannel(guild);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor('#ED4245')
      .setTitle('🗑️ Message Deleted')
      .setDescription(`**Author:** ${message.author} (${message.author.id})\n**Channel:** ${message.channel}`)
      .addFields({ name: 'Content', value: message.content.slice(0, 1024) || '*Empty*' })
      .setTimestamp();

    await channel.send({ embeds: [embed] }).catch(() => null);
  } catch (error) {
    console.error('[Audit:MessageDelete]', error.message);
  }
}

// ─── Channel Created ────────────────────────────────────────
async function onChannelCreate(channel) {
  try {
    if (!channel.guild) return;
    const guild = channel.guild;
    if (!(await isModLogsEnabled(guild))) return;
    const logChannel = await resolveModLogChannel(guild);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
      .setColor('#57F287')
      .setTitle('📝 Channel Created')
      .setDescription(`**Channel:** ${channel.name} (${channel.id})\n**Type:** ${CHANNEL_TYPE_NAMES[channel.type] || 'Unknown'}`)
      .setTimestamp();

    await logChannel.send({ embeds: [embed] }).catch(() => null);
  } catch (error) {
    console.error('[Audit:ChannelCreate]', error.message);
  }
}

// ─── Channel Updated ────────────────────────────────────────
async function onChannelUpdate(oldChannel, newChannel) {
  try {
    if (!newChannel.guild) return;
    const guild = newChannel.guild;
    if (!(await isModLogsEnabled(guild))) return;
    const logChannel = await resolveModLogChannel(guild);
    if (!logChannel) return;

    const changes = [];
    if (oldChannel.name !== newChannel.name) {
      changes.push({ name: 'Name', value: `\`${oldChannel.name}\` → \`${newChannel.name}\`` });
    }
    if (oldChannel.topic !== newChannel.topic) {
      changes.push({ name: 'Topic', value: `\`${oldChannel.topic || 'None'}\` → \`${newChannel.topic || 'None'}\`` });
    }
    if (oldChannel.parentId !== newChannel.parentId) {
      changes.push({ name: 'Category', value: `\`${oldChannel.parent?.name || 'None'}\` → \`${newChannel.parent?.name || 'None'}\`` });
    }
    if (oldChannel.nsfw !== newChannel.nsfw) {
      changes.push({ name: 'NSFW', value: `\`${oldChannel.nsfw}\` → \`${newChannel.nsfw}\`` });
    }
    if (oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser) {
      changes.push({ name: 'Slowmode', value: `\`${oldChannel.rateLimitPerUser || 0}s\` → \`${newChannel.rateLimitPerUser || 0}s\`` });
    }
    if (oldChannel.userLimit !== newChannel.userLimit) {
      changes.push({ name: 'User Limit', value: `\`${oldChannel.userLimit || 0}\` → \`${newChannel.userLimit || 0}\`` });
    }
    if (oldChannel.bitrate !== newChannel.bitrate) {
      changes.push({ name: 'Bitrate', value: `\`${Math.round((oldChannel.bitrate || 0) / 1000)}kbps\` → \`${Math.round((newChannel.bitrate || 0) / 1000)}kbps\`` });
    }

    if (changes.length === 0) return;

    const embed = new EmbedBuilder()
      .setColor('#FAA61A')
      .setTitle('✏️ Channel Updated')
      .setDescription(`**Channel:** ${newChannel.name} (${newChannel.id})`)
      .addFields(changes)
      .setTimestamp();

    await logChannel.send({ embeds: [embed] }).catch(() => null);
  } catch (error) {
    console.error('[Audit:ChannelUpdate]', error.message);
  }
}

// ─── Channel Deleted ────────────────────────────────────────
async function onChannelDelete(channel) {
  try {
    if (!channel.guild) return;
    const guild = channel.guild;
    if (!(await isModLogsEnabled(guild))) return;
    const logChannel = await resolveModLogChannel(guild);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
      .setColor('#ED4245')
      .setTitle('🗑️ Channel Deleted')
      .setDescription(`**Channel:** ${channel.name} (${channel.id})\n**Type:** ${CHANNEL_TYPE_NAMES[channel.type] || 'Unknown'}`)
      .setTimestamp();

    await logChannel.send({ embeds: [embed] }).catch(() => null);
  } catch (error) {
    console.error('[Audit:ChannelDelete]', error.message);
  }
}

// ─── Role Created ───────────────────────────────────────────
async function onRoleCreate(role) {
  try {
    if (!role.guild) return;
    const guild = role.guild;
    if (!(await isModLogsEnabled(guild))) return;
    const logChannel = await resolveModLogChannel(guild);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
      .setColor('#57F287')
      .setTitle('🎭 Role Created')
      .setDescription(`**Role:** ${role.name} (${role.id})\n**Color:** ${role.hexColor}\n**Hoisted:** ${role.hoist ? 'Yes' : 'No'}\n**Mentionable:** ${role.mentionable ? 'Yes' : 'No'}`)
      .setTimestamp();

    await logChannel.send({ embeds: [embed] }).catch(() => null);
  } catch (error) {
    console.error('[Audit:RoleCreate]', error.message);
  }
}

// ─── Role Updated ───────────────────────────────────────────
async function onRoleUpdate(oldRole, newRole) {
  try {
    if (!newRole.guild) return;
    const guild = newRole.guild;
    if (!(await isModLogsEnabled(guild))) return;
    const logChannel = await resolveModLogChannel(guild);
    if (!logChannel) return;

    const changes = [];
    if (oldRole.name !== newRole.name) {
      changes.push({ name: 'Name', value: `\`${oldRole.name}\` → \`${newRole.name}\`` });
    }
    if (oldRole.hexColor !== newRole.hexColor) {
      changes.push({ name: 'Color', value: `\`${oldRole.hexColor}\` → \`${newRole.hexColor}\`` });
    }
    if (oldRole.hoist !== newRole.hoist) {
      changes.push({ name: 'Hoisted', value: `\`${oldRole.hoist}\` → \`${newRole.hoist}\`` });
    }
    if (oldRole.mentionable !== newRole.mentionable) {
      changes.push({ name: 'Mentionable', value: `\`${oldRole.mentionable}\` → \`${newRole.mentionable}\`` });
    }
    if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) {
      changes.push({ name: 'Permissions', value: 'Permissions were modified' });
    }

    if (changes.length === 0) return;

    const embed = new EmbedBuilder()
      .setColor('#FAA61A')
      .setTitle('✏️ Role Updated')
      .setDescription(`**Role:** ${newRole.name} (${newRole.id})`)
      .addFields(changes)
      .setTimestamp();

    await logChannel.send({ embeds: [embed] }).catch(() => null);
  } catch (error) {
    console.error('[Audit:RoleUpdate]', error.message);
  }
}

// ─── Role Deleted ───────────────────────────────────────────
async function onRoleDelete(role) {
  try {
    if (!role.guild) return;
    const guild = role.guild;
    if (!(await isModLogsEnabled(guild))) return;
    const logChannel = await resolveModLogChannel(guild);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
      .setColor('#ED4245')
      .setTitle('🗑️ Role Deleted')
      .setDescription(`**Role:** ${role.name} (${role.id})`)
      .setTimestamp();

    await logChannel.send({ embeds: [embed] }).catch(() => null);
  } catch (error) {
    console.error('[Audit:RoleDelete]', error.message);
  }
}

// ─── Member Banned ──────────────────────────────────────────
async function onGuildBanAdd(ban) {
  try {
    const guild = ban.guild;
    if (!guild) return;
    if (!(await isModLogsEnabled(guild))) return;
    const logChannel = await resolveModLogChannel(guild);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
      .setColor('#ED4245')
      .setTitle('🔨 Member Banned')
      .setDescription(`**User:** ${ban.user.tag} (${ban.user.id})\n**Reason:** ${ban.reason || 'No reason provided'}`)
      .setTimestamp();

    await logChannel.send({ embeds: [embed] }).catch(() => null);
  } catch (error) {
    console.error('[Audit:GuildBanAdd]', error.message);
  }
}

// ─── Member Unbanned ────────────────────────────────────────
async function onGuildBanRemove(ban) {
  try {
    const guild = ban.guild;
    if (!guild) return;
    if (!(await isModLogsEnabled(guild))) return;
    const logChannel = await resolveModLogChannel(guild);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
      .setColor('#57F287')
      .setTitle('🔓 Member Unbanned')
      .setDescription(`**User:** ${ban.user.tag} (${ban.user.id})`)
      .setTimestamp();

    await logChannel.send({ embeds: [embed] }).catch(() => null);
  } catch (error) {
    console.error('[Audit:GuildBanRemove]', error.message);
  }
}

// ─── Member Updated (nickname / roles) ──────────────────────
async function onGuildMemberUpdate(oldMember, newMember) {
  try {
    const guild = newMember.guild;
    if (!guild) return;
    if (newMember.user.bot) return;
    if (!(await isModLogsEnabled(guild))) return;
    const logChannel = await resolveModLogChannel(guild);
    if (!logChannel) return;

    const changes = [];

    if (oldMember.nickname !== newMember.nickname) {
      changes.push({ name: 'Nickname', value: `\`${oldMember.nickname || 'None'}\` → \`${newMember.nickname || 'None'}\`` });
    }

    const oldRoles = oldMember.roles.cache.map(r => r.id).sort().join(',');
    const newRoles = newMember.roles.cache.map(r => r.id).sort().join(',');
    if (oldRoles !== newRoles) {
      const added = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
      const removed = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));
      const parts = [];
      if (added.size > 0) parts.push(`**Added:** ${added.map(r => r.name).join(', ')}`);
      if (removed.size > 0) parts.push(`**Removed:** ${removed.map(r => r.name).join(', ')}`);
      if (parts.length > 0) changes.push({ name: 'Roles', value: parts.join('\n') });
    }

    if (changes.length === 0) return;

    const embed = new EmbedBuilder()
      .setColor('#FAA61A')
      .setTitle('👤 Member Updated')
      .setDescription(`**Member:** ${newMember.user.tag} (${newMember.user.id})`)
      .addFields(changes)
      .setTimestamp();

    await logChannel.send({ embeds: [embed] }).catch(() => null);
  } catch (error) {
    console.error('[Audit:GuildMemberUpdate]', error.message);
  }
}

// ─── Guild Updated (name / icon / boost level) ──────────────
async function onGuildUpdate(oldGuild, newGuild) {
  try {
    if (!(await isModLogsEnabled(newGuild))) return;
    const logChannel = await resolveModLogChannel(newGuild);
    if (!logChannel) return;

    const changes = [];
    if (oldGuild.name !== newGuild.name) {
      changes.push({ name: 'Server Name', value: `\`${oldGuild.name}\` → \`${newGuild.name}\`` });
    }
    if (oldGuild.icon !== newGuild.icon) {
      changes.push({ name: 'Server Icon', value: 'Server icon was changed' });
    }
    if (oldGuild.premiumTier !== newGuild.premiumTier) {
      changes.push({ name: 'Boost Tier', value: `Tier ${oldGuild.premiumTier} → Tier ${newGuild.premiumTier}` });
    }
    if (oldGuild.premiumSubscriptionCount !== newGuild.premiumSubscriptionCount) {
      changes.push({ name: 'Boost Count', value: `${oldGuild.premiumSubscriptionCount || 0} → ${newGuild.premiumSubscriptionCount || 0}` });
    }

    if (changes.length === 0) return;

    const embed = new EmbedBuilder()
      .setColor('#FAA61A')
      .setTitle('🖥️ Server Updated')
      .addFields(changes)
      .setTimestamp();

    await logChannel.send({ embeds: [embed] }).catch(() => null);
  } catch (error) {
    console.error('[Audit:GuildUpdate]', error.message);
  }
}

// ─── Export as an array of event handlers ───────────────────
module.exports = [
  { name: 'messageUpdate', once: false, execute: onMessageUpdate },
  { name: 'messageDelete', once: false, execute: onMessageDelete },
  { name: 'channelCreate', once: false, execute: onChannelCreate },
  { name: 'channelUpdate', once: false, execute: onChannelUpdate },
  { name: 'channelDelete', once: false, execute: onChannelDelete },
  { name: 'roleCreate', once: false, execute: onRoleCreate },
  { name: 'roleUpdate', once: false, execute: onRoleUpdate },
  { name: 'roleDelete', once: false, execute: onRoleDelete },
  { name: 'guildBanAdd', once: false, execute: onGuildBanAdd },
  { name: 'guildBanRemove', once: false, execute: onGuildBanRemove },
  { name: 'guildMemberUpdate', once: false, execute: onGuildMemberUpdate },
  { name: 'guildUpdate', once: false, execute: onGuildUpdate },
];