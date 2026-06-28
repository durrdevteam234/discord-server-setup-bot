const discord = require('discord.js');
const audit = require('../utils/auditLog');
const db = require('../utils/database');
const formatter = require('../utils/textFormatter.js');

module.exports = {
  name: discord.Events.MessageCreate,
  once: false,
  async execute(message) {
    if (!message || !message.author || message.author.bot || message.webhookId) return;

    const prefix = message.client.prefix || '|';
    if (!message.content || !message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    if (args.length === 0) return;
    
    const commandName = args.shift().toLowerCase();

    if (commandName === 'setup') {
      const guild = message.guild;
      if (!guild) return;

      const member = message.member;
      if (!member) return;

      if (!member.permissions.has(discord.PermissionFlagsBits.Administrator) && 
          !member.permissions.has(discord.PermissionFlagsBits.ManageGuild)) {
        return message.reply('❌ Admin permissions required!');
      }

      const firstArg = args[0];
      const secondArg = args[1];

      const templateArg = firstArg ? firstArg.toLowerCase() : null;
      const clearArg = secondArg ? secondArg.toLowerCase() : null;
      const clear = clearArg === 'clear' || clearArg === 'true';

      const validTemplates = ['gaming', 'community', 'study', 'business'];
      if (!templateArg || !validTemplates.includes(templateArg)) {
        return message.reply('❌ Usage: ' + prefix + 'setup <gaming|community|study|business> [clear]');
      }

      const statusMessage = await message.reply('⏳ Setting up server...');

      try {
        const cuteData = db.readData('cute.json') || {};
        const cuteStyle = cuteData[guild.id] || 'off';

        if (clear) {
          await statusMessage.edit('🗑️ Clearing channels...');
          for (const channel of guild.channels.cache.values()) {
            if (channel.id === message.channelId) continue;
            await channel.delete().catch(() => null);
          }
        }

        const genCatName = formatter.formatCute('General', cuteStyle, '🎀');
        const vcCatName = formatter.formatCute('Voice', cuteStyle, '🔊');
        const staffCatName = formatter.formatCute('Staff', cuteStyle, '🔒');

        await statusMessage.edit('📁 Creating categories...');
        const generalCategory = await guild.channels.create({ name: genCatName, type: discord.ChannelType.GuildCategory });
        const voiceCategory = await guild.channels.create({ name: vcCatName, type: discord.ChannelType.GuildCategory });
        const staffCategory = await guild.channels.create({ name: staffCatName, type: discord.ChannelType.GuildCategory });

        await statusMessage.edit('👥 Creating roles...');
        const adminRole = await guild.roles.create({ name: 'Admin', color: '#FF0000' });
        const modRole = await guild.roles.create({ name: 'Moderator', color: '#0099FF' });
        const memberRole = await guild.roles.create({ name: 'Member', color: '#00FF00' });

        await statusMessage.edit('📢 Creating channels...');
        const channels = {
          general: { name: formatter.formatCute('general', cuteStyle, '💬'), parent: generalCategory.id, type: discord.ChannelType.GuildText },
          announcements: { name: formatter.formatCute('announcements', cuteStyle, '📢'), parent: generalCategory.id, type: discord.ChannelType.GuildText },
          'audit-logs': { name: formatter.formatCute('audit-logs', cuteStyle, '📜'), parent: staffCategory.id, type: discord.ChannelType.GuildText },
          'mod-logs': { name: formatter.formatCute('mod-logs', cuteStyle, '🛡️'), parent: staffCategory.id, type: discord.ChannelType.GuildText },
          'staff-chat': { name: formatter.formatCute('staff-chat', cuteStyle, '💬'), parent: staffCategory.id, type: discord.ChannelType.GuildText },
          levels: { name: formatter.formatCute('levels', cuteStyle, '✨'), parent: generalCategory.id, type: discord.ChannelType.GuildText },
          commands: { name: formatter.formatCute('commands', cuteStyle, '🤖'), parent: generalCategory.id, type: discord.ChannelType.GuildText }
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
            parent: channelData.parent
          });
          if (key === 'general') createdGeneralChannelId = createdChannel.id;
          await audit.logAction(guild, 'Channel Created', message.author, 'Channel: ' + channelData.name).catch(() => null);
        }

        const settings = db.readData('settings.json') || {};
        settings[guild.id] = { 
          template: templateArg, 
          channels: Object.keys(channels), 
          welcomeChannelId: createdGeneralChannelId,
          roles: [adminRole.id, modRole.id, memberRole.id],
          setupComplete: true,
          setupDate: new Date().toISOString()
        };
        db.writeData('settings.json', settings);

        const embed = new discord.EmbedBuilder()
          .setColor('#00FF00')
          .setTitle('✅ Setup Complete!')
          .addFields(
            { name: 'Template', value: templateArg, inline: true },
            { name: 'Categories', value: '3', inline: true },
            { name: 'Channels', value: Object.keys(channels).length.toString(), inline: true }
          );

        await statusMessage.edit({ content: ' ', embeds: [embed] });

        if (clear) {
          const originChannel = guild.channels.cache.get(message.channelId);
          if (originChannel) await originChannel.delete().catch(() => null);
        }

      } catch (error) {
        console.error(error);
        await statusMessage.edit('❌ Setup failed: ' + error.message).catch(() => null);
      }
    }
  }
};
