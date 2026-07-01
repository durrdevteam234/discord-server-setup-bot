const { Events, EmbedBuilder } = require('discord.js');
const { readData } = require('../utils/database');

function resolveMessage(template, member, guild) {
  return template
    .replace(/{user}/g, `${member}`)
    .replace(/{server}/g, guild.name)
    .replace(/{memberCount}/g, guild.memberCount);
}

module.exports = {
  name: Events.GuildMemberAdd,
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
      const template = serverSettings.joinMessage || '✨ Welcome to {server}, {user}! We are glad to have you here. ✨';
      const finalMessage = resolveMessage(template, member, guild);
      const useEmbed = serverSettings.welcomeEmbed !== false; // default true
      if (useEmbed) {
        const embed = new EmbedBuilder()
          .setColor('#00FF00')
          .setTitle('✨ Welcome! ✨')
          .setDescription(finalMessage)
          .setThumbnail(member.user.displayAvatarURL({ size: 128 }))
          .setFooter({ text: `Member Count: ${guild.memberCount}` })
          .setTimestamp();
        await targetChannel.send({ embeds: [embed] }).catch(() => null);
      } else {
        await targetChannel.send(finalMessage).catch(() => null);
      }
    } catch (error) {
      console.error('Welcome join listener error:', error.message);
    }
  },
};