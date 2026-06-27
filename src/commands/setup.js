const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const { logAction } = require('../utils/auditLog');
const { readData, writeData } = require('../utils/database');
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

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator) && 
        !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ 
        content: '❌ You need **Administrator** or **Manage Server** permissions to use the setup configurations!', 
        ephemeral: true 
      });
    }

    if (interaction.deferred || interaction.replied) return;
    await interaction.deferReply({ ephemeral: true });

    const template = interaction.options.getString('template');
    const clear = interaction.options.getBoolean('clear') || false;
    const guild = interaction.guild;

    try {
      const cuteData = readData('cute.json');
      const cuteStyle = cuteData[guild.id] || 'off'; 
      const isCuteActive = cuteStyle !== 'off';

      if (clear) {
        await interaction.editReply('🗑️ Clearing existing channels...');
        for (const channel of guild.channels.cache.values()) {
          if (channel.id === interaction.channelId) continue; // Protect current channel
          try {
            await channel.delete();
            try { await logAction(guild, 'Channel Deleted', interaction.user, `Channel: ${channel.name}`); } catch(e){}
          } catch (e) {
            console.error(`Could not delete channel ${channel.name}`);
          }
        }
      }

      const genCatName = formatCute('General', cuteStyle, '🎀');
      const vcCatName = formatCute('Voice', cuteStyle, '🔊');
      const staffCatName = formatCute('Staff', cuteStyle, '🔒');

      await interaction.editReply('📁 Creating categories...');
      const generalCategory = await guild.channels.create({ name: genCatName, type: ChannelType.GuildCategory });
      try { await logAction(guild, 'Category Created', interaction.user, `Category: ${genCatName}`); } catch(e){}
      
      const voiceCategory = await guild.channels.create({ name: vcCatName, type: ChannelType.GuildCategory });
      try { await logAction(guild, 'Category Created', interaction.user, `Category: ${vcCatName}`); } catch(e){}
      
      const staffCategory = await guild.channels.create({ name: staffCatName, type: ChannelType.GuildCategory });
      try { await logAction(guild, 'Category Created', interaction.user, `Category: ${staffCatName}`); } catch(e){}

      await interaction.editReply('👥 Creating roles...');
      const adminRole = await guild.roles.create({ name: 'Admin', color: '#FF0000' });
      try { await logAction(guild, 'Role Created', interaction.user, 'Role: Admin'); } catch(e){}
      const modRole = await guild.roles.create({ name: 'Moderator', color: '#0099FF' });
      try { await logAction(guild, 'Role Created', interaction.user, 'Role: Moderator'); } catch(e){}
      const memberRole = await guild.roles.create({ name: 'Member', color: '#00FF00' });
      try { await logAction(guild, 'Role Created', interaction.user, 'Role: Member'); } catch(e){}

      await interaction.editReply('📢 Creating channels...');
      
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
        try { await logAction(guild, 'Channel Created', interaction.user, `Channel: ${channelData.name}`); } catch(e){}
      }

      const settings = readData('settings.json');
      settings[guild.id] = { 
        template, 
        channels: Object.keys(channels), 
        welcomeChannelId: createdGeneralChannelId, // Saves the welcome channel destination dynamically
        roles: [adminRole.id, modRole.id, memberRole.id],
        setupComplete: true,
        setupDate: new Date().toISOString(),
      };
      writeData('settings.json', settings);

      try { await logAction(guild, 'Server Setup', interaction.user, `Template: ${template}, Style: ${cuteStyle}, Clear: ${clear}`); } catch(e){}

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

      await interaction.editReply({ embeds: [embed] });

      if (clear) {
        const originChannel = guild.channels.cache.get(interaction.channelId);
        if (originChannel) await originChannel.delete().catch(() => null);
      }

    } catch (error) {
      console.error('Setup error:', error);
      await interaction.editReply(`❌ Setup failed: ${error.message}`).catch(() => null);
    }
  },
};
