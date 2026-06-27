const { Events } = require('discord.js'); // Updated to use Events enum
const { readData } = require('../utils/database');

module.exports = {
  name: Events.GuildMemberAdd,
  once: false,
  async execute(member) {
    const guild = member.guild;
    const settings = readData('settings.json');
    const serverSettings = settings[guild.id];

    if (!serverSettings) return;

    // 1. Guard: Safely verify that a welcome channel exists before writing to it
    if (serverSettings.welcomeChannelId) {
      const welcomeChannel = guild.channels.cache.get(serverSettings.welcomeChannelId);
      
      if (welcomeChannel) {
        try {
          await welcomeChannel.send(`✨ Welcome to the server, ${member}! We are glad to have you here. ✨`);
        } catch (error) {
          console.error('Failed to send welcome message:', error.message);
        }
      } else {
        console.warn(`⚠️ Saved welcome channel ID was not found in cache for ${guild.name}. Channel was likely wiped.`);
      }
    }

    // 2. Automember Role Assigner (v14 syntax check)
    if (serverSettings.roles && serverSettings.roles[2]) { // index 2 corresponds to your "Member" role in setup.js
      const memberRoleId = serverSettings.roles[2];
      try {
        const role = guild.roles.cache.get(memberRoleId);
        if (role) {
          await member.roles.add(role); // Updated role manager assignment
        }
      } catch (error) {
        console.error(`Failed to automatically assign role to ${member.user.tag}:`, error.message);
      }
    }
  },
};
