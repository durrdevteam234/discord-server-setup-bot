const { 
  SlashCommandBuilder, 
  PermissionFlagsBits, 
  EmbedBuilder, 
  ChannelType, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle 
} = require('discord.js');
const { logAction } = require('../utils/auditLog');
const database = require('../utils/database'); 
const { formatCute } = require('../utils/textFormatter.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('🎟️ Advanced support ticket configuration and management system')
    .addSubcommand(subcommand =>
      subcommand
        .setName('panel')
        .setDescription('Deploy a persistent, interactive graphical support ticket panel')
        .addChannelOption(option => 
          option.setName('channel')
            .setDescription('The channel where the ticket panel will be deployed')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('ongoing')
        .setDescription('📋 Inspection Matrix: View all live, active support ticket sessions')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('purge')
        .setDescription('⚠️ Operational Purge: Instantly delete all active tickets from the datastore')
    ),
  name: 'ticket',

  async execute(interaction, client) {
    const isInteraction = interaction.isCommand ? interaction.isCommand() : false;
    const guild = interaction.guild;
    const guildId = interaction.guildId;
    const author = interaction.user; 
    const memberExecutor = interaction.member;
    const currentChannel = interaction.channel;

    // Enforce administrative checks across both string and native interaction routers
    if (!memberExecutor.permissions.has(PermissionFlagsBits.Administrator) && 
        !memberExecutor.permissions.has(PermissionFlagsBits.ManageGuild)) {
      const permsMsg = '❌ **Permissions Required!** You need `Manage Server` or `Administrator` access to run ticket configurations.';
      return isInteraction ? interaction.reply({ content: permsMsg, ephemeral: true }) : interaction.reply(permsMsg);
    }

    // Determine the active subcommand choice dynamically via options emulator mapping
    let subcommand = null;
    if (isInteraction) {
      subcommand = interaction.options.getSubcommand();
    } else {
      subcommand = interaction.options.getSubcommand ? interaction.options.getSubcommand() : interaction.options.get('subcommand')?.value;
      if (!subcommand && interaction.options.getString) {
        subcommand = interaction.options.getString('subcommand')?.toLowerCase();
      }
      if (!subcommand || !['panel', 'ongoing', 'purge'].includes(subcommand)) {
        return interaction.reply('❌ **Usage Matrix:** `|ticket panel <#channel>`, `|ticket ongoing`, or `|ticket purge`').catch(() => null);
      }
    }

    // Load server custom styles from MongoDB database doc schema
    const guildConfig = await database.findOne({ guildId: guildId }).catch(() => null) || {};
    let cuteStyle = 'off';
    try { cuteStyle = guildConfig.cuteStyle || 'off'; } catch (_) {}

    // ==========================================
    // 🎫 1. SUBCOMMAND: PANEL DEPLOYMENT
    // ==========================================
    if (subcommand === 'panel') {
      if (isInteraction) await interaction.deferReply({ ephemeral: true });

      // Resolve the target channel from native option maps or message components
      let targetChannel = null;
      if (isInteraction) {
        targetChannel = interaction.options.getChannel('channel');
      } else {
        targetChannel = interaction.mentions.channels.first() || currentChannel;
      }

      if (!targetChannel) return interaction.reply('❌ Please specify or mention a valid text channel to drop the panel.').catch(() => null);

      const panelTitle = cuteStyle !== 'off' ? formatCute('Support Desk Center', cuteStyle, '🎫') : '🎫 Support Desk Center';
      
      const panelEmbed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle(panelTitle)
        .setDescription(
          `Need assistance or running into account profile issues?\n` +
          `Click the interactive button below to spin up a **private, secure support channel**.\n\n` +
          `🔒 *Staff will be notified automatically to assist you shortly.*`
        )
        .setFooter({ text: `${guild.name} Automated Assistance Hub` })
        .setTimestamp();

      const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('ticket_system_open')
          .setLabel('Create Support Ticket')
          .setEmoji('🎟️')
          .setStyle(ButtonStyle.Success)
      );

      await targetChannel.send({ embeds: [panelEmbed], components: [actionRow] });

      const confirmation = `✅ **Success:** Interactive Support Panel deployed cleanly into ${targetChannel}.`;
      return isInteraction ? interaction.editReply({ content: confirmation }) : interaction.reply(confirmation);
    }

    // ==========================================
    // 📋 2. SUBCOMMAND: ONGOING INSPECTION
    // ==========================================
    if (subcommand === 'ongoing') {
      if (isInteraction) await interaction.deferReply({ ephemeral: true });

      const activeTickets = guildConfig.activeTickets || {};
      const activeKeys = Object.keys(activeTickets);

      if (activeKeys.length === 0) {
        const noTickets = '📭 **Inspection Matrix:** There are no open or active support ticket tunnels recorded in the cloud database.';
        return isInteraction ? interaction.editReply({ content: noTickets }) : interaction.reply(noTickets);
      }

      const listEmbed = new EmbedBuilder()
        .setTitle('📋 Live Ongoing Support Ticket Sessions')
        .setColor('#3498DB')
        .setTimestamp();

      let descriptions = '';
      for (const [channelId, creatorId] of Object.entries(activeTickets)) {
        descriptions += `• **Channel:** <#${channelId}> | **Owner:** <@${creatorId}> \`(${creatorId})\`\n`;
      }
      listEmbed.setDescription(descriptions || 'No items resolved.');

      return isInteraction ? interaction.editReply({ embeds: [listEmbed] }) : interaction.reply({ embeds: [listEmbed] });
    }

    // ==========================================
    // ⚠️ 3. SUBCOMMAND: OPERATIONAL PURGE
    // ==========================================
    if (subcommand === 'purge') {
      if (isInteraction) await interaction.deferReply({ ephemeral: true });

      await database.findOneAndUpdate({ guildId }, { $set: { activeTickets: {} } }, { upsert: true });

      const purgeEmbed = new EmbedBuilder()
        .setTitle('⚠️ Cloud Datastore Cleared')
        .setColor('#ED4245')
        .setDescription('All active ticket records have been purged out of your MongoDB cluster profiles. Running channels remain untouched.')
        .setTimestamp();

      return isInteraction ? interaction.editReply({ embeds: [purgeEmbed] }) : interaction.reply({ embeds: [purgeEmbed] });
    }
  },
  // ========================================================
  // 🔘 INTERACTIVE BUTTON CONTROLLER PIPELINE (BUTTON EVENTS)
  // ========================================================
  async handleInteraction(interaction) {
    if (!interaction.isButton()) return;
    
    const customId = interaction.customId;
    const guild = interaction.guild;
    const guildId = interaction.guildId;
    const user = interaction.user;

    const guildConfig = await database.findOne({ guildId: guildId }).catch(() => null) || {};
    let cuteStyle = 'off';
    try { cuteStyle = guildConfig.cuteStyle || 'off'; } catch (_) {}

    // 🔘 BUTTON EVENT: OPENING TICKETS
    if (customId === 'ticket_system_open') {
      await interaction.deferReply({ ephemeral: true });

      const activeTickets = guildConfig.activeTickets || {};
      const userHasTicket = Object.values(activeTickets).includes(user.id);
      
      if (userHasTicket) {
        return interaction.editReply({ content: '❌ **Operation Cancelled:** You already have an active ongoing support ticket tunnel open.' });
      }

      try {
        const uniqueId = user.id.slice(-4);
        const rawName = `ticket-${uniqueId}`;
        const ticketChannelName = cuteStyle !== 'off' ? formatCute(rawName, cuteStyle, '🎟️') : rawName;

        const ticketChannel = await guild.channels.create({
          name: ticketChannelName,
          type: ChannelType.GuildText,
          permissionOverwrites: [
            { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks] }
          ],
        });

        await database.findOneAndUpdate(
          { guildId },
          { $set: { [`activeTickets.${ticketChannel.id}`]: user.id } },
          { upsert: true }
        );

        const welcomeTitle = cuteStyle !== 'off' ? formatCute('Support Tunnel Active', cuteStyle, '🎫') : '🎫 Support Tunnel Active';
        
        const controlEmbed = new EmbedBuilder()
          .setColor('#2ECC71')
          .setTitle(welcomeTitle)
          .setDescription(
            `Welcome ${user} to your private assistance line.\n` +
            `State your inquiry here clearly and support agents will handle it soon.\n\n` +
            `🔒 *Administrators can close out this ticket at any point using the secure controller option block below.*`
          )
          .setTimestamp();

        const closeRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('ticket_system_close')
            .setLabel('Close Support Ticket')
            .setEmoji('🔒')
            .setStyle(ButtonStyle.Danger)
        );

        await ticketChannel.send({ content: `${user}`, embeds: [controlEmbed], components: [closeRow] });
        try { await logAction(guild, 'Ticket Opened', user, `Channel: ${ticketChannel.name}`); } catch (e) {}

        return interaction.editReply({ content: `✅ **Ticket Generated:** Click here to access your tunnel: ${ticketChannel}` });

      } catch (err) {
        console.error('Failed processing ticket creation buttons:', err);
        return interaction.editReply({ content: `❌ **Failed to create ticket:** ${err.message}` });
      }
    }

    // 🔒 BUTTON EVENT: CLOSING TICKETS
    if (customId === 'ticket_system_close') {
      const memberExecutor = interaction.member;

      if (!memberExecutor.permissions.has(PermissionFlagsBits.Administrator) && 
          !memberExecutor.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({ content: '❌ Only administrators with `Manage Server` overrides can securely lock support rooms.', ephemeral: true });
      }

      await interaction.reply({ content: '🔒 **Archiving Session:** Purging configuration logs and dropping text nodes in 5 seconds...' });

      await database.findOneAndUpdate(
        { guildId },
        { $unset: { [`activeTickets.${interaction.channelId}`]: "" } }
      );

      try { await logAction(guild, 'Ticket Closed', user, `Channel: ${interaction.channel.name}`); } catch (e) {}

      setTimeout(async () => {
        try {
          await interaction.channel.delete();
        } catch (deleteError) {
          console.error('Channel already dropped or unreachable:', deleteError.message);
        }
      }, 5000);
    }
  }
};
