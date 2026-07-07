const { Events, ActivityType } = require('discord.js');
// 💥 LINK THE UTILITY: Directly reference your custom analytics file
const { pingBotList } = require('../utils/botListPinger');

module.exports = {
  name: Events.ClientReady, // Correctly bound to your system's V14 event lifecycle handler
  once: true,
  execute(client) {
    console.log(`\n==================================================`);
    console.log(`✅ Success! Bot is live and serving as ${client.user.tag}`);
    console.log(`==================================================\n`);

    // ==========================================
    // MODULE A: HIGH-OCTANE ACTIVITY ROTATOR LOOP 🔄
    // ==========================================
    const statuses = [
      { text: '|help for noobs.', type: ActivityType.Playing },
      { text: 'i am the observer and i will always be observing', type: ActivityType.Watching },
      { text: "formal's new beat is peak", type: ActivityType.Listening },
      { text: 'in a coding match', type: ActivityType.Competing }
    ];

    let currentIndex = 0;

    const updateStatus = () => {
      try {
        const current = statuses[currentIndex];
        client.user.setActivity(current.text, { type: current.type });
        console.log(`[STATUS] Changed activity banner to: "${current.text}"`);
        
        currentIndex = (currentIndex + 1) % statuses.length;
      } catch (err) {
        console.error('❌ [STATUS ERROR] Activity rotator assignment issue:', err.message);
      }
    };

    // Initialize presence instantly on server boot
    updateStatus();
    // Rotates the custom activity banner every 12 hours
    setInterval(updateStatus, 43200000);

    // ==========================================
    // MODULE B: RSDASH AUTOMATED TELEMETRY SYNC 📡
    // ==========================================
    console.log('📡 Igniting automated API telemetry engine for rsdash.net...');

    const sendStatsUpdate = () => {
        try {
            const serverCount = client.guilds.cache.size;
            
            // Sums total members across all servers dynamically out of your cache grid
            const userCount = client.guilds.cache.reduce((acc, guild) => acc + (guild.memberCount || 0), 0);
            
            // Auto-checks for Shard Managers, defaults to 1 if a standard process single instance
            const shardCount = client.shard ? client.shard.count : 1; 

            console.log(`📊 Collecting matrix metrics... (Servers: ${serverCount} | Users: ${userCount} | Shards: ${shardCount})`);
            
            // Fire the native HTTPS script
            pingBotList(serverCount, userCount, shardCount);
        } catch (syncErr) {
            console.error('❌ [TELEMETRY ERROR] Failure gathering local metrics:', syncErr.message);
        }
    };

    // ⚡ Strike 1: Push statistics immediately the moment the process hooks into Discord
    sendStatsUpdate();

    // ⏰ Routine Sync: Keep charts flawless with an updated backend push every 30 minutes
    setInterval(sendStatsUpdate, 30 * 60 * 1000); 
  },
};
