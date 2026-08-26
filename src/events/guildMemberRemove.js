const { Events, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { readData } = require('../utils/database');
const { generateWelcomeImage } = require('../utils/welcomeImage');

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
          // Cache first, fall back to a live fetch (cache can be empty
          // right after a Render restart / cold start).
          const targetChannel =
            guild.channels.cache.get(channelId) ||
            (await guild.channels.fetch(channelId).catch(() => null));
          if (targetChannel) {
            const template = serverSettings.leaveMessage || '👋 Goodbye {user}... We will miss you!';
            const finalMessage = resolveMessage(template, member, guild);
            const imageEnabled = serverSettings.welcomeImage === true || ['true', 'yes', 'on', '1'].includes(String(serverSettings.welcomeImage).toLowerCase());
            if (imageEnabled) {
              const image = await generateWelcomeImage({
                username: member.user.username,
                serverName: guild.name,
                avatarURL: member.user.displayAvatarURL({ extension: 'png', size: 256 }),
                variant: 'leave',
              });
              if (serverSettings.welcomeEmbed !== false) {
                const imageEmbed = new EmbedBuilder()
                  .setColor('#8a6a2f')
                  .setTitle(member.user.username)
                  .setDescription(`${member.user.username} has left ${guild.name}`)
                  .setImage('attachment://leave.png')
                  .setTimestamp();
                await targetChannel.send({ embeds: [imageEmbed], files: [new AttachmentBuilder(image, { name: 'leave.png' })] }).catch(() => null);
              } else {
                await targetChannel.send({ content: finalMessage, files: [new AttachmentBuilder(image, { name: 'leave.png' })] }).catch(() => null);
              }
            } else if (serverSettings.welcomeEmbed !== false) {
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
          } else {
            console.warn(`[GuildMemberRemove] Configured welcome channel ${channelId} not found in guild ${guild.id}`);
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