'use strict';

const TOPBOT_URL = 'https://topbot.gg/api/v1/bots/1518952247927640276/stats';

async function postTopbotStats(client) {
  const token = process.env.TOPBOT_TOKEN;
  if (!token) {
    console.warn('[Topbot.gg] TOPBOT_TOKEN is not set; skipping stats update.');
    return;
  }

  try {
    const response = await fetch(TOPBOT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        serverCount: client.guilds.cache.size,
        shardCount: client.shard?.count ?? 1,
      }),
    });

    if (!response.ok) {
      console.error('[Topbot.gg]', response.status, await response.text());
      return;
    }

    console.log(`[Topbot.gg] Stats pushed successfully: ${client.guilds.cache.size} servers.`);
  } catch (error) {
    console.error('[Topbot.gg] Stats push failed:', error.message);
  }
}

function startTopbotStats(client) {
  void postTopbotStats(client);
  return setInterval(() => void postTopbotStats(client), 30 * 60 * 1000);
}

module.exports = { postTopbotStats, startTopbotStats };