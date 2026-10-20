const { Events } = require('discord.js');

// Status rotation, bot-list stats, dashboard stats and analytics refresh all run
// from src/index.js and src/events/analyticsUpdater.js. This file used to start a
// second copy of each, which double-posted stats and made the two status rotators
// and analytics loops fight each other.
module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.log(`\n==================================================`);
    console.log(`✅ Success! Bot is live and serving as ${client.user.tag}`);
    console.log(`==================================================\n`);
  },
};
