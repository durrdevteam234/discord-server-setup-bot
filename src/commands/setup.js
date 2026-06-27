const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
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
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ You need Administrator permissions!', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const template = interaction.options.getString('template');
    const clear = interaction.options.getBoolean('clear') || false;
    const guild = interaction.guild;

    try {
      // Pull saved font profile style string ('wide', 'small-caps', 'bubbles', or 'off')
      const cuteData = readData('cute.json');
      const cuteStyle = cuteData[guild.id] || 'off'; 
      const isCuteActive = cuteStyle !== 'off';

      // Clear existing channels if requested
      if (clear) {
        await interaction.editReply('🗑️ Clearing existing channels...');
        for (const channel of guild.channels.cache.values()) {
          try {
            await channel.delete();
            await logAction(guild, 'Channel Deleted', interaction.user, `Channel: ${channel.name}`);
          } catch (e) {
            console.error(`Could not delete channel ${channel.name}`);
          }
        }
      }

      // Generate dynamic Category Names with specific styles and icons
      const genCatName = formatCute('General', cuteStyle, '🎀');
      const vcCatName = formatCute('Voice', cuteStyle, '🔊');
      const staffCatName = formatCute('Staff', cuteStyle, '🔒');

      // Create categories
      await interaction.editReply('📁 Creating categories...');
      const generalCategory = await guild.channels.create({ name: genCatName, type: 4 });
      await logAction(guild, 'Category Created', interaction.user, `Category: ${genCatName}`);
      
      const voiceCategory = await guild.channels.create({ name: vcCatName, type: 4 });
      await logAction(guild, 'Category Created', interaction.user, `Category: ${vcCatName}`);
      
      const staffCategory = await guild.channels.create({ name: staffCatName, type: 4 });
      await logAction(guild, 'Category Created', interaction.user, `Category: ${staffCatName}`);

      // Create roles
      await interaction.editReply('👥 Creating roles...');
      const adminRole = await guild.roles.create({ name: 'Admin', color: '#FF0000' });
      await logAction(guild, 'Role Created', interaction.user, 'Role: Admin');
      const modRole = await guild.roles.create({ name: 'Moderator', color: '#0099FF' });
      await logAction(guild, 'Role Created', interaction.user, 'Role: Moderator');
      const memberRole = await guild.roles.create({ name: 'Member', color: '#00FF00' });
      await logAction(guild, 'Role Created', interaction.user, 'Role: Member');

      // Create channels based on template
      await interaction.editReply('📢 Creating channels...');
      
      const channels = {
        general: { name: formatCute('general', cuteStyle, '💬'), parent: generalCategory.id, type: 0 },
        announcements: { name: formatCute('announcements', cuteStyle, '📢'), parent: generalCategory.id, type: 0 },
        'audit-logs': { name: formatCute('audit-logs', cuteStyle, '📜'), parent: staffCategory.id, type: 0 },
        'mod-logs': { name: formatCute('mod-logs', cuteStyle, '🛡️'), parent: staffCategory.id, type: 0 },
        'staff-chat': { name: formatCute('staff-chat', cuteStyle, '💬'), parent: staffCategory.id, type: 0 },
        levels: { name: formatCute('levels', cuteStyle, '✨'), parent: generalCategory.id, type: 0 },
        commands: { name: formatCute('commands', cuteStyle, '🤖'), parent: generalCategory.id, type: 0 },
      };

      if (template === 'gaming') {
        channels.gaming = { name: formatCute('gaming', cuteStyle, '🎮'), parent: generalCategory.id, type: 0 };
        channels['voice-chat'] = { name: formatCute('voice-chat', cuteStyle, '🎧'), parent: voiceCategory.id, type: 2 };
      } else if (template === 'community') {
        channels.introductions = { name: formatCute('introductions', cuteStyle, '👋'), parent: generalCategory.id, type: 0 };
        channels.events = { name: formatCute('events', cuteStyle, '📅'), parent: generalCategory.id, type: 0 };
        channels['voice-chat'] = { name: formatCute('voice-chat', cuteStyle, '🎧'), parent: voiceCategory.id, type: 2 };
      } else if (template === 'study') {
        channels['study-materials'] = { name: formatCute('study-materials', cuteStyle, '📚'), parent: generalCategory.id, type: 0 };
        channels['voice-study'] = { name: formatCute('voice-study', cuteStyle, '✏️'), parent: voiceCategory.id, type: 2 };
      } else if (template === 'business') {
        channels.meetings = { name: formatCute('meetings', cuteStyle, '💼'), parent: generalCategory.id, type: 0 };
        channels['voice-meetings'] = { name: formatCute('voice-meetings', cuteStyle, '👔'), parent: voiceCategory.id, type: 2 };
      }

      for (const [key, channelData] of Object.entries(channels)) {
        await guild.channels.create({
          name: channelData.name,
          type: channelData.type,
          parent: channelData.parent,
        });
        await logAction(guild, 'Channel Created', interaction.user, `Channel: ${channelData.name}`);
      }

      // Save settings
      const settings = readData('settings.json');
      settings[guild.id] = { 
        template, 
        channels: Object.keys(channels), 
        roles: [adminRole.id, modRole.id, memberRole.id],
        setupComplete: true,
        setupDate: new Date().toISOString(),
      };
      writeData('settings.json', settings);

      await logAction(guild, 'Server Setup', interaction.user, `Template: ${template}, Style: ${cuteStyle}, Clear: ${clear}`);

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
    } catch (error) {
      console.error('Setup error:', error);
      await interaction.editReply(`❌ Setup failed: ${error.message}`);
    }
  },
};
