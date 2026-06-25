const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { logAction } = require('../utils/auditLog');
const { readData, writeData } = require('../utils/database');

let ticketCounter = 0;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Ticket system commands')
    .addSubcommand(subcommand =>
      subcommand.setName('create')
        .setDescription('Create a support ticket')
    )
    .addSubcommand(subcommand =>
      subcommand.setName('close')
        .setDescription('Close a ticket')
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const guild = interaction.guild;

    if (subcommand === 'create') {
      try {
        ticketCounter++;
        const ticketName = `ticket-${ticketCounter}`;

        // Create ticket category if it doesn't exist
        let ticketCategory = guild.channels.cache.find(ch => ch.name === 'Tickets' && ch.type === 4);
        if (!ticketCategory) {
          ticketCategory = await guild.channels.create({
            name: 'Tickets',
            type: 4,
          });
        }

        // Create ticket channel
        const ticketChannel = await guild.channels.create({
          name: ticketName,
          type: 0,
          parent: ticketCategory.id,
          permissionOverwrites: [
            {
              id: guild.id,
              deny: ['ViewChannel'],
            },
            {
              id: interaction.user.id,
              allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'],
            },
            {
              id: guild.roles.cache.find(r => r.name === 'Admin')?.id || guild.id,
              allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'],
            },
          ],
        });

        // Save ticket data
        const tickets = readData('tickets.json');
        if (!tickets[guild.id]) tickets[guild.id] = {};
        tickets[guild.id][ticketCounter] = {
          creator: interaction.user.id,
          channel: ticketChannel.id,
          created: new Date().toISOString(),
        };
        writeData('tickets.json', tickets);

        // Log action
        await logAction(guild, 'Ticket Created', interaction.user, `Ticket: ${ticketName}`);

        const embed = new EmbedBuilder()
          .setColor('#0099FF')
          .setTitle('✅ Ticket Created')
          .setDescription(`Your ticket has been created: ${ticketChannel}`);

        await interaction.reply({ embeds: [embed], ephemeral: true });
      } catch (error) {
        console.error('Ticket creation error:', error);
        await interaction.reply({ content: `❌ Error creating ticket: ${error.message}`, ephemeral: true });
      }
    } else if (subcommand === 'close') {
      try {
        const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
        const tickets = readData('tickets.json');
        const guildTickets = tickets[guild.id] || {};

        let isCreator = false;
        let ticketId = null;

        for (const [id, ticket] of Object.entries(guildTickets)) {
          if (ticket.channel === interaction.channelId && ticket.creator === interaction.user.id) {
            isCreator = true;
            ticketId = id;
            break;
          }
        }

        if (!isAdmin && !isCreator) {
          return interaction.reply({ content: '❌ Only admins or the ticket creator can close this ticket!', ephemeral: true });
        }

        // Log action
        await logAction(guild, 'Ticket Closed', interaction.user, `Ticket ID: ${ticketId}`);

        await interaction.reply({ content: '🗑️ Closing ticket in 5 seconds...' });
        setTimeout(() => interaction.channel.delete(), 5000);
      } catch (error) {
        console.error('Ticket close error:', error);
        await interaction.reply({ content: `❌ Error closing ticket: ${error.message}`, ephemeral: true });
      }
    }
  },
};
