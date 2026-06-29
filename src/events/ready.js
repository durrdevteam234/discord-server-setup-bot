const { Events, ActivityType } = require('discord.js');
const db = require('../utils/database'); // Ensure this path points to your database util

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.log(`✅ Success! Bot is live and serving as ${client.user.tag}`);

    const statuses = [
      { text: '|help for noobs.', type: ActivityType.Playing },
      { text: 'i am the observer and i will always be observing', type: ActivityType.Watching },
      { text: "formal's new beat is peak", type: ActivityType.Listening },
      { text: 'in a coding match', type: ActivityType.Competing }
    ];

    const updateStatus = () => {
      let savedData = {};
      let currentIndex = 0;

      // Read last used index from database to persist across restarts
      try {
        savedData = db.readData('status.json') || {};
        currentIndex = savedData.lastIndex || 0;
      } catch (e) {
        currentIndex = 0;
      }

      // Safeguard against manual array size changes
      if (currentIndex >= statuses.length) currentIndex = 0;

      const current = statuses[currentIndex];
      client.user.setActivity(current.text, { type: current.type });
      console.log(`[STATUS] Changed activity banner to: "${current.text}"`);
      
      // Calculate next index and save it safely
      const nextIndex = (currentIndex + 1) % statuses.length;
      db.writeData('status.json', { lastIndex: nextIndex });
    };

    // ⚡ Set the persistent custom status instantly on startup
    updateStatus();

    // ⏳ Trigger the rotator loop every 12 hours (43200000 ms)
    setInterval(updateStatus, 43200000);
  },
};
