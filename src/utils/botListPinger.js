const axios = require('axios');

/**
 * Pings the rsdash.net API to update your bot's live analytics.
 * @param {number} serverCount - Total number of guilds.
 * @param {number} userCount - Total number of users across all guilds.
 * @param {number} shardCount - Total number of shards your bot is running.
 */
async function pingBotList(serverCount, userCount, shardCount) {
    // Using your direct, recommended Bot UUID provided by rsdash
    const botId = '5130a2c5-63f8-4cdc-9c77-797ba44c39f7'; 
    const apiKey = process.env.BOT_LIST_API_KEY;

    if (!apiKey) {
        console.error('[BotList] Missing BOT_LIST_API_KEY environment variable in Render.');
        return;
    }

    // Exact endpoint URL matching the new /api/v1/ rules
    const url = `https://rsdash.net{5130a2c5-63f8-4cdc-9c77-797ba44c39f7}/stats`; 

    try {
        const response = await axios.post(
            url, 
            { 
                server_count: serverCount,
                user_count: userCount,
                shard_count: shardCount
            }, 
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`, 
                    'Content-Type': 'application/json'
                }
            }
        );

        if (response.status === 200 || response.status === 204) {
            console.log(`[BotList] Stats pushed! Servers: ${serverCount} | Users: ${userCount} | Shards: ${shardCount}`);
        }
    } catch (error) {
        console.error('[BotList] Failed to push live stats:', error.response ? error.response.data : error.message);
    }
}

module.exports = { pingBotList };

