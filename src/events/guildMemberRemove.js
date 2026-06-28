const { Events, EmbedBuilder } = require('discord.js');
const { readData } = require('../utils/database');

module.exports = {
  name: Events.GuildMemberRemove,
  once: false,
  async execute(member) {
    try {
      const guild = member.guild;
      const settings = readData('settings.json') || {};
      const serverSettings = settings[guild.id] || {};

      const channelId = serverSettings.welcomeChannelId;
      if (!channelId) return;

      const targetChannel = guild.channels.cache.get(channelId);
      if (!targetChannel) return;

      // 🟢 MATCH FIX: Tries loading both possible database keys before falling back to your exact default string
      let rawMessage = serverSettings.leaveMessage || serverSettings.goodbyeMessage || '👋 Goodbye {user}... We will miss you!';

      let finalMessage = rawMessage
        .replace(/{user}/g, `**${member.user.username}**`)
        .replace(/{server}/g, guild.name);

      const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('👋 Goodbye')
        .setDescription(finalMessage)
        .setThumbnail(member.user.displayAvatarURL({ size: 128 }))
        .setFooter({ text: `Member Count: ${guild.memberCount}` })
        .setTimestamp();

      await targetChannel.send({ embeds: [embed] }).catch(() => null);

    } catch (error) {
      console.error('Welcome leave listener error:', error.message);
    }
  },
};
