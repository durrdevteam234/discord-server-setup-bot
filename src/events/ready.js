const { Events, ActivityType } = require('discord.js');

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

    // Maintain the tracking index strictly inside the bot's memory instance
    let currentIndex = 0;

    const updateStatus = () => {
      try {
        const current = statuses[currentIndex];
        client.user.setActivity(current.text, { type: current.type });
        console.log(`[STATUS] Changed activity banner to: "${current.text}"`);
        
        // Loop continuously to the next index smoothly
        currentIndex = (currentIndex + 1) % statuses.length;
      } catch (err) {
        console.error('❌ [STATUS ERROR] Activity rotator assignment issue:', err.message);
      }
    };

    // ⚡ Set the custom status instantly on startup
    updateStatus();

    // ⏳ Trigger the rotator loop every 12 hours (43200000 ms)
    setInterval(updateStatus, 43200000);
  },
};
