const { ChannelType, EmbedBuilder } = require('discord.js');
const { readData, updateData } = require('../utils/database');

const cooldowns = new Map();

module.exports = {
  name: 'messageCreate',
  async execute(message) {
    if (message.author.bot || message.channel.type === ChannelType.DM) return;

    const guildId = message.guildId;
    const userId = message.author.id;

    // Leveling system
    const cooldownKey = `${guildId}-${userId}`;
    if (cooldowns.has(cooldownKey)) {
      const expirationTime = cooldowns.get(cooldownKey) + 10000;
      if (Date.now() < expirationTime) {
        // Check for prefix commands
        if (message.content.startsWith(message.client.prefix)) {
          await handlePrefixCommand(message);
        }
        return;
      }
    }

    cooldowns.set(cooldownKey, Date.now());

    try {
      const levels = readData('levels.json');
      if (!levels[guildId]) levels[guildId] = {};
      if (!levels[guildId][userId]) levels[guildId][userId] = { level: 1, xp: 0 };

      const xpGain = Math.floor(Math.random() * 41) + 10;
      levels[guildId][userId].xp += xpGain;

      const requiredXp = levels[guildId][userId].level * 100;
      if (levels[guildId][userId].xp >= requiredXp) {
        levels[guildId][userId].level += 1;
        levels[guildId][userId].xp = 0;

        const levelsChannel = message.guild.channels.cache.find(ch => ch.name === 'levels');
        if (levelsChannel) {
          levelsChannel.send(`🎉 ${message.author} has reached level ${levels[guildId][userId].level}!`);
        }
      }

      const { writeData } = require('../utils/database');
      writeData('levels.json', levels);
    } catch (error) {
      console.error('Error in leveling system:', error);
    }

    // Check for prefix commands
    if (message.content.startsWith(message.client.prefix)) {
      await handlePrefixCommand(message);
    }
  },
};

async function handlePrefixCommand(message) {
  const args = message.content.slice(message.client.prefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command = message.client.commands.get(commandName);

  if (!command) return;

  try {
    // Convert to interaction-like object for prefix commands
    const fakeInteraction = {
      user: message.author,
      member: message.member,
      guild: message.guild,
      channel: message.channel,
      reply: async (options) => {
        if (typeof options === 'string') {
          return message.reply(options);
        }
        return message.reply(options);
      },
      deferReply: async () => {},
      editReply: async (options) => {
        return message.reply(options);
      },
      options: {
        getSubcommand: () => null,
        getString: () => null,
        getUser: () => null,
        getBoolean: () => null,
      },
    };

    await command.execute(fakeInteraction);
  } catch (error) {
    console.error(error);
    message.reply('❌ There was an error executing this command!');
  }
}
