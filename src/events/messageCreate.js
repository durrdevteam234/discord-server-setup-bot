const discord = require('discord.js');
const audit = require('../utils/auditLog');
const db = require('../utils/database');
const formatter = require('../utils/textFormatter.js');
const mongoose = require('mongoose');

const xpCooldowns = new Map();

module.exports = {
  name: discord.Events.MessageCreate,
  once: false,
  async execute(message, client) {
    try {
      // 1. Safety Gate: Completely ignore bots, webhooks, and empty contents
      if (!message || !message.author || message.author.bot || message.webhookId) return;
      if (!message.content) return; 
      
      const prefix = client?.prefix || '|';
      // ==========================================
      // 🛡️ BACKGROUND AUTOMOD CRITERIA MESSAGE SCANNER (FULL 20-PARAM EXECUTOR)
      // ==========================================
      try {
        const AutoModModel = mongoose.models.AutoModRule;
        const recentMessages = global.recentMessagesMap || (global.recentMessagesMap = new Map());
        const linkCooldowns = global.linkCooldownsMap || (global.linkCooldownsMap = new Map());
        const mentionCooldowns = global.mentionCooldownsMap || (global.mentionCooldownsMap = new Map());
        const stickerCooldowns = global.stickerCooldownsMap || (global.stickerCooldownsMap = new Map());

        if (AutoModModel && message.guild && !message.member?.permissions.has(discord.PermissionFlagsBits.ManageMessages)) {
          const automodConfig = await AutoModModel.findOne({ guildId: message.guild.id });
          if (automodConfig && automodConfig.rules && automodConfig.rules.size > 0) {
            
            let violatesFilter = null;
            const content = message.content;
            const contentLower = content.toLowerCase();
            const now = Date.now();
            const userKey = `${message.guild.id}-${message.author.id}`;

            automodConfig.rules.forEach((rule) => {
              if (!rule.enabled) return;

              // 1. ALL CAPS
              if (rule.filterType === 'all_caps' && content.length > 6) {
                const letters = content.replace(/[^a-zA-Z]/g, '');
                if (letters.length > 0 && letters === letters.toUpperCase()) violatesFilter = rule;
              }
              // 2. BAD WORDS
              if (rule.filterType === 'bad_words') {
                const blacklist = ['backdoor', 'exploit', 'tokengrabber']; 
                if (blacklist.some(word => contentLower.includes(word))) violatesFilter = rule;
              }
              // 3. CHAT CLEARING NEW LINES
              if (rule.filterType === 'new_lines' && (content.match(/\n/g) || []).length > 8) {
                violatesFilter = rule;
              }
              // 4. DUPLICATE TEXTS
              if (rule.filterType === 'duplicate_texts') {
                const userHistory = recentMessages.get(userKey) || [];
                if (userHistory.includes(contentLower)) violatesFilter = rule;
              }
              // 5. CHARACTER COUNT
              if (rule.filterType === 'character_count' && content.length > 1500) {
                violatesFilter = rule;
              }
              // 6. EMOJI SPAM
              if (rule.filterType === 'emoji_spam') {
                const emojiMatch = content.match(/<a?:.+?:\d+>|[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g);
                if (emojiMatch && emojiMatch.length > 6) violatesFilter = rule;
              }
              // 7. FAST MESSAGE SPAM
              if (rule.filterType === 'fast_spam') {
                const timestamps = recentMessages.get(`${userKey}-times`) || [];
                timestamps.push(now);
                const activeBursts = timestamps.filter(t => now - t < 4000);
                recentMessages.set(`${userKey}-times`, activeBursts);
                if (activeBursts.length > 4) violatesFilter = rule;
              }
              // 8. IMAGE SPAM
              if (rule.filterType === 'image_spam' && message.attachments.size > 3) {
                violatesFilter = rule;
              }
              // 9. INVITE LINKS
              if (rule.filterType === 'invite_links' && /(discord\.gg|discord\.com\/invite)/.test(contentLower)) {
                violatesFilter = rule;
              }
              // 10. LINKS
              if (rule.filterType === 'links' && /(https?:\/\/[^\s]+)/.test(contentLower)) {
                violatesFilter = rule;
              }
              // 11. LINKS COOLDOWN
              if (rule.filterType === 'links_cooldown' && /(https?:\/\/[^\s]+)/.test(contentLower)) {
                const lastLink = linkCooldowns.get(userKey) || 0;
                if (now - lastLink < 15000) violatesFilter = rule;
                else linkCooldowns.set(userKey, now);
              }
              // 12. MASS MENTIONS
              if (rule.filterType === 'mass_mentions' && (message.mentions.users.size + message.mentions.roles.size) > 4) {
                violatesFilter = rule;
              }
              // 13. MENTIONS COOLDOWN
              if (rule.filterType === 'mentions_cooldown' && (message.mentions.users.size > 0)) {
                const lastMention = mentionCooldowns.get(userKey) || 0;
                if (now - lastMention < 10000) violatesFilter = rule;
                else mentionCooldowns.set(userKey, now);
              }
              // 14. SPOILERS
              if (rule.filterType === 'spoilers' && content.includes('||')) {
                violatesFilter = rule;
              }
              // 15. MASKED LINKS
              if (rule.filterType === 'masked_links' && /\[.+?\]\(https?:\/\/[^\s]+\)/.test(contentLower)) {
                violatesFilter = rule;
              }
              // 16. STICKERS
              if (rule.filterType === 'stickers' && message.stickers.size > 0) {
                violatesFilter = rule;
              }
              // 17. STICKERS COOLDOWN
              if (rule.filterType === 'stickers_cooldown' && message.stickers.size > 0) {
                const lastSticker = stickerCooldowns.get(userKey) || 0;
                if (now - lastSticker < 12000) violatesFilter = rule;
                else stickerCooldowns.set(userKey, now);
              }
              // 18. ZALGO TEXT
              if (rule.filterType === 'zalgo_text' && /[\u0300-\u036F\u1DC0-\u1DFF\u20D0-\u20FF\uFE20-\uFE2F]{6,}/.test(content)) {
                violatesFilter = rule;
              }
              // 19. KNOWN PHISHING LINKS
              if (rule.filterType === 'phishing_links' && /(https?:\/\/[^\s]+)/.test(contentLower)) {
                const phishingSignatures = [
                  'dlscord-', 'discord-nitro', 'discorcl', 'discord-app', 'discords',
                  'free-nitro', 'steam-nitro', 'boost-nitro', 'nitro-gift', 'giveaway-nitro',
                  'cliscord', 'd1scord', 'gift-discord', 'nitro-drop', 'claim-nitro',
                  'collab-land', 'metamask-security', 'phantom-wallet-update', 'airdrop-claim'
                ];
                if (phishingSignatures.some(sig => contentLower.includes(sig))) {
                  violatesFilter = rule;
                  if (!rule.actions.includes('block_message')) rule.actions.push('block_message');
                  if (!rule.actions.includes('timeout_user')) rule.actions.push('timeout_user');
                }
              }
              // 20. RAID BOT DEFENSES
              if (rule.filterType === 'raid_bots') {
                const isNewAccount = (now - message.author.createdTimestamp) < 432000000;
                const containsMassLinks = (contentLower.match(/(https?:\/\/[^\s]+)/g) || []).length > 2;
                const userHistory = recentMessages.get(userKey) || [];
                
                if (isNewAccount && (containsMassLinks || userHistory.length >= 2)) {
                  violatesFilter = rule;
                  if (!rule.actions.includes('block_message')) rule.actions.push('block_message');
                  if (message.member?.kickable && !rule.actions.includes('kick_user')) rule.actions.push('kick_user');
                }
              }
            });

            if (!violatesFilter) {
              const history = recentMessages.get(userKey) || [];
              history.push(contentLower);
              if (history.length > 3) history.shift();
              recentMessages.set(userKey, history);
            } else {
              if (violatesFilter.actions.includes('block_message')) {
                await message.delete().catch(() => null);
                await message.channel.send(`⚠️ ${message.author}, flagged by AutoMod filter: **${violatesFilter.ruleName}**!`).then(m => setTimeout(() => m.delete().catch(() => null), 4000));
              }
              if (violatesFilter.actions.includes('timeout_user') && message.member?.moderatable) {
                await message.member.timeout(300000, `AutoMod Violation: ${violatesFilter.ruleName}`).catch(() => null);
              }
              if (violatesFilter.actions.includes('kick_user') && message.member?.kickable) {
                await message.member.kick(`AutoMod Escalation: ${violatesFilter.ruleName}`).catch(() => null);
              }
              if (violatesFilter.actions.includes('log_to_channel')) {
                 const logChannel = message.guild.channels.cache.find(c => c.name.includes('mod-logs'));
                 if (logChannel) {
                    const alert = new discord.EmbedBuilder()
                      .setTitle('🚨 AutoMod Rule Violation Intercepted')
                      .setColor('#ED4245')
                      .setDescription(`User ${message.author} triggered safety filter \`${violatesFilter.filterType.toUpperCase()}\`.`)
                      .setTimestamp();
                    await logChannel.send({ embeds: [alert] }).catch(() => null);
                 }
              }
              return; 
            }
          }
        }
      } catch (err) {
        console.error('[AutoMod Engine Scanner Error]:', err.message);
      }
      // ==========================================
      // PART A: COMMAND PARSING & EXECUTION
      // ==========================================
      if (message.content.startsWith(prefix)) {
        const argsArray = message.content.slice(prefix.length).trim().split(/ +/);
        if (argsArray.length === 0) return;
        
        const commandName = argsArray.shift().toLowerCase();
        const rawArgsString = argsArray.join(' ').trim();

        const mainSettings = db.readData('settings.json') || {};
        const currentGuildSettings = mainSettings[message.guild?.id] || {};
        const coreUtilityCommands = ['setup', 'cute', 'fun-module', 'fun-menu', 'autorole', 'automodrule', 'ticket', 'verification', 'mod-logs-toggle','analytics','clearroles','clear-channels']; 
        
        if (!coreUtilityCommands.includes(commandName)) {
          if (currentGuildSettings.funModule === 'disabled' || currentGuildSettings.funModule === false) {
            return message.reply('❌ The complete **Fun Command Suite** has been globally disabled by a server administrator.').catch(() => null);
          }
        }

        // ========================================================
        // 🚨 COMPREHENSIVE ARCHITECTURE WHITELIST MUTATION 🚨
        // ========================================================
        if (commandName === 'setup') {
          const guild = message.guild; if (!guild) return;
          const member = message.member || await guild.members.fetch(message.author.id).catch(() => null);
          if (!member) return;
          if (!member.permissions.has(discord.PermissionFlagsBits.Administrator) && !member.permissions.has(discord.PermissionFlagsBits.ManageGuild)) {
            return message.reply('❌ Permissions required! You need Administrator access to wipe or provision rooms.').catch(() => null);
          }
          
          const templateArg = argsArray[0] ? argsArray[0].toLowerCase().trim() : null;
          const clearArg = argsArray[1] ? argsArray[1].toLowerCase().trim() : null;
          const clear = clearArg === 'clear' || clearArg === 'true';
          
          // Fully expanded verification matrix handling all 11 predefined templates cleanly!
          const validTemplates = ['gaming', 'community', 'study', 'business', 'creative', 'development', 'finance', 'roleplay', 'minimalist', 'history', 'geography'];
          
          if (!templateArg || !validTemplates.includes(templateArg)) {
            return message.reply(`❌ **Usage:** \`${prefix}setup <${validTemplates.join('|')}> [clear]\``).catch(() => null);
          }
        }

        const targetCommand = client.commands.get(commandName);
        if (targetCommand && typeof targetCommand.execute === 'function') {
          let resolvedTargetUser = message.mentions.users.first() || message.author;
          let resolvedTargetMember = message.mentions.members.first() || message.member;
          let activeBotResponse = null;

          const mockInteraction = {
            id: message.id,
            commandName: commandName,
            guild: message.guild,
            guildId: message.guildId,
            channel: message.channel,
            channelId: message.channelId,
            user: message.author,
            member: message.member,
            replied: false,
            deferred: false,
            options: {
              getSubcommand: () => argsArray[0] || null,
              getString: (name) => name === 'template' || name === 'subcommand' || name === 'status' || name === 'role' ? argsArray.join(' ').trim() : (rawArgsString.length > 0 ? rawArgsString : null),
              getUser: (name) => resolvedTargetUser,
              getMember: (name) => resolvedTargetMember,
              getRole: (name) => message.guild ? (message.mentions.roles.first() || message.guild.roles.cache.get(argsArray[0]) || message.guild.roles.cache.find(r => r.name.toLowerCase() === argsArray.slice(1).join(' ').toLowerCase())) : null,
              getChannel: (name) => message.mentions.channels.first() || message.channel,
              getBoolean: (name) => argsArray.includes('clear') || argsArray.includes('true'),
              getInteger: (name) => {
                const processedInt = parseInt(argsArray[0]);
                return isNaN(processedInt) ? null : processedInt;
              },
              getAttachment: (name) => {
                const nativeAttachment = message.attachments.first();
                if (nativeAttachment) return nativeAttachment;
                if (rawArgsString.startsWith('http://') || rawArgsString.startsWith('https://')) {
                  return { url: rawArgsString, proxyURL: rawArgsString };
                }
                return null;
              },
              get: (name) => {
                if (name === 'image' || name === 'file' || name === 'attachment' || name === 'url' || name === 'link') {
                  const nativeAttachment = message.attachments.first();
                  if (nativeAttachment) return { attachment: nativeAttachment, value: nativeAttachment.id };
                  if (rawArgsString.startsWith('http://') || rawArgsString.startsWith('https://')) {
                    return { value: rawArgsString, attachment: { url: rawArgsString, proxyURL: rawArgsString } };
                  }
                }
                return { value: rawArgsString || null };
              }
            },
            reply: async (options) => {
              if (mockInteraction.replied || mockInteraction.deferred) return mockInteraction.editReply(options);
              mockInteraction.replied = true;
              if (typeof options === 'string') {
                activeBotResponse = await message.reply({ content: options }).catch(() => null);
              } else {
                if (options && options.flags) delete options.flags; 
                activeBotResponse = await message.reply(options).catch(() => null);
              }
              return activeBotResponse;
            },
            editReply: async (options) => {
              mockInteraction.replied = true;
              if (activeBotResponse) {
                if (typeof options === 'string') return await activeBotResponse.edit({ content: options }).catch(() => null);
                if (options && options.flags) delete options.flags;
                return await activeBotResponse.edit(options).catch(() => null);
              } else {
                if (typeof options === 'string') {
                  activeBotResponse = await message.reply({ content: options }).catch(() => null);
                } else {
                  if (options && options.flags) delete options.flags;
                  activeBotResponse = await message.reply(options).catch(() => null);
                }
                return activeBotResponse;
              }
            },
            followUp: async (options) => {
              if (typeof options === 'string') return message.channel.send({ content: options });
              if (options && options.flags) delete options.flags;
              return message.channel.send(options);
            },
            deferReply: async (options) => {
              mockInteraction.deferred = true;
              return null;
            },
            deleteReply: async () => {
              if (activeBotResponse && typeof activeBotResponse.delete === 'function') {
                await activeBotResponse.delete().catch(() => null);
              }
              return null;
            }
          };

          try {
            await targetCommand.execute(mockInteraction, client);
          } catch (err) {
            console.error(`Execution failure inside hybrid command |${commandName}:`, err);
            message.reply('❌ There was an internal error executing this command!').catch(() => null);
          }
          return;
        }
      }
      // ==========================================
      // PART B: BACKGROUND TRACKING XP ENGINE
      // ==========================================
      const guildId = message.guild?.id;
      if (!guildId) return;

      const mainSettingsLocal = db.readData('settings.json') || {};
      const guildSettingsLocal = mainSettingsLocal[guildId] || {};

      const levelingSettings = db.readData('leveling_settings.json') || {};
      const levelConfig = levelingSettings[guildId] || {};

      const targetStatus = levelConfig.status || levelConfig._doc?.status || levelConfig.enabled || levelConfig._doc?.enabled;
      const mainLevelingStatus = guildSettingsLocal.leveling || guildSettingsLocal._doc?.leveling;

      const isLevelingActive = 
        (mainLevelingStatus === 'on' || mainLevelingStatus === true) ||
        (targetStatus === 'on' || targetStatus === true);

      if (!isLevelingActive) return; 

      const cooldownKey = `${guildId}-${message.author.id}`;
      const now = Date.now();
      if (xpCooldowns.has(cooldownKey) && now < (xpCooldowns.get(cooldownKey) + 60000)) return; 
      xpCooldowns.set(cooldownKey, now);

      const levelsData = db.readData('levels.json') || {};
      if (!levelsData[guildId]) levelsData[guildId] = {};
      if (!levelsData[guildId][message.author.id]) {
        levelsData[guildId][message.author.id] = { xp: 0, level: 0 };
      }

      const userProfile = levelsData[guildId][message.author.id];
      const xpGained = Math.floor(Math.random() * 11) + 15; 
      userProfile.xp += xpGained;
      const xpNeeded = (userProfile.level + 1) * 100;

      if (userProfile.xp >= xpNeeded) {
        userProfile.level += 1;
        userProfile.xp = 0;

        let cuteStyle = 'off';
        try { const cuteData = db.readData('cute.json') || {}; cuteStyle = cuteData[guildId] || 'off'; } catch (e) {}
        const isCuteActive = cuteStyle !== 'off';

        const embed = new discord.EmbedBuilder()
          .setColor(isCuteActive ? '#FF69B4' : '#00FF00')
          .setTitle(isCuteActive ? '✨ LEVEL UP! ✨' : '🎉 Level Up!')
          .setDescription(
            isCuteActive 
              ? `GG **${message.author.username}**! You just reached level **${userProfile.level}**! 💕`
              : `GG **${message.author.tag}**, you have advanced to level **${userProfile.level}**!`
          )
          .setThumbnail(message.author.displayAvatarURL({ dynamic: true }));

        let targetChannelId = levelConfig.channelId || 
                              levelConfig._doc?.channelId || 
                              levelConfig.settings?.channelId || 
                              guildSettingsLocal.channelId ||
                              guildSettingsLocal._doc?.channelId;

        let targetChannel = message.channel;
        if (targetChannelId && typeof targetChannelId === 'string') {
          try {
            targetChannel = message.guild.channels.cache.get(targetChannelId) || 
                            await message.guild.channels.fetch(targetChannelId) || 
                            message.channel;
          } catch (fetchError) {
            targetChannel = message.channel;
          }
        }

        await targetChannel.send({ embeds: [embed] }).catch(() => null);
      }

      db.writeData('levels.json', levelsData);

    } catch (globalError) { 
      console.error('XP Global Catch Error:', globalError); 
    }
  },
};
