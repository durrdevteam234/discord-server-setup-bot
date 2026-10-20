const { Events } = require('discord.js');
const mongoose = require('mongoose');

function buildLabels(style, totalMembers, totalHumans, totalBots) {
  if (style === 'tech') {
    return {
      categoryName: '⚙️ DATA CORE ──',
      totalLabel: `├ 🛰️ ALL FIELDS: ${totalMembers}`,
      humansLabel: `├ 👥 POPULATION: ${totalHumans}`,
      botsLabel: `└ 🤖 CONNECTORS: ${totalBots}`,
    };
  }

  if (style === 'secure') {
    return {
      categoryName: '🔒 PROTECTION METRICS',
      totalLabel: `🔒 Verified Node: ${totalMembers}`,
      humansLabel: `🔒 Human Access: ${totalHumans}`,
      botsLabel: `🔒 Core Apps: ${totalBots}`,
    };
  }

  return {
    categoryName: '📊 SERVER STATS',
    totalLabel: `👥 Total Members: ${totalMembers}`,
    humansLabel: `🙋 Humans: ${totalHumans}`,
    botsLabel: `🤖 Bots: ${totalBots}`,
  };
}

async function getMemberCounts(guild) {
  const totalMembers = guild.memberCount || 0;

  // With the GuildMembers intent the cache stays complete once it has been
  // filled, so only fetch the whole member list when the cache is short.
  let totalBots = 0;
  try {
    const members = guild.members.cache.size >= totalMembers ? guild.members.cache : await guild.members.fetch();
    totalBots = members.filter((m) => m.user.bot).size || 0;
  } catch (err) {
    totalBots = guild.members.cache.filter((m) => m.user.bot).size || 0;
  }

  const totalHumans = Math.max(0, totalMembers - totalBots);
  return { totalMembers, totalBots, totalHumans };
}

async function runLiveAnalyticsSync(guild) {
  if (!guild) return;

  try {
    const AnalyticsModel = mongoose.models.AnalyticsRule;
    if (!AnalyticsModel) return;

    const doc = await AnalyticsModel.findOne({ guildId: guild.id }).catch(() => null);
    if (!doc || !doc.enabled || !doc.categoryId) return;

    const { totalMembers, totalBots, totalHumans } = await getMemberCounts(guild);
    const { categoryName, totalLabel, humansLabel, botsLabel } = buildLabels(
      doc.labelStyle || 'clean',
      totalMembers,
      totalHumans,
      totalBots
    );

    const category = guild.channels.cache.get(doc.categoryId);
    if (category && category.name !== categoryName) {
      await category.setName(categoryName).catch(() => null);
    }

    if (doc.totalChannelId) {
      const totalChannel = guild.channels.cache.get(doc.totalChannelId);
      if (totalChannel && totalChannel.name !== totalLabel) {
        await totalChannel.setName(totalLabel).catch(() => null);
      }
    }

    if (doc.humansChannelId) {
      const humansChannel = guild.channels.cache.get(doc.humansChannelId);
      if (humansChannel && humansChannel.name !== humansLabel) {
        await humansChannel.setName(humansLabel).catch(() => null);
      }
    }

    if (doc.botsChannelId) {
      const botsChannel = guild.channels.cache.get(doc.botsChannelId);
      if (botsChannel && botsChannel.name !== botsLabel) {
        await botsChannel.setName(botsLabel).catch(() => null);
      }
    }
  } catch (err) {
    console.error('[Analytics Event Sync Error]:', err.message);
  }
}

// Discord allows 2 renames per channel every 10 minutes. Syncing on every member
// join/leave queued renames faster than that, so syncs are coalesced to at most
// one per guild every 5 minutes.
const SYNC_INTERVAL_MS = 5 * 60 * 1000;
const lastSync = new Map();
const pendingSync = new Map();

function scheduleSync(guild) {
  if (!guild || pendingSync.has(guild.id)) return;
  const delay = Math.max(0, (lastSync.get(guild.id) || 0) + SYNC_INTERVAL_MS - Date.now());
  pendingSync.set(guild.id, setTimeout(async () => {
    pendingSync.delete(guild.id);
    lastSync.set(guild.id, Date.now());
    await runLiveAnalyticsSync(guild);
  }, delay));
}

async function preloadGuildMembers(client) {
  if (!client?.guilds?.cache) return;

  for (const guild of client.guilds.cache.values()) {
    await guild.members.fetch().catch(() => null);
  }
}

async function refreshAllAnalyticsGuilds(client) {
  if (!client?.guilds?.cache) return;

  const AnalyticsModel = mongoose.models.AnalyticsRule;
  if (!AnalyticsModel) return;
  const docs = await AnalyticsModel.find({ enabled: true }, { guildId: 1 }).lean().catch(() => []);
  for (const doc of docs) scheduleSync(client.guilds.cache.get(doc.guildId));
}

module.exports = [
  {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
      await refreshAllAnalyticsGuilds(client);
      setInterval(() => refreshAllAnalyticsGuilds(client).catch(() => null), 60 * 1000);
    },
  },
  {
    name: Events.GuildMemberAdd,
    once: false,
    async execute(member) {
      scheduleSync(member.guild);
    },
  },
  {
    name: Events.GuildMemberRemove,
    once: false,
    async execute(member) {
      scheduleSync(member.guild);
    },
  },
  {
    name: Events.GuildUpdate,
    once: false,
    async execute(oldGuild, newGuild) {
      if (oldGuild.premiumSubscriptionCount !== newGuild.premiumSubscriptionCount) {
        scheduleSync(newGuild);
      }
    },
  },
  {
    name: Events.RoleCreate,
    once: false,
    async execute(role) {
      scheduleSync(role.guild);
    },
  },
  {
    name: Events.RoleDelete,
    once: false,
    async execute(role) {
      scheduleSync(role.guild);
    },
  },
];
