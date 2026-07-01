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
  async execute(member) {
    try {
      const guild = member.guild;
      const settings = (await readData('settings.json')) || {};
      const serverSettings = settings[guild.id] || {};
      if (serverSettings.welcomeEnabled === false) return;
      const channelId = serverSettings.welcomeChannelId;
      if (!channelId) return;
      const targetChannel = guild.channels.cache.get(channelId);
      if (!targetChannel) return;
      const template = serverSettings.leaveMessage || '👋 Goodbye {user}... We will miss you!';
      const finalMessage = resolveMessage(template, member, guild);
      const useEmbed = serverSettings.welcomeEmbed !== false; // default true
      if (useEmbed) {
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
    } catch (error) {
      console.error('Welcome leave listener error:', error.message);
    }
  },
};