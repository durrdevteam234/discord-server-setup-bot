const discord = require('discord.js');
const audit = require('../utils/auditLog');
const db = require('../utils/database');
const formatter = require('../utils/textFormatter.js');

const xpCooldowns = new Map();

module.exports = {
  name: discord.Events.MessageCreate,
  once: false,
  async execute(message) {
    try {
      if (!message || !message.author || message.author.bot || message.webhookId) return;
      const prefix = message.client.prefix || '|';
      
      // ==========================================
      // PART A: COMMAND PARSING & EXECUTION
      // ==========================================
      if (message.content && message.content.startsWith(prefix)) {
        const args = message.content.slice(prefix.length).trim().split(/ +/);
        if (args.length === 0) return;
        const commandName = args.shift().toLowerCase();

        if (commandName === 'setup') {
          const guild = message.guild; if (!guild) return;
          const member = message.member || await guild.members.fetch(message.author.id).catch(() => null);
          if (!member) return;
          if (!member.permissions.has(discord.PermissionFlagsBits.Administrator) && !member.permissions.has(discord.PermissionFlagsBits.ManageGuild)) {
            return message.reply('❌ Permissions required!').catch(() => null);
          }
          const templateArg = args[0] ? args[0].toLowerCase() : null;
          const clearArg = args[1] ? args[1].toLowerCase() : null;
          const clear = clearArg === 'clear' || clearArg === 'true';
          const validTemplates = ['gaming', 'community', 'study', 'business'];
          if (!templateArg || !validTemplates.includes(templateArg)) {
            return message.reply('❌ Usage: ' + prefix + 'setup <gaming|community|study|business> [clear]').catch(() => null);
          }
          const statusMessage = await message.reply('⏳ Initializing setup...').catch(() => null);
          try {
            let cuteStyle = 'off';
            try { const cuteData = db.readData('cute.json') || {}; cuteStyle = cuteData[guild.id] || 'off'; } catch (e) {}
            const isCuteActive = cuteStyle !== 'off';
            if (clear) {
              if (statusMessage) await statusMessage.edit('🗑️ Clearing channels...').catch(() => null);
              for (const channel of guild.channels.cache.values()) {
                if (channel.id === message.channelId) continue;
                await channel.delete().catch(() => null);
              }
            }
            const genCatName = formatter.formatCute('General', cuteStyle, '🎀');
            const vcCatName = formatter.formatCute('Voice', cuteStyle, '🔊');
            const staffCatName = formatter.formatCute('Staff', cuteStyle, '🔒');
            if (statusMessage) await statusMessage.edit('📁 Creating categories...').catch(() => null);
            const generalCategory = await guild.channels.create({ name: genCatName, type: discord.ChannelType.GuildCategory });
            const voiceCategory = await guild.channels.create({ name: vcCatName, type: discord.ChannelType.GuildCategory });
            const staffCategory = await guild.channels.create({ name: staffCatName, type: discord.ChannelType.GuildCategory });
            if (statusMessage) await statusMessage.edit('👥 Creating roles...').catch(() => null);
            const adminRole = await guild.roles.create({ name: 'Admin', color: '#FF0000' });
            const modRole = await guild.roles.create({ name: 'Moderator', color: '#0099FF' });
            const memberRole = await guild.roles.create({ name: 'Member', color: '#00FF00' });
            if (statusMessage) await statusMessage.edit('📢 Creating channels...').catch(() => null);
            const channels = {
              general: { name: formatter.formatCute('general', cuteStyle, '💬'), parent: generalCategory.id, type: discord.ChannelType.GuildText },
              announcements: { name: formatter.formatCute('announcements', cuteStyle, '📢'), parent: generalCategory.id, type: discord.ChannelType.GuildText },
              'audit-logs': { name: formatter.formatCute('audit-logs', cuteStyle, '📜'), parent: staffCategory.id, type: discord.ChannelType.GuildText },
              'mod-logs': { name: formatter.formatCute('mod-logs', cuteStyle, '🛡️'), parent: staffCategory.id, type: discord.ChannelType.GuildText },
              'staff-chat': { name: formatter.formatCute('staff-chat', cuteStyle, '💬'), parent: staffCategory.id, type: discord.ChannelType.GuildText },
              levels: { name: formatter.formatCute('levels', cuteStyle, '✨'), parent: generalCategory.id, type: discord.ChannelType.GuildText },
              commands: { name: formatter.formatCute('commands', cuteStyle, '🤖'), parent: generalCategory.id, type: discord.ChannelType.GuildText },
            };
            if (templateArg === 'gaming') {
              channels.gaming = { name: formatter.formatCute('gaming', cuteStyle, '🎮'), parent: generalCategory.id, type: discord.ChannelType.GuildText };
              channels['voice-chat'] = { name: formatter.formatCute('voice-chat', cuteStyle, '🎧'), parent: voiceCategory.id, type: discord.ChannelType.GuildVoice };
            } else if (templateArg === 'community') {
              channels.introductions = { name: formatter.formatCute('introductions', cuteStyle, '👋'), parent: generalCategory.id, type: discord.ChannelType.GuildText };
              channels.events = { name: formatter.formatCute('events', cuteStyle, '📅'), parent: generalCategory.id, type: discord.ChannelType.GuildText };
              channels['voice-chat'] = { name: formatter.formatCute('voice-chat', cuteStyle, '🎧'), parent: voiceCategory.id, type: discord.ChannelType.GuildVoice };
            } else if (templateArg === 'study') {
              channels['study-materials'] = { name: formatter.formatCute('study-materials', cuteStyle, '📚'), parent: generalCategory.id, type: discord.ChannelType.GuildText };
              channels['voice-study'] = { name: formatter.formatCute('voice-study', cuteStyle, '✏️'), parent: voiceCategory.id, type: discord.ChannelType.GuildVoice };
            } else if (templateArg === 'business') {
              channels.meetings = { name: formatter.formatCute('meetings', cuteStyle, '💼'), parent: generalCategory.id, type: discord.ChannelType.GuildText };
              channels['voice-meetings'] = { name: formatter.formatCute('voice-meetings', cuteStyle, '👔'), parent: voiceCategory.id, type: discord.ChannelType.GuildVoice };
            }
            let createdGeneralChannelId = null;
            for (const [key, channelData] of Object.entries(channels)) {
              const createdChannel = await guild.channels.create({ name: channelData.name, type: channelData.type, parent: channelData.parent });
              if (key === 'general') createdGeneralChannelId = createdChannel.id;
            }
            const settings = db.readData('settings.json') || {};
            settings[guild.id] = { template: templateArg, channels: Object.keys(channels), welcomeChannelId: createdGeneralChannelId, roles: [adminRole.id, modRole.id, memberRole.id], setupComplete: true, setupDate: new Date().toISOString() };
            db.writeData('settings.json', settings);
            const embed = new discord.EmbedBuilder().setColor(isCuteActive ? '#FF69B4' : '#00FF00').setTitle(isCuteActive ? '✨ Setup Complete! ✨' : '✅ Setup Complete!').addFields({ name: 'Template', value: templateArg, inline: true }, { name: 'Categories', value: '3', inline: true }, { name: 'Channels', value: Object.keys(channels).length.toString(), inline: true });
            if (statusMessage) await statusMessage.edit({ content: ' ', embeds: [embed] }).catch(() => null);
          } catch (error) { console.error(error); }
          return;
        } else if (commandName === 'cute') {
          const guild = message.guild; if (!guild) return;
          if (!message.member.permissions.has(discord.PermissionFlagsBits.Administrator) && !message.member.permissions.has(discord.PermissionFlagsBits.ManageGuild)) {
            return message.reply('❌ Permissions required!').catch(() => null);
          }
          const choice = args[0] ? args[0].toLowerCase() : null;
          const validStyles = ['off', 'wide', 'smallcaps', 'bubbles'];
          if (!choice || !validStyles.includes(choice)) {
            const embed = new discord.EmbedBuilder().setColor('#FF69B4').setTitle('✨ Font Menu ✨').setDescription('Usage: `|cute <choice>`\n• `off` ➡️ Normal\n• `wide` ➡️ ᴡɪᴅᴇ\n• `smallcaps` ➡️ sᴍᴀʟʟᴄᴀᴘs\n• `bubbles` ➡️ ⓑⓤⓑⓑⓛⓔⓢ');
            return message.reply({ embeds: [embed] }).catch(() => null);
          }
          const cuteData = db.readData('cute.json') || {}; cuteData[guild.id] = choice; db.writeData('cute.json', cuteData);
          const successEmbed = new discord.EmbedBuilder().setColor('#00FF00').setTitle('✅ Saved!').setDescription('Layout is now: ' + choice.toUpperCase());
          return message.reply({ embeds: [successEmbed] }).catch(() => null);
        } else {
          // FIXED: Uses the bot's dynamic commands map directly for external files
          const targetCommand = message.client.commands.get(commandName);
          if (targetCommand) {
            await targetCommand.execute(message, args).catch((err) => console.error(`Error running |${commandName}:`, err));
          }
          return;
        }
      }

      // ==========================================
      // PART B: BACKGROUND TRACKING XP ENGINE
      // ==========================================
      const guildId = message.guild?.id;
      if (!guildId) return;

      const mainSettings = db.readData('settings.json') || {};
      const levelingSettings = db.readData('leveling_settings.json') || {};
      
      const mainConfig = mainSettings[guildId] || {};
      const levelConfig = levelingSettings[guildId] || {};

      const isExplicitlyDisabled = 
        mainConfig.leveling === 'off' || mainConfig.leveling === false || mainConfig.leveling === 'disabled' ||
        mainConfig.levelingEnabled === false ||
        levelConfig.enabled === false || levelConfig.status === 'off' || levelConfig.status === 'disabled';

      if (isExplicitlyDisabled) return;

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

        await message.channel.send({ embeds: [embed] }).catch(() => null);
      }

      db.writeData('levels.json', levelsData);

    } catch (globalError) { console.error('XP Error:', globalError); }
  },
};
