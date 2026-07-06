const { EmbedBuilder } = require('discord.js');
const database = require('./database.js'); // Assumes this file exports your MongoDB models or utility functions

async function logAction(guild, action, user, details) {
  try {
    if (!guild) return;
    let auditChannel = null;

    // 1. Fetch custom channel configuration from MongoDB
    // If your 'database.js' file handles a specific schema, find or await the document match:
    let savedChannelId = null;
    try {
        // Querying MongoDB for the guild's settings document
        const guildConfig = await database.findOne({ guildId: guild.id }).catch(() => null);
        if (guildConfig) {
            savedChannelId = guildConfig.auditChannelId || guildConfig.audit_channel;
        }
    } catch (mongoError) {
        console.error('MongoDB query error inside auditLog.js:', mongoError);
    }

    if (savedChannelId && typeof savedChannelId === 'string') {
        auditChannel = guild.channels.cache.get(savedChannelId) || await guild.channels.fetch(savedChannelId).catch(() => null);
    }

    // 2. Fallback: Scan text channels directly for match parameters
    if (!auditChannel) {
        auditChannel = guild.channels.cache.find(ch => ch.name === 'audit-logs' || ch.name === '📜┃audit-logs');
    }

    // 3. Exit gracefully if no operational text layer exists
    if (!auditChannel) return;

    // Build out the structured layout embed card
    const embed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle(`📜 Audit Log: ${action}`)
      .addFields(
        { name: 'User', value: user ? `${user.username} (${user.id})` : 'System/Unknown', inline: true },
        { name: 'Timestamp', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }, 
        { name: 'Details', value: details || 'No additional details provided.' }
      )
      .setFooter({ text: 'Server Activity Audit Log Tracking' });

    await auditChannel.send({ embeds: [embed] }).catch(() => null);
  } catch (error) {
    console.error('Error logging action in auditLog.js:', error);
  }
}

module.exports = { logAction };
