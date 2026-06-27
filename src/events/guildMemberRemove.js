const { Events } = require('discord.js');
const { readData } = require('../utils/database');

module.exports = {
  name: Events.GuildMemberRemove,
  once: false,
  async execute(member) {
    const guild = member.guild;
    const settings = readData('settings.json');
    const serverSettings = settings[guild.id];

    if (!serverSettings || !serverSettings.welcomeChannelId) return;

    const goodbyeChannel = guild.channels.cache.get(serverSettings.welcomeChannelId);

    // Guard: Prevent trying to announce a departure in a non-existent wiped workspace
    if (!goodbyeChannel) {
      console.warn(`⚠️ Farewell announcement failed: Channel not found in ${guild.name}.`);
      return; 
    }

    try {
      await goodbyeChannel.send(`👋 Goodbye ${member.user.tag}... We will miss you!`);
    } catch (error) {
      console.error('Failed to send exit log message:', error.message);
    }
  },
};
