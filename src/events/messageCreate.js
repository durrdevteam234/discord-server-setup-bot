const { ChannelType, EmbedBuilder } = require('discord.js');
const { readData, writeData } = require('../utils/database');
const { formatCute } = require('../utils/textFormatter.js'); // Import to find styled channels

const cooldowns = new Map();
const PREFIX = '|'; // Set your prefix directly here

module.exports = {
  name: 'messageCreate',
  async execute(message) {
    if (message.author.bot || message.channel.type === ChannelType.DM) return;

    // 1. CHECK FOR PREFIX COMMANDS FIRST
    if (message.content.startsWith(PREFIX)) {
      await handlePrefixCommand(message);
      return; // Stop here so commands don't trigger leveling XP
    }

    const guildId = message.guildId;
    const userId = message.author.id;

    // 2. CHECK IF LEVELING IS TOGGLED ON FOR THIS SERVER
    const settings = readData('settings.json');
    const isLevelingEnabled = settings[guildId]?.levelingEnabled === true;
    if (!isLevelingEnabled) return; // Ignore message for XP tracking if disabled

    // 3. LEVELING SYSTEM & COOLDOWN
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

      const userProfile = levels[guildId][userId];
      const xpGain = Math.floor(Math.random() * 41) + 10;
      userProfile.xp += xpGain;

      const requiredXp = userProfile.level * 100;
      
      if (userProfile.xp >= requiredXp) {
        // Fix duplicate/previous calculation bug by deducting required XP instead of dropping to 0
        userProfile.xp -= requiredXp; 
        userProfile.level += 1;

        // Save immediately before attempting to send messages to prevent race conditions
        levels[guildId][userId] = userProfile;
        writeData('levels.json', levels);

        // Determine the target level channel name depending on active cute styles
        const cuteData = readData('cute.json');
        const cuteStyle = cuteData[guildId] || 'off';
        const targetChannelName = cuteStyle !== 'off' ? formatCute('levels', cuteStyle, '✨') : 'levels';

        // Find the channel safely checking either normal or styled name configurations
        const levelsChannel = message.guild.channels.cache.find(ch => 
          ch.name === 'levels' || ch.name === targetChannelName
        );

        if (levelsChannel) {
          await levelsChannel.send(`🎉 ${message.author} has reached level ${userProfile.level}!`);
        }
      } else {
        // Save normal incremental XP updates
        levels[guildId][userId] = userProfile;
        writeData('levels.json', levels);
      }
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
    const targetUser = message.mentions.users.first();
    const targetMember = message.mentions.members.first();

    const textArgs = args.filter(arg => !arg.startsWith('<@') && !arg.startsWith('<#'));
    const reasonText = textArgs.join(' ');

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
        getString: () => reasonText || null,
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
