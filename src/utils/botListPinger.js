/**
 * Pings the rsdash.net API using native Node fetch to update your bot's live analytics.
 * @param {number} serverCount - Total number of guilds.
 * @param {number} userCount - Total number of users across all guilds.
 * @param {number} shardCount - Total number of shards your bot is running.
 */
async function pingBotList(serverCount, userCount, shardCount) {
    const botId = '5130a2c5-63f8-4cdc-9c77-797ba44c39f7'; 
    const apiKey = process.env.BOT_LIST_API_KEY;

    if (!apiKey) {
        console.error('🚨 [BotList] Missing BOT_LIST_API_KEY environment variable in Render.');
        return;
    }

    const url = `https://rsdash.net{botId}/stats`; 

    try {
        // Using native global fetch since it's already enabled in your Render environment!
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`, 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                server_count: serverCount,
                user_count: userCount,
                shard_count: shardCount
            })
        });

        if (response.ok) {
            console.log(`🚀 [BotList] Stats pushed successfully! Servers: ${serverCount} | Users: ${userCount} | Shards: ${shardCount}`);
        } else {
            const errorText = await response.text();
            console.error(`⚠️ [BotList] API responded with status ${response.status}:`, errorText);
        }
    } catch (error) {
        console.error('🚨 [BotList] Network error pushing live stats:', error.message);
    }
}

module.exports = { pingBotList };
