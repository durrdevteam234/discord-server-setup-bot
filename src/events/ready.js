const { Events, ActivityType } = require('discord.js');

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.log(`✅ Success! Bot is live and serving as ${client.user.tag}`);

    // 📝 YOUR PERSONAL PRE-WRITTEN STATUSES MAP:
    const statuses = [
      { text: '|help for noobs.', type: ActivityType.Playing },
      { text: 'i am the observer and i will always be observing', type: ActivityType.Watching },
      { text: "formal's new beat is peak", type: ActivityType.Listening },
      { text: 'in a coding match', type: ActivityType.Competing }
    ];

    let index = 0;

    const updateStatus = () => {
      const current = statuses[index];
      client.user.setActivity(current.text, { type: current.type });
      console.log(`[STATUS] Changed activity banner to: "${current.text}"`);
      
      index = (index + 1) % statuses.length;
    };

    // ⚡ Set the first custom status instantly on startup
    updateStatus();

    // ⏳ Trigger the rotator loop every 12 hours (43200000 ms)
    setInterval(updateStatus, 43200000);
  },
};
