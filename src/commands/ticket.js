const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const { logAction } = require('../utils/auditLog');
const database = require('../utils/database'); // Updated to use your live MongoDB layout connection
const { formatCute } = require('../utils/textFormatter.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('🎟️ Support ticket configuration system')
    .addSubcommand(subcommand =>
      subcommand
        .setName('create')
        .setDescription('Create a new private support ticket')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('close')
        .setDescription('🔒 Staff Only: Close and delete this ticket channel')
    ),
  name: 'ticket',

  async execute(interaction, client) {
    // 1. Detect if this is a Slash Command (Interaction) or Prefix Command (Message)
    const isInteraction = interaction.isCommand ? interaction.isCommand() : false;
    const guild = interaction.guild;
    const guildId = interaction.guildId;
    const author = interaction.user; // interaction emulator maps message author to user field
    const memberExecutor = interaction.member;
    const channel = interaction.channel;

    // Determine the active subcommand choice dynamically via options emulator mapping
    let subcommand = null;
    if (isInteraction) {
      subcommand = interaction.options.getSubcommand();
    } else {
      subcommand = interaction.options.getString('subcommand')?.toLowerCase();
      if (!subcommand || (subcommand !== 'create' && subcommand !== 'close')) {
        return interaction.reply('❌ Usage: `|ticket create` or `|ticket close`').catch(() => null);
      }
    }

    // ==========================================
    // 🎟️ TICKET CREATE SUBCOMMAND
    // ==========================================
    if (subcommand === 'create') {
      if (isInteraction) {
        await interaction.deferReply({ ephemeral: true });
      } else {
        await interaction.reply('⏳ Creating your ticket...').catch(() => null);
      }

      try {
        // ========================================================
        // NEW: FETCH HISTORICAL RECORD LAYOUT FROM MONGO-DB
        // ========================================================
        const guildConfig = await database.findOne({ guildId: guildId }).catch(() => null) || {};
        let cuteStyle = 'off';
        try {
          cuteStyle = guildConfig.cuteStyle || 'off'; // Reads font selection mapping straight from schema doc
        } catch (_) {}

        // Use a persistent slice of the User ID instead of a counter variable that resets on container restarts
        const uniqueId = author.id.slice(-4);
        const rawName = `ticket-${uniqueId}`;
        const ticketChannelName = cuteStyle !== 'off' ? formatCute(rawName, cuteStyle, '🎟️') : rawName;

        // Create the private channel
        const ticketChannel = await guild.channels.create({
          name: ticketChannelName,
          type: ChannelType.GuildText,
          permissionOverwrites: [
            {
              id: guild.roles.everyone.id,
              deny: [PermissionFlagsBits.ViewChannel],
            },
            {
              id: author.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
            },
          ],
        });

        const welcomeTitle = cuteStyle !== 'off' ? formatCute('Ticket Created', cuteStyle, '🎫') : '🎫 Ticket Created';
        const embed = new EmbedBuilder()
          .setColor('#00FF00')
          .setTitle(welcomeTitle)
          .setDescription(`Hello ${author}, thanks for opening a ticket!\nUse \`${isInteraction ? '/ticket close' : '|ticket close'}\` to request a staff member close this channel.`);

        await ticketChannel.send({ content: `${author}`, embeds: [embed] });
        try { await logAction(guild, 'Ticket Opened', author, `Channel: ${ticketChannel.name}`); } catch(e){}
        
        const successMsg = `✅ Ticket channel created successfully: ${ticketChannel}`;
        if (isInteraction) {
          await interaction.editReply({ content: successMsg });
        } else {
          await channel.send(successMsg);
        }

      } catch (error) {
        console.error('Ticket creation error:', error);
        const errMsg = `❌ Failed to create ticket: ${error.message}`;
        if (isInteraction) {
          await interaction.editReply({ content: errMsg }).catch(() => null);
        } else {
          await channel.send(errMsg).catch(() => null);
        }
      }
    }

    // ==========================================
    // 🔒 TICKET CLOSE SUBCOMMAND
    // ==========================================
    if (subcommand === 'close') {
      // Permission restriction check for closing staff actions
      if (!memberExecutor.permissions.has(PermissionFlagsBits.Administrator) && 
          !memberExecutor.permissions.has(PermissionFlagsBits.ManageGuild)) {
        const msg = '❌ You need **Manage Server** or **Admin** permissions to close tickets!';
        return isInteraction ? interaction.reply({ content: msg, ephemeral: true }) : interaction.reply(msg);
      }

      // ADVANCED SCANNERS: Converts channel names to lower-case and evaluates font styles
      const transformedName = channel.name.toLowerCase();
      const isTicketChannel = /ticket|ⓣⓘⓒⓚⓔⓣ|ᴛɪᴄᴋᴇᴛ|ｔｉｃｋｅｔ/.test(transformedName) || channel.topic?.toLowerCase().includes('ticket');

      if (!isTicketChannel) {
        const msg = '❌ This command can only be used inside a ticket channel!';
        return isInteraction ? interaction.reply({ content: msg, ephemeral: true }) : interaction.reply(msg);
      }

      const closeMsg = '🔒 Closing and purging this channel in 5 seconds...';
      if (isInteraction) {
        await interaction.reply({ content: closeMsg });
      } else {
        await interaction.reply(closeMsg).catch(() => null);
      }

      try { await logAction(guild, 'Ticket Closed', author, `Channel: ${channel.name}`); } catch(e){}

      setTimeout(async () => {
        try {
          await channel.delete();
        } catch (e) {
          console.error('Failed to delete ticket channel:', e.message);
        }
      }, 5000);
    }
  }
};
