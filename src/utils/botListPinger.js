const https = require('https');

/**
 * Pings the rsdash.net API using Node's core HTTPS module.
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

    // Format the payload structure clean
    const payload = JSON.stringify({
        server_count: Number(serverCount),
        user_count: Number(userCount),
        shard_count: Number(shardCount)
    });

    // Configure core HTTPS options to bypass experimental fetch drops
    const options = {
        hostname: 'www.rsdash.net',
        port: 443,
        path: `/api/v1/bots/${botId}/stats`, // Fixed string interpolation and added correct route paths
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
            'User-Agent': 'ServerMiserDiscordBot/1.0.0 (NodeJS HTTPS-Core)'
        }
    };

    // Execute core network call
    const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            if (res.statusCode === 200 || res.statusCode === 204) {
                console.log(`🚀 [BotList] Stats pushed via core HTTPS! Servers: ${serverCount} | Users: ${userCount}`);
            } else {
                console.error(`⚠️ [BotList] API rejected payload with status ${res.statusCode}:`, data);
            }
        });
    });

    req.on('error', (error) => {
        console.error('🚨 [BotList] Native connection error:', error.message);
    });

    req.write(payload);
    req.end();
}

module.exports = { pingBotList };
