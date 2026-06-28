const discord = require('discord.js');
const audit = require('../utils/auditLog');
const db = require('../utils/database');
const formatter = require('../utils/textFormatter.js');

module.exports = {
  name: discord.Events.MessageCreate,
  once: false,
  async execute(message) {
    try {
      if (!message || !message.author || message.author.bot || message.webhookId) return;

      const prefix = message.client.prefix || '|';
      if (!message.content || !message.content.startsWith(prefix)) return;

      const args = message.content.slice(prefix.length).trim().split(/ +/);
      if (args.length === 0) return;
      
      const commandName = args.shift().toLowerCase();

      if (commandName === 'setup') {
        const guild = message.guild;
        if (!guild) return;

        const member = message.member || await guild.members.fetch(message.author.id).catch(() => null);
        if (!member) return;

        if (!member.permissions.has(discord.PermissionFlagsBits.Administrator) && 
            !member.permissions.has(discord.PermissionFlagsBits.ManageGuild)) {
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
          try {
            const cuteData = db.readData('cute.json') || {};
            cuteStyle = cuteData[guild.id] || 'off';
          } catch (dbErr) {
            console.error(dbErr.message);
          }
          
          const isCuteActive = cuteStyle !== 'off';

          if (clear) {
            if (statusMessage) await statusMessage.edit('🗑️ Clearing channels...').catch(() => null);
            for (const channel of guild.channels.cache.values()) {
              if (channel.id === message.channelId) continue; 
              try {
                await channel.delete();
                try { await audit.logAction(guild, 'Channel Deleted', message.author, 'Channel: ' + channel.name); } catch(e){}
              } catch (e) {}
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
            const createdChannel = await guild.channels.create({
              name: channelData.name,
              type: channelData.type,
              parent: channelData.parent,
            });
            
            if (key === 'general') createdGeneralChannelId = createdChannel.id;
            try { await audit.logAction(guild, 'Channel Created', message.author, 'Channel: ' + channelData.name); } catch(e){}
          }

          try {
            const settings = db.readData('settings.json') || {};
            settings[guild.id] = { 
              template: templateArg, 
              channels: Object.keys(channels), 
              welcomeChannelId: createdGeneralChannelId,
              roles: [adminRole.id, modRole.id, memberRole.id],
              setupComplete: true,
              setupDate: new Date().toISOString(),
            };
            db.writeData('settings.json', settings);
          } catch (dbErr) {}

          const embed = new discord.EmbedBuilder()
            .setColor(isCuteActive ? '#FF69B4' : '#00FF00')
            .setTitle(isCuteActive ? '✨ Server Setup Complete! ✨' : '✅ Server Setup Complete!')
            .addFields(
              { name: 'Template', value: templateArg, inline: true },
              { name: 'Categories Created', value: '3', inline: true },
              { name: 'Channels Created', value: Object.keys(channels).length.toString(), inline: true }
            );

          if (statusMessage) {
            await statusMessage.edit({ content: ' ', embeds: [embed] }).catch(() => null);
          }

          if (clear) {
            const originChannel = guild.channels.cache.get(message.channelId);
            if (originChannel) await originChannel.delete().catch(() => null);
          }

        } catch (error) {
          console.error(error);
        }
      } 
      
      else {
        const targetCommand = message.client.commands.get(commandName);
        if (!targetCommand) return;

        try {
          await targetCommand.execute(message);
        } catch (execErr) {
          console.error(execErr.message);
        }
      }

    } catch (globalError) {
      console.error(globalError);
    }
  },
};
