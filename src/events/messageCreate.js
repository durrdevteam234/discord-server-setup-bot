const { ChannelType, EmbedBuilder } = require('discord.js');
const { readData, updateData } = require('../utils/database');

const cooldowns = new Map();
const PREFIX = '|'; // Set your prefix directly here

module.exports = {
  name: 'messageCreate',
  async execute(message) {
    if (message.author.bot || message.channel.type === ChannelType.DM) return;

    // 1. CHECK FOR PREFIX COMMANDS FIRST
    // This runs instantly on every message and avoids all leveling code
    if (message.content.startsWith(PREFIX)) {
      await handlePrefixCommand(message);
      return; // Stop here so commands don't trigger leveling XP
    }

    const guildId = message.guildId;
    const userId = message.author.id;

    // 2. LEVELING SYSTEM & COOLDOWN
    const cooldownKey = `${guildId}-${userId}`;
    if (cooldowns.has(cooldownKey)) {
      const expirationTime = cooldowns.get(cooldownKey) + 10000;
      if (Date.now() < expirationTime) {
        return; // User is on cooldown, ignore for leveling
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
  },
};

async function handlePrefixCommand(message) {
  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command = message.client.commands.get(commandName);
  if (!command) return;

  try {
    // 1. Extract the mentioned user/member
    const targetUser = message.mentions.users.first();
    const targetMember = message.mentions.members.first();

    // 2. Extract any text after the mention (like the reason for a ban/warn)
    const textArgs = args.filter(arg => !arg.startsWith('<@') && !arg.startsWith('<#'));
    const reasonText = textArgs.join(' ');

    // Convert to a smarter interaction-like object for prefix commands
    const fakeInteraction = {
      client: message.client,
      user: message.author,
      member: message.member,
      guild: message.guild,
      channel: message.channel,
      reply: async (options) => {
        return message.reply(options);
      },
      deferReply: async () => {},
      editReply: async (options) => {
        return message.reply(options);
      },
      options: {
        getSubcommand: () => null,
        // Returns the text argument if the command asks for a string
        getString: () => reasonText || null,
        // Returns the actual tagged user instead of null!
        getUser: () => targetUser || null,
        getMember: () => targetMember || null,
        getBoolean: () => null,
      },
    };

    await command.execute(fakeInteraction);
  } catch (error) {
    console.error(error);
    message.reply('❌ There was an error executing this command!');
  }
}
