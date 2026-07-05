const { EmbedBuilder } = require('discord.js');
const database = require('./database.js'); 

async function logAction(guild, action, user, details) {
  try {
    if (!guild) return;
    let auditChannel = null;

    // 1. Fetch custom channel ID configuration from the database
    const savedChannelId = await database.get(`audit_${guild.id}`);
    if (savedChannelId) {
        auditChannel = await guild.channels.fetch(savedChannelId).catch(() => null);
    }

    // 2. Fallback: Search for an 'audit-logs' text channel
    if (!auditChannel) {
        auditChannel = guild.channels.cache.find(ch => ch.name === 'audit-logs');
    }

    // 3. Exit gracefully if no channel exists
    if (!auditChannel) return;

    // Build out the structured layout
    const embed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle(`Audit Log: ${action}`)
      .addFields(
        { name: 'User', value: user ? `${user.tag} (${user.id})` : 'System/Unknown', inline: true },
        { name: 'Timestamp', value: new Date().toLocaleString(), inline: true },
        { name: 'Details', value: details || 'No additional details provided.' }
      )
      .setFooter({ text: 'Server Audit Log' });

    await auditChannel.send({ embeds: [embed] });
  } catch (error) {
    console.error('Error logging action:', error);
  }
}

module.exports = { logAction };