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

      // 🛑 TOGGLE SECURITY CHECK: Exit instantly if the module is disabled
      if (serverSettings.welcomeEnabled === false) return;

      const channelId = serverSettings.welcomeChannelId;
      if (!channelId) return;

      const targetChannel = guild.channels.cache.get(channelId);
      if (!targetChannel) return;

      const finalMessage = `👋 Goodbye **${member.user.username}**... We will miss you!`;

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
