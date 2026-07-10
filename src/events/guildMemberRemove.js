const { Events, EmbedBuilder } = require('discord.js');
const { readData } = require('../utils/database');

function resolveMessage(template, member, guild) {
  return template
    .replace(/{user}/g, member.user.username)
    .replace(/{server}/g, guild.name)
    .replace(/{memberCount}/g, guild.memberCount);
}

module.exports = {
  name: Events.GuildMemberRemove,
  once: false,
  async execute(member, client) {
    try {
      const guild = member.guild;

      // ── Leave Message ────────────────────────────────────────────
      const settings = (await readData('settings.json')) || {};
      const serverSettings = settings[guild.id] || {};
      if (serverSettings.welcomeEnabled !== false) {
        const channelId = serverSettings.welcomeChannelId;
        if (channelId) {
          const targetChannel = guild.channels.cache.get(channelId);
          if (targetChannel) {
            const template = serverSettings.leaveMessage || '👋 Goodbye {user}... We will miss you!';
            const finalMessage = resolveMessage(template, member, guild);
            if (serverSettings.welcomeEmbed !== false) {
              const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('👋 Goodbye')
                .setDescription(finalMessage)
                .setThumbnail(member.user.displayAvatarURL({ size: 128 }))
                .setFooter({ text: `Member Count: ${guild.memberCount}` })
                .setTimestamp();
              await targetChannel.send({ embeds: [embed] }).catch(() => null);
            } else {
              await targetChannel.send(finalMessage).catch(() => null);
            }
          }
        }
      }

      // ── Invite Tracking ──────────────────────────────────────────
      const invitesCmd = client?.commands?.get('invites');
      if (invitesCmd?.handleMemberLeave) {
        await invitesCmd.handleMemberLeave(member, client).catch(() => null);
      }

    } catch (error) {
      console.error('[GuildMemberRemove] Error:', error.message);
    }
  },
};
