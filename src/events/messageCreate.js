const { Events, ChannelType, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { logAction } = require('../utils/auditLog');
const { readData, writeData } = require('../utils/database');
const { formatCute } = require('../utils/textFormatter.js');

module.exports = {
  name: Events.MessageCreate,
  once: false,
  async execute(message) {
    // Ignore bots and webhooks
    if (message.author.bot || message.webhookId) return;

    // Fetch prefix dynamically or fall back to '|'
    const prefix = message.client.prefix || '|';

    // Check if the message starts with the prefix
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    // ==========================================
    // 🛠️ PREFIX COMMAND: |setup [template] [clear]
    // ==========================================
    if (commandName === 'setup') {
      const guild = message.guild;

      // 1. Permission Check
      if (!message.member.permissions.has(PermissionFlagsBits.Administrator) && 
          !message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return message.reply('❌ You need **Administrator** or **Manage Server** permissions to use the setup configurations!');
      }

      // 🟢 FIX: Extract strings safely out of the argument text array
      const template = args[0] ? args[0].toLowerCase() : null;
      const clearArg = args[1] ? args[1].toLowerCase() : null;
      const clear = clearArg === 'clear' || clearArg === 'true';

      const validTemplates = ['gaming', 'community', 'study', 'business'];
      if (!template || !validTemplates.includes(template)) {
        return message.reply(`❌ Please specify a valid template! Usage: \`${prefix}setup <gaming|community|study|business> [clear]\``);
      }

      // Send a status updates anchor message
      const statusMessage = await message.reply('⏳ Initializing prefix template configuration setup...').catch(() => null);

      try {
        const cuteData = readData('cute.json');
        const cuteStyle = cuteData[guild.id] || 'off'; 
        const isCuteActive = cuteStyle !== 'off';

        // 2. Safe Channel Clear Loop
        if (clear) {
          if (statusMessage) await statusMessage.edit('🗑️ Clearing existing channels...');
          for (const channel of guild.channels.cache.values()) {
            if (channel.id === message.channelId) continue; // Protect current active chat window
            try {
              await channel.delete();
              try { await logAction(guild, 'Channel Deleted', message.author, `Channel: ${channel.name}`); } catch(e){}
            } catch (e) {
              console.error(`Could not delete channel ${channel.name}`);
            }
          }
        }

        const genCatName = formatCute('General', cuteStyle, '🎀');
        const vcCatName = formatCute('Voice', cuteStyle, '🔊');
        const staffCatName = formatCute('Staff', cuteStyle, '🔒');

        if (statusMessage) await statusMessage.edit('📁 Creating categories...');
        
        // 3. Category Creation using proper ChannelType constants
        const generalCategory = await guild.channels.create({ name: genCatName, type: ChannelType.GuildCategory });
        try { await logAction(guild, 'Category Created', message.author, `Category: ${genCatName}`); } catch(e){}
        
        const voiceCategory = await guild.channels.create({ name: vcCatName, type: ChannelType.GuildCategory });
        try { await logAction(guild, 'Category Created', message.author, `Category: ${vcCatName}`); } catch(e){}
        
        const staffCategory = await guild.channels.create({ name: staffCatName, type: ChannelType.GuildCategory });
        try { await logAction(guild, 'Category Created', message.author, `Category: ${staffCatName}`); } catch(e){}

        if (statusMessage) await statusMessage.edit('👥 Creating roles...');
        const adminRole = await guild.roles.create({ name: 'Admin', color: '#FF0000' });
        try { await logAction(guild, 'Role Created', message.author, 'Role: Admin'); } catch(e){}
        const modRole = await guild.roles.create({ name: 'Moderator', color: '#0099FF' });
        try { await logAction(guild, 'Role Created', message.author, 'Role: Moderator'); } catch(e){}
        const memberRole = await guild.roles.create({ name: 'Member', color: '#00FF00' });
        try { await logAction(guild, 'Role Created', message.author, 'Role: Member'); } catch(e){}

        if (statusMessage) await statusMessage.edit('📢 Creating channels...');
        
        // 4. Channel layout mapped with correct ChannelType text and voice parameters
        const channels = {
          general: { name: formatCute('general', cuteStyle, '💬'), parent: generalCategory.id, type: ChannelType.GuildText },
          announcements: { name: formatCute('announcements', cuteStyle, '📢'), parent: generalCategory.id, type: ChannelType.GuildText },
          'audit-logs': { name: formatCute('audit-logs', cuteStyle, '📜'), parent: staffCategory.id, type: ChannelType.GuildText },
          'mod-logs': { name: formatCute('mod-logs', cuteStyle, '🛡️'), parent: staffCategory.id, type: ChannelType.GuildText },
          'staff-chat': { name: formatCute('staff-chat', cuteStyle, '💬'), parent: staffCategory.id, type: ChannelType.GuildText },
          levels: { name: formatCute('levels', cuteStyle, '✨'), parent: generalCategory.id, type: ChannelType.GuildText },
          commands: { name: formatCute('commands', cuteStyle, '🤖'), parent: generalCategory.id, type: ChannelType.GuildText },
        };

        if (template === 'gaming') {
          channels.gaming = { name: formatCute('gaming', cuteStyle, '🎮'), parent: generalCategory.id, type: ChannelType.GuildText };
          channels['voice-chat'] = { name: formatCute('voice-chat', cuteStyle, '🎧'), parent: voiceCategory.id, type: ChannelType.GuildVoice };
        } else if (template === 'community') {
          channels.introductions = { name: formatCute('introductions', cuteStyle, '👋'), parent: generalCategory.id, type: ChannelType.GuildText };
          channels.events = { name: formatCute('events', cuteStyle, '📅'), parent: generalCategory.id, type: ChannelType.GuildText };
          channels['voice-chat'] = { name: formatCute('voice-chat', cuteStyle, '🎧'), parent: voiceCategory.id, type: ChannelType.GuildVoice };
        } else if (template === 'study') {
          channels['study-materials'] = { name: formatCute('study-materials', cuteStyle, '📚'), parent: generalCategory.id, type: ChannelType.GuildText };
          channels['voice-study'] = { name: formatCute('voice-study', cuteStyle, '✏️'), parent: voiceCategory.id, type: ChannelType.GuildVoice };
        } else if (template === 'business') {
          channels.meetings = { name: formatCute('meetings', cuteStyle, '💼'), parent: generalCategory.id, type: ChannelType.GuildText };
          channels['voice-meetings'] = { name: formatCute('voice-meetings', cuteStyle, '👔'), parent: voiceCategory.id, type: ChannelType.GuildVoice };
        }

        let createdGeneralChannelId = null;

        for (const [key, channelData] of Object.entries(channels)) {
          const createdChannel = await guild.channels.create({
            name: channelData.name,
            type: channelData.type,
            parent: channelData.parent,
          });
          
          if (key === 'general') {
            createdGeneralChannelId = createdChannel.id;
          }
          try { await logAction(guild, 'Channel Created', message.author, `Channel: ${channelData.name}`); } catch(e){}
        }

        const settings = readData('settings.json');
        settings[guild.id] = { 
          template, 
          channels: Object.keys(channels), 
          welcomeChannelId: createdGeneralChannelId,
          roles: [adminRole.id, modRole.id, memberRole.id],
          setupComplete: true,
          setupDate: new Date().toISOString(),
        };
        writeData('settings.json', settings);

        try { await logAction(guild, 'Server Setup', message.author, `Template: ${template}, Style: ${cuteStyle}, Clear: ${clear}`); } catch(e){}

        const embed = new EmbedBuilder()
          .setColor(isCuteActive ? '#FF69B4' : '#00FF00')
          .setTitle(isCuteActive ? '✨ Server Setup Complete! ✨' : '✅ Server Setup Complete!')
          .addFields(
            { name: 'Template', value: template, inline: true },
            { name: 'Categories Created', value: '3', inline: true },
            { name: 'Channels Created', value: Object.keys(channels).length.toString(), inline: true },
            { name: 'Roles Created', value: '3', inline: true },
            { name: 'Prefix', value: prefix, inline: true },
            { name: 'Next Steps', value: 'Use `/help` to see all commands!' }
          );

        if (statusMessage) {
          await statusMessage.edit({ content: ' ', embeds: [embed] });
        } else {
          await message.channel.send({ embeds: [embed] });
        }

        if (clear) {
          const originChannel = guild.channels.cache.get(message.channelId);
          if (originChannel) await originChannel.delete().catch(() => null);
        }

      } catch (error) {
        console.error('Prefix Setup Error:', error);
        if (statusMessage) {
          await statusMessage.edit(`❌ Setup failed: ${error.message}`).catch(() => null);
        } else {
          await message.channel.send(`❌ Setup failed: ${error.message}`).catch(() => null);
        }
      }
    }
  },
};
