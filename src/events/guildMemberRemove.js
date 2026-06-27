const { EmbedBuilder } = require('discord.js');
const { readData } = require('../utils/database');
const { formatCute } = require('../utils/textFormatter.js');

module.exports = {
  name: 'guildMemberRemove',
  async execute(member) {
    const guildId = member.guild.id;
    const settings = readData('settings.json');
    const config = settings[guildId];

    if (!config || !config.welcomeEnabled || !config.welcomeChannel) return;

    const channel = member.guild.channels.cache.get(config.welcomeChannel);
    if (!channel) return;

    const rawText = config.leaveText || '{user} has left the server. 😢';
    const formattedText = rawText
      .replace(/{user}/g, `**${member.user.tag}**`)
      .replace(/{server}/g, member.guild.name);

    // Fetch the server's cute font choice
    const cuteData = readData('cute.json');
    const cuteStyle = cuteData[guildId] || 'off';
    const embedTitle = cuteStyle !== 'off' ? formatCute('Member Left', cuteStyle, '👋') : '👋 Member Left';

    const embed = new EmbedBuilder()
      .setColor('#808080')
      .setTitle(embedTitle)
      .setDescription(formattedText)
      .setThumbnail(member.user.displayAvatarURL({ forceStatic: false }))
      .setTimestamp()
      .setFooter({ text: `Total Members: ${member.guild.memberCount}` });

    try {
      await channel.send({ embeds: [embed] });
    } catch (err) {
      console.error('Failed to send leave embed:', err);
    }
  }
};

