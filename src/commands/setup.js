const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const { logAction } = require('../utils/auditLog');
const database = require('../utils/database'); // Points to your live MongoDB model connection
const { formatCute } = require('../utils/textFormatter.js'); 

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('⚙️ Provision specialized, high-density server configurations from blueprint templates.')
    .addStringOption(option =>
      option.setName('template')
        .setDescription('Select a specialized template blueprint architecture model')
        .setRequired(true)
        .addChoices(
          { name: '🎮 Gaming Clan Network', value: 'gaming' },
          { name: '🌐 Public Community Guild', value: 'community' },
          { name: '📚 Academic Study Hub', value: 'study' },
          { name: '💼 Corporate Business Operations', value: 'business' },
          { name: '🎨 Creative Art Studio', value: 'creative' },
          { name: '💻 Dev Forge Engineering', value: 'development' },
          { name: '📈 Crypto & FinTech Room', value: 'finance' },
          { name: '🎭 Immersive Roleplay World', value: 'roleplay' },
          { name: '✨ Minimalist Clean Slate', value: 'minimalist' },
          { name: '⏳ History & Archives Guild', value: 'history' },
          { name: '🌍 Geography & Earth Explorer', value: 'geography' }
        )
    )
    .addBooleanOption(option =>
      option.setName('clear')
        .setDescription('Delete all existing server channels before deploying the layout')
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

      // ========================================================
      // 🔒 LOCKDOWN OVERWRITES: BLINDS EVERYONE BY DEFAULT
      // ========================================================
      const generalCategory = await guild.channels.create({ 
        name: genCatName, 
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] }
        ]
      });
      try { await logAction(guild, 'Category Created', callerUser, `Category: ${genCatName}`); } catch(e){}
      
      const voiceCategory = await guild.channels.create({ 
        name: vcCatName, 
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] }
        ]
      });
      try { await logAction(guild, 'Category Created', callerUser, `Category: ${vcCatName}`); } catch(e){}
      
      const staffCategory = await guild.channels.create({ name: staffCatName, type: ChannelType.GuildCategory });
      try { await logAction(guild, 'Category Created', callerUser, `Category: ${staffCatName}`); } catch(e){}
      
      const roleMsg = '👥 Creating roles...';
      if (isInteraction) await interaction.editReply(roleMsg);
      else await interaction.channel.send(roleMsg).catch(() => null);

      // ==========================================
      // 👥 GLOBAL GENERAL & MANAGEMENT ROLE STACK
      // ==========================================
      const adminRole = await guild.roles.create({ name: 'System Administrator', color: '#FF0000', permissions: [PermissionFlagsBits.Administrator] });
      try { await logAction(guild, 'Role Created', callerUser, 'Role: Admin'); } catch(e){}
      const modRole = await guild.roles.create({ name: 'Server Moderator', color: '#0099FF' });
      try { await logAction(guild, 'Role Created', callerUser, 'Role: Moderator'); } catch(e){}
      const trialModRole = await guild.roles.create({ name: 'Trial Staff', color: '#7CC2FF' });
      const vipRole = await guild.roles.create({ name: 'Premium Server Booster', color: '#F47FFF' });
      const memberRole = await guild.roles.create({ name: 'Verified Member', color: '#00FF00' });
      try { await logAction(guild, 'Role Created', callerUser, 'Role: Member'); } catch(e){}
      const mutedRole = await guild.roles.create({ name: 'Muted Guard Restrained', color: '#111111' });

      const newlyCreatedRoleIds = [adminRole.id, modRole.id, trialModRole.id, vipRole.id, memberRole.id, mutedRole.id];

      // ==========================================
      // 🎭 THEMATIC ROLE ATTACHMENT BLUEPRINTS
      // ==========================================
      if (template === 'gaming') {
        const r1 = await guild.roles.create({ name: '⭐ Competitive Captain', color: '#E74C3C' });
        const r2 = await guild.roles.create({ name: '🎮 Active Esport Player', color: '#9B59B6' });
        const r3 = await guild.roles.create({ name: '🏆 Tournament Competitor', color: '#F1C40F' });
        const r4 = await guild.roles.create({ name: '👾 Casual Stream Viewer', color: '#1ABC9C' });
        newlyCreatedRoleIds.push(r1.id, r2.id, r3.id, r4.id);
      } else if (template === 'community') {
        const r1 = await guild.roles.create({ name: '📢 Community Influencer', color: '#E67E22' });
        const r2 = await guild.roles.create({ name: '🎉 Event Organiser', color: '#2ECC71' });
        const r3 = await guild.roles.create({ name: '💬 Chat Contributor', color: '#3498DB' });
        const r4 = await guild.roles.create({ name: '👋 New Arrival Profile', color: '#95A5A6' });
        newlyCreatedRoleIds.push(r1.id, r2.id, r3.id, r4.id);
      } else if (template === 'study') {
        const r1 = await guild.roles.create({ name: '🎓 Lead Educator', color: '#34495E' });
        const r2 = await guild.roles.create({ name: '🔬 Research Analyst', color: '#E74C3C' });
        const r3 = await guild.roles.create({ name: '📚 Active Study Peer', color: '#2ECC71' });
        const r4 = await guild.roles.create({ name: '✏️ Student Guest', color: '#F39C12' });
        newlyCreatedRoleIds.push(r1.id, r2.id, r3.id, r4.id);
      } else if (template === 'business') {
        const r1 = await guild.roles.create({ name: '👔 Corporate Director', color: '#2C3E50' });
        const r2 = await guild.roles.create({ name: '💼 Project Manager', color: '#2980B9' });
        const r3 = await guild.roles.create({ name: '📊 Operational Specialist', color: '#27AE60' });
        const r4 = await guild.roles.create({ name: '🤝 Client External Guest', color: '#BDC3C7' });
        newlyCreatedRoleIds.push(r1.id, r2.id, r3.id, r4.id);
      } else if (template === 'creative') {
        const r1 = await guild.roles.create({ name: '🎨 Master Artisan', color: '#9B59B6' });
        const r2 = await guild.roles.create({ name: '📸 Digital Designer', color: '#E84393' });
        const r3 = await guild.roles.create({ name: '🖌️ Commission Client', color: '#00 CEC9' });
        const r4 = await guild.roles.create({ name: '🔍 Art Enthusiast', color: '#FFEAA7' });
        newlyCreatedRoleIds.push(r1.id, r2.id, r3.id, r4.id);
      } else if (template === 'development') {
        const r1 = await guild.roles.create({ name: '💻 System Architect', color: '#2D3436' });
        const r2 = await guild.roles.create({ name: '⚙️ Senior Developer', color: '#0984E3' });
        const r3 = await guild.roles.create({ name: '🛠️ QA Bug Hunter', color: '#D63031' });
        const r4 = await guild.roles.create({ name: '🌱 Junior Apprentice', color: '#00B894' });
        newlyCreatedRoleIds.push(r1.id, r2.id, r3.id, r4.id);
      } else if (template === 'finance') {
        const r1 = await guild.roles.create({ name: '🐋 Whale Whale Investor', color: '#6C5CE7' });
        const r2 = await guild.roles.create({ name: '📈 Macro Alpha Analyst', color: '#00B894' });
        const r3 = await guild.roles.create({ name: '📊 Active Day Trader', color: '#FDCB6E' });
        const r4 = await guild.roles.create({ name: '⛓️ Web3 Scalper', color: '#E17055' });
        newlyCreatedRoleIds.push(r1.id, r2.id, r3.id, r4.id);
      } else if (template === 'roleplay') {
        const r1 = await guild.roles.create({ name: '👑 Game Dungeon Master', color: '#D63031' });
        const r2 = await guild.roles.create({ name: '🏰 Faction Commander', color: '#E17055' });
        const r3 = await guild.roles.create({ name: '⚔️ Veteran Adventurer', color: '#F1C40F' });
        const r4 = await guild.roles.create({ name: '🎲 Town Citizen Local', color: '#7F8C8D' });
        newlyCreatedRoleIds.push(r1.id, r2.id, r3.id, r4.id);
      } else if (template === 'minimalist') {
        const r1 = await guild.roles.create({ name: '✨ Curated Tier', color: '#FFFFFF' });
        const r2 = await guild.roles.create({ name: '▫️ Minimal Node', color: '#DFE6E9' });
        newlyCreatedRoleIds.push(r1.id, r2.id);
      } else if (template === 'history') {
        const r1 = await guild.roles.create({ name: '⏳ Head Archivist', color: '#845EC2' });
        const r2 = await guild.roles.create({ name: '📜 Chronicle Scholar', color: '#D65DB1' });
        const r3 = await guild.roles.create({ name: '🏛️ Antiquity Researcher', color: '#FF6F91' });
        const r4 = await guild.roles.create({ name: '🛡️ Historical Explorer', color: '#FFC75F' });
        newlyCreatedRoleIds.push(r1.id, r2.id, r3.id, r4.id);
      } else if (template === 'geography') {
        const r1 = await guild.roles.create({ name: '🌍 Global Cartographer', color: '#0081CF' });
        const r2 = await guild.roles.create({ name: '🧭 Topography Specialist', color: '#008E9B' });
        const r3 = await guild.roles.create({ name: '🌋 Geology Researcher', color: '#00C9A7' });
        const r4 = await guild.roles.create({ name: '⛺ Expedition Nomad', color: '#9BDEAC' });
        newlyCreatedRoleIds.push(r1.id, r2.id, r3.id, r4.id);
      }
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
        channels['tournament-rules'] = { name: formatCute('tournament-rules', cuteStyle, '🏆'), parent: generalCategory.id, type: ChannelType.GuildText };
        channels['brackets-standings'] = { name: formatCute('brackets-standings', cuteStyle, '📊'), parent: generalCategory.id, type: ChannelType.GuildText };
        channels['theorycrafting'] = { name: formatCute('theorycrafting', cuteStyle, '🎮'), parent: generalCategory.id, type: ChannelType.GuildText };
        channels['voice-chat-1'] = { name: formatCute('Squad Room 1', cuteStyle, '🎧'), parent: voiceCategory.id, type: ChannelType.GuildVoice };
        channels['voice-chat-2'] = { name: formatCute('Squad Room 2', cuteStyle, '🎧'), parent: voiceCategory.id, type: ChannelType.GuildVoice };
      } else if (template === 'community') {
        channels.introductions = { name: formatCute('introductions', cuteStyle, '👋'), parent: generalCategory.id, type: ChannelType.GuildText };
        channels.events = { name: formatCute('events', cuteStyle, '📅'), parent: generalCategory.id, type: ChannelType.GuildText };
        channels.memes = { name: formatCute('memes', cuteStyle, '😂'), parent: generalCategory.id, type: ChannelType.GuildText };
        channels['public-lounge'] = { name: formatCute('Public Lounge', cuteStyle, '🎧'), parent: voiceCategory.id, type: ChannelType.GuildVoice };
      } else if (template === 'study') {
        channels['study-materials'] = { name: formatCute('study-materials', cuteStyle, '📚'), parent: generalCategory.id, type: ChannelType.GuildText };
        channels['research-archives'] = { name: formatCute('research-archives', cuteStyle, '🔬'), parent: generalCategory.id, type: ChannelType.GuildText };
        channels['voice-study'] = { name: formatCute('Silent Library', cuteStyle, '✏️'), parent: voiceCategory.id, type: ChannelType.GuildVoice };
      } else if (template === 'business') {
        channels.meetings = { name: formatCute('meetings', cuteStyle, '💼'), parent: generalCategory.id, type: ChannelType.GuildText };
        channels['product-roadmap'] = { name: formatCute('product-roadmap', cuteStyle, '📊'), parent: generalCategory.id, type: ChannelType.GuildText };
        channels['voice-meetings'] = { name: formatCute('Boardroom Alpha', cuteStyle, '👔'), parent: voiceCategory.id, type: ChannelType.GuildVoice };
      } else if (template === 'creative') {
        channels['portfolio-showcase'] = { name: formatCute('portfolio-showcase', cuteStyle, '🎨'), parent: generalCategory.id, type: ChannelType.GuildText };
        channels['work-in-progress'] = { name: formatCute('work-in-progress', cuteStyle, '🖌️'), parent: generalCategory.id, type: ChannelType.GuildText };
        channels['creative-studio'] = { name: formatCute('Live Studio', cuteStyle, '📸'), parent: voiceCategory.id, type: ChannelType.GuildVoice };
      } else if (template === 'development') {
        channels['production-logs'] = { name: formatCute('production-logs', cuteStyle, '💻'), parent: generalCategory.id, type: ChannelType.GuildText };
        channels['github-feed'] = { name: formatCute('github-feed', cuteStyle, '⚙️'), parent: generalCategory.id, type: ChannelType.GuildText };
        channels['pair-programming'] = { name: formatCute('Pair Coding', cuteStyle, '🛠️'), parent: voiceCategory.id, type: ChannelType.GuildVoice };
      } else if (template === 'finance') {
        channels['market-news'] = { name: formatCute('market-news', cuteStyle, '📈'), parent: generalCategory.id, type: ChannelType.GuildText };
        channels['crypto-analysis'] = { name: formatCute('crypto-analysis', cuteStyle, '⛓️'), parent: generalCategory.id, type: ChannelType.GuildText };
        channels['trading-pit'] = { name: formatCute('Trading Pit', cuteStyle, '📊'), parent: voiceCategory.id, type: ChannelType.GuildVoice };
      } else if (template === 'roleplay') {
        channels['world-lore'] = { name: formatCute('world-lore', cuteStyle, '🏰'), parent: generalCategory.id, type: ChannelType.GuildText };
        channels['character-sheets'] = { name: formatCute('character-sheets', cuteStyle, '📜'), parent: generalCategory.id, type: ChannelType.GuildText };
        channels['tavern-comms'] = { name: formatCute('The Inn Voice', cuteStyle, '🎲'), parent: voiceCategory.id, type: ChannelType.GuildVoice };
      } else if (template === 'minimalist') {
        channels['slate'] = { name: formatCute('slate', cuteStyle, '▫️'), parent: generalCategory.id, type: ChannelType.GuildText };
        channels['focus'] = { name: formatCute('focus', cuteStyle, '✨'), parent: voiceCategory.id, type: ChannelType.GuildVoice };
      } else if (template === 'history') {
        channels['ancient-records'] = { name: formatCute('ancient-records', cuteStyle, '⏳'), parent: generalCategory.id, type: ChannelType.GuildText };
        channels['artifacts-gallery'] = { name: formatCute('artifacts-gallery', cuteStyle, '🏛️'), parent: generalCategory.id, type: ChannelType.GuildText };
        channels['chronicle-feed'] = { name: formatCute('chronicle-discussion', cuteStyle, '📜'), parent: generalCategory.id, type: ChannelType.GuildText };
        channels['council-chamber'] = { name: formatCute('Grand Lyceum', cuteStyle, '🔊'), parent: voiceCategory.id, type: ChannelType.GuildVoice };
      } else if (template === 'geography') {
        channels['atlas-cartography'] = { name: formatCute('atlas-cartography', cuteStyle, '🌍'), parent: generalCategory.id, type: ChannelType.GuildText };
        channels['expedition-logs'] = { name: formatCute('expedition-logs', cuteStyle, '🧭'), parent: generalCategory.id, type: ChannelType.GuildText };
        channels['earth-science'] = { name: formatCute('earth-science', cuteStyle, '🌋'), parent: generalCategory.id, type: ChannelType.GuildText };
        channels['horizon-comms'] = { name: formatCute('Basecamp Comms', cuteStyle, '🔊'), parent: voiceCategory.id, type: ChannelType.GuildVoice };
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
            roles: newlyCreatedRoleIds,
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
          { name: 'Template Deployment', value: template.toUpperCase(), inline: true },
          { name: 'Categories Provisioned', value: '3 Layout Rows', inline: true },
          { name: 'Channels Spawned', value: Object.keys(channels).length.toString(), inline: true },
          { name: 'Role Tree Density', value: `${newlyCreatedRoleIds.length} Total Ranks`, inline: true },
          { name: 'Prefix Gateway', value: '|', inline: true },
          { name: 'Next Steps Operations', value: 'Run `/help` or `|help` to inspect systems!' }
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

  async executePrefix(message, argsArray, client) {
    const guild = message.guild;
    if (!guild) return;

    const member = message.member;
    if (!member.permissions.has(PermissionFlagsBits.Administrator) && !member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return message.reply('❌ You require Manager or Administrator permissions to initiate setups.').catch(() => null);
    }

    const templateArg = argsArray ? argsArray.toLowerCase().trim() : null;
    const clearArg = argsArray ? argsArray.toLowerCase().trim() : null;
    
    // Whitelist parameters tracker matrix index loops matching all 11 configurations
    const validTemplates = ['gaming', 'community', 'study', 'business', 'creative', 'development', 'finance', 'roleplay', 'minimalist', 'history', 'geography'];
    if (!templateArg || !validTemplates.includes(templateArg)) {
      return message.reply(`❌ **Usage:** \`|setup <${validTemplates.join('|')}> [clear]\``).catch(() => null);
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
