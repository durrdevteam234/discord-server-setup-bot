/**
 * Pings the rsdash.net API using native Node fetch with browser-emulated request headers.
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
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`, 
                'Content-Type': 'application/json',
                // 🌟 FIX: Inject User-Agent to stop Node fetch from failing low-level handshakes
                'User-Agent': 'ServerMiserDiscordBot/1.0.0 (NodeJS Fetch)'
            },
            body: JSON.stringify({
                server_count: Number(serverCount),
                user_count: Number(userCount),
                shard_count: Number(shardCount)
            })
        });

        // Log the structural response status directly
        if (response.ok) {
            console.log(`🚀 [BotList] Stats pushed successfully! Servers: ${serverCount} | Users: ${userCount} | Shards: ${shardCount}`);
        } else {
            const errorText = await response.text();
            console.error(`⚠️ [BotList] API rejected payload with status ${response.status}:`, errorText);
        }
    } catch (error) {
        // Deep error logging to find the exact network breakdown
        console.error('🚨 [BotList] Handshake Exception Encountered:');
        console.error(`   - Message: ${error.message}`);
        console.error(`   - Code: ${error.code || 'No specific system error code provided'}`);
    }
}

module.exports = { pingBotList };
