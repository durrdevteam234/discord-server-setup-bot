const { Events, EmbedBuilder } = require('discord.js');
const { readData } = require('../utils/database');

module.exports = {
  name: Events.GuildMemberAdd,
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

      // 🔒 HARDCODED EMBED TEXT - Permanent layout
      const finalMessage = `✨ Welcome to the server, ${member}! We are glad to have you here. ✨`;

      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✨ Welcome! ✨')
        .setDescription(finalMessage)
        .setThumbnail(member.user.displayAvatarURL({ size: 128 }))
        .setFooter({ text: `Member Count: ${guild.memberCount}` })
        .setTimestamp();

      await targetChannel.send({ embeds: [embed] }).catch(() => null);

    } catch (error) {
      console.error('Welcome join listener error:', error.message);
    }
  },
};
