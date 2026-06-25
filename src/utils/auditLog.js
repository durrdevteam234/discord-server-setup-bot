const { EmbedBuilder } = require('discord.js');

async function logAction(guild, action, user, details) {
  try {
    const auditChannel = guild.channels.cache.find(ch => ch.name === 'audit-logs');
    if (!auditChannel) return;

    const embed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle(`Audit Log: ${action}`)
      .addFields(
        { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
        { name: 'Timestamp', value: new Date().toLocaleString(), inline: true },
        { name: 'Details', value: details || 'No details provided' }
      )
      .setFooter({ text: 'Server Audit Log' });

    await auditChannel.send({ embeds: [embed] });
  } catch (error) {
    console.error('Error logging action:', error);
  }
}

module.exports = { logAction };
