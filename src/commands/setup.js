const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { logAction } = require('../utils/auditLog');
const { readData, writeData } = require('../utils/database');

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
      // Clear existing channels if requested
      if (clear) {
        await interaction.editReply('🗑️ Clearing existing channels...');
        for (const channel of guild.channels.cache.values()) {
          try {
            await channel.delete();
          } catch (e) {
            console.error(`Could not delete channel ${channel.name}`);
          }
        }
      }

      // Create categories
      await interaction.editReply('📁 Creating categories...');
      const generalCategory = await guild.channels.create({
        name: 'General',
        type: 4,
      });
      const voiceCategory = await guild.channels.create({
        name: 'Voice',
        type: 4,
      });
      const staffCategory = await guild.channels.create({
        name: 'Staff',
        type: 4,
      });

      // Create roles
      await interaction.editReply('👥 Creating roles...');
      const adminRole = await guild.roles.create({ name: 'Admin', color: '#FF0000' });
      const modRole = await guild.roles.create({ name: 'Moderator', color: '#0099FF' });
      const memberRole = await guild.roles.create({ name: 'Member', color: '#00FF00' });

      // Create channels based on template
      await interaction.editReply('📢 Creating channels...');
      const channels = {
        general: { name: 'general', parent: generalCategory.id, type: 0 },
        announcements: { name: 'announcements', parent: generalCategory.id, type: 0 },
        'audit-logs': { name: 'audit-logs', parent: staffCategory.id, type: 0 },
        'mod-logs': { name: 'mod-logs', parent: staffCategory.id, type: 0 },
        'staff-chat': { name: 'staff-chat', parent: staffCategory.id, type: 0 },
        levels: { name: 'levels', parent: generalCategory.id, type: 0 },
        commands: { name: 'commands', parent: generalCategory.id, type: 0 },
      };

      if (template === 'gaming') {
        channels.gaming = { name: 'gaming', parent: generalCategory.id, type: 0 };
        channels['voice-chat'] = { name: 'voice-chat', parent: voiceCategory.id, type: 2 };
      } else if (template === 'community') {
        channels.introductions = { name: 'introductions', parent: generalCategory.id, type: 0 };
        channels.events = { name: 'events', parent: generalCategory.id, type: 0 };
        channels['voice-chat'] = { name: 'voice-chat', parent: voiceCategory.id, type: 2 };
      } else if (template === 'study') {
        channels['study-materials'] = { name: 'study-materials', parent: generalCategory.id, type: 0 };
        channels['voice-study'] = { name: 'voice-study', parent: voiceCategory.id, type: 2 };
      } else if (template === 'business') {
        channels.meetings = { name: 'meetings', parent: generalCategory.id, type: 0 };
        channels['voice-meetings'] = { name: 'voice-meetings', parent: voiceCategory.id, type: 2 };
      }

      for (const [key, channelData] of Object.entries(channels)) {
        await guild.channels.create({
          name: channelData.name,
          type: channelData.type,
          parent: channelData.parent,
        });
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

      // Log action
      await logAction(guild, 'Server Setup', interaction.user, `Template: ${template}, Clear: ${clear}`);

      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✅ Server Setup Complete!')
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
