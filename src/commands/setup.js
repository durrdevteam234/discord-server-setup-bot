const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const { logAction } = require('../utils/auditLog');
const database = require('../utils/database'); // Points to your live MongoDB model connection
const { formatCute } = require('../utils/textFormatter.js'); 

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Set up the server using a predefined template')
    .addStringOption(option =>
      option.setName('template')
        .setDescription('Choose a template')
        .setRequired(true)
        .addChoices(
          { name: 'Gaming', value: 'gaming' },
          { name: 'Community', value: 'community' },
          { name: 'Study Group', value: 'study' },
          { name: 'Business', value: 'business' }
        )
    )
    .addBooleanOption(option =>
      option.setName('clear')
        .setDescription('Delete all existing channels before setup')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  name: 'setup',

  async execute(interaction, client) {
    const isInteraction = interaction.isCommand ? interaction.isCommand() : false;
    const memberExecutor = interaction.member;

    if (!memberExecutor.permissions.has(PermissionFlagsBits.Administrator) && 
        !memberExecutor.permissions.has(PermissionFlagsBits.ManageGuild)) {
      const msg = '❌ You need **Administrator** or **Manage Server** permissions to use the setup configurations!';
      return isInteraction ? interaction.reply({ content: msg, ephemeral: true }) : interaction.reply(msg);
    }

    if (isInteraction) {
      await interaction.deferReply({ ephemeral: true });
    } else {
      await interaction.reply('⏳ Initializing configuration routine...').catch(() => null);
    }

    const template = isInteraction 
      ? interaction.options.getString('template') 
      : interaction.options.getString('template');
      
    const clear = isInteraction 
      ? (interaction.options.getBoolean('clear') || false) 
      : interaction.options.getBoolean('clear');
      
    const guild = interaction.guild;
    const callerUser = interaction.user;

    try {
      // Fetch historical configuration document from your MongoDB cluster
      const guildConfig = await database.findOne({ guildId: guild.id }).catch(() => null) || {};
      let cuteStyle = 'off';
      try {
        cuteStyle = guildConfig.cuteStyle || 'off'; 
      } catch (_) {}
      
      const isCuteActive = cuteStyle !== 'off';

      if (clear) {
        const clearMsg = '🗑️ Clearing existing channels...';
        if (isInteraction) await interaction.editReply(clearMsg);
        else await interaction.channel.send(clearMsg).catch(() => null);

        for (const channel of guild.channels.cache.values()) {
          if (channel.id === interaction.channelId || channel.id === interaction.channel?.id) continue; 
          try {
            await channel.delete();
            try { await logAction(guild, 'Channel Deleted', callerUser, `Channel: ${channel.name}`); } catch(e){}
          } catch (e) {
            console.error(`Could not delete channel ${channel.name}`);
          }
        }
      }

      const genCatName = formatCute('General', cuteStyle, '🎀');
      const vcCatName = formatCute('Voice', cuteStyle, '🔊');
      const staffCatName = formatCute('Staff', cuteStyle, '🔒');

      const catMsg = '📁 Creating categories...';
      if (isInteraction) await interaction.editReply(catMsg);
      else await interaction.channel.send(catMsg).catch(() => null);

      const generalCategory = await guild.channels.create({ name: genCatName, type: ChannelType.GuildCategory });
      try { await logAction(guild, 'Category Created', callerUser, `Category: ${genCatName}`); } catch(e){}
      
      const voiceCategory = await guild.channels.create({ name: vcCatName, type: ChannelType.GuildCategory });
      try { await logAction(guild, 'Category Created', callerUser, `Category: ${vcCatName}`); } catch(e){}
      
      const staffCategory = await guild.channels.create({ name: staffCatName, type: ChannelType.GuildCategory });
      try { await logAction(guild, 'Category Created', callerUser, `Category: ${staffCatName}`); } catch(e){}
      const roleMsg = '👥 Creating roles...';
      if (isInteraction) await interaction.editReply(roleMsg);
      else await interaction.channel.send(roleMsg).catch(() => null);

      const adminRole = await guild.roles.create({ name: 'Admin', color: '#FF0000' });
      try { await logAction(guild, 'Role Created', callerUser, 'Role: Admin'); } catch(e){}
      const modRole = await guild.roles.create({ name: 'Moderator', color: '#0099FF' });
      try { await logAction(guild, 'Role Created', callerUser, 'Role: Moderator'); } catch(e){}
      const memberRole = await guild.roles.create({ name: 'Member', color: '#00FF00' });
      try { await logAction(guild, 'Role Created', callerUser, 'Role: Member'); } catch(e){}

      const chanMsg = '📢 Creating channels...';
      if (isInteraction) await interaction.editReply(chanMsg);
      else await interaction.channel.send(chanMsg).catch(() => null);
      
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
        try { await logAction(guild, 'Channel Created', callerUser, `Channel: ${channelData.name}`); } catch(e){}
      }

      // Save configurations dynamically to your MongoDB cluster
      await database.findOneAndUpdate(
        { guildId: guild.id },
        {
          $set: {
            template: template,
            channels: Object.keys(channels),
            welcomeChannelId: createdGeneralChannelId,
            roles: [adminRole.id, modRole.id, memberRole.id],
            setupComplete: true,
            setupDate: new Date().toISOString()
          }
        },
        { upsert: true }
      ).catch(() => null);

      try { await logAction(guild, 'Server Setup', callerUser, `Template: ${template}, Style: ${cuteStyle}, Clear: ${clear}`); } catch(e){}

      const embed = new EmbedBuilder()
        .setColor(isCuteActive ? '#FF69B4' : '#00FF00')
        .setTitle(isCuteActive ? '✨ Server Setup Complete! ✨' : '✅ Server Setup Complete!')
        .addFields(
          { name: 'Template', value: template, inline: true },
          { name: 'Categories Created', value: '3', inline: true },
          { name: 'Channels Created', value: Object.keys(channels).length.toString(), inline: true },
          { name: 'Roles Created', value: '3', inline: true },
          { name: 'Prefix', value: '|', inline: true },
          { name: 'Next Steps', value: 'Use `/help` to see all commands!' }
        );

      if (isInteraction) {
        await interaction.editReply({ embeds: [embed] }).catch(() => null);
      } else {
        await interaction.channel.send({ embeds: [embed] }).catch(() => null);
      }

      if (clear) {
        const originChannel = guild.channels.cache.get(interaction.channelId) || await guild.channels.fetch(interaction.channelId).catch(() => null);
        if (originChannel) await originChannel.delete().catch(() => null);
      }

    } catch (error) {
      console.error('Setup failed:', error);
      if (isInteraction) {
        await interaction.editReply(`❌ Setup failed: ${error.message}`).catch(() => null);
      } else {
        await interaction.channel.send(`❌ Setup failed: ${error.message}`).catch(() => null);
      }
    }
  },

  // Full prefix translation engine for hybrid interaction context routing
  async executePrefix(message, argsArray, client) {
    const guild = message.guild;
    if (!guild) return;

    const member = message.member;
    if (!member.permissions.has(PermissionFlagsBits.Administrator) && !member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return message.reply('❌ You require Manager or Administrator permissions to initiate setups.').catch(() => null);
    }

    const templateArg = argsArray[0] ? argsArray[0].toLowerCase().trim() : null;
    const clearArg = argsArray[1] ? argsArray[1].toLowerCase().trim() : null;
    
    const validTemplates = ['gaming', 'community', 'study', 'business'];
    if (!templateArg || !validTemplates.includes(templateArg)) {
      return message.reply('❌ Usage: `|setup <gaming|community|study|business> [clear]`').catch(() => null);
    }

    const isClearSet = (clearArg === 'clear' || clearArg === 'true');

    const mockInteraction = {
      guild: message.guild,
      guildId: message.guild.id,
      channelId: message.channelId,
      channel: message.channel,
      member: message.member,
      user: message.author,
      options: {
        getString: (name) => templateArg,
        getBoolean: (name) => isClearSet
      },
      reply: async (options) => message.reply(options),
      editReply: async (options) => {
        if (typeof options === 'string') return message.channel.send({ content: options });
        return message.channel.send(options);
      }
    };

    await this.execute(mockInteraction, client).catch(err => console.error('Error handling inline server setup prefix wrapper:', err));
  }
};
