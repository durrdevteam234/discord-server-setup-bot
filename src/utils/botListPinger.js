const https = require('https');

/**
 * Pings the BotNexus (rsdash) API with the owner's exact specifications!
 */
async function pingBotList(serverCount, userCount, shardCount) {
    const botId = '5130a2c5-63f8-4cdc-9c77-797ba44c39f7'; 
    const apiKey = process.env.BOT_LIST_API_KEY;

    if (!apiKey) {
        console.error('🚨 [BotNexus] Missing BOT_LIST_API_KEY environment variable.');
        return;
    }

    // 🎯 MATCHING THE OWNER'S EXACT PAYLOAD! 
    const payload = JSON.stringify({
        platform: 'discord',
        server_count: Number(serverCount),
        user_count: Number(userCount) // Sending total members so it never says 0!
    });

    const options = {
        hostname: 'www.rsdash.net',
        port: 443,
        path: `/api/v1/bots/${botId}/stats`,
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
            'User-Agent': 'ServerMiserDiscordBot/1.0.0 (NodeJS HTTPS-Core)'
        }
    };

    const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            try {
                // 🔍 PARSING THE RESPONSE BODY FROM THE OWNER!
                const responseData = JSON.parse(data);
                
                if (res.statusCode === 200 || res.statusCode === 204 || responseData.ok) {
                    console.log(`\n🚀 [BotNexus Sync Success!]`);
                    console.log(`   - Saved Server Count: ${responseData.server_count}`);
                    console.log(`   - Is Clamped?: ${responseData.clamped ? 'YES 🛡️ (Discord gatekeeper is holding your true count back)' : 'NO ✅'}`);
                    console.log(`   - Raw Return: ${data}\n`);
                } else {
                    console.error(`⚠️ [BotNexus] Rejected with status ${res.statusCode}:`, data);
                }
            } catch (parseErr) {
                // If the response isn't JSON, print the raw text
                console.log(`🚀 [BotNexus] Stats pushed! Status: ${res.statusCode}. Body: ${data}`);
            }
        });
    });

    req.on('error', (error) => {
        console.error('🚨 [BotNexus] Connection error:', error.message);
    });

    req.write(payload);
    req.end();
}

module.exports = { pingBotList };
