const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const { logAction } = require('../utils/auditLog');
const { readData, writeData } = require('../utils/database');
const { formatCute } = require('../utils/textFormatter.js');

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
    const guildId = interaction.guildId;

    try {
      // Fetch the server's cute font choice
      const cuteData = readData('cute.json');
      const cuteStyle = cuteData[guildId] || 'off';

      if (subcommand === 'create') {
        ticketCounter++;
        
        // Generate a stylized name if cute mode is active (e.g., 🎟️﹒ｔｉｃｋｅｔ－０００１)
        const rawName = `ticket-${ticketCounter.toString().padStart(4, '0')}`;
        const ticketChannelName = cuteStyle !== 'off' ? formatCute(rawName, cuteStyle, '🎟️') : rawName;

        // Create a private text channel for support
        const ticketChannel = await guild.channels.create({
          name: ticketChannelName,
          type: ChannelType.GuildText,
          permissionOverwrites: [
            {
              id: guild.roles.everyone.id,
              deny: [PermissionFlagsBits.ViewChannel], // Hide from normal members
            },
            {
              id: interaction.user.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages], // Allow the creator to view
            },
          ],
        });

        const welcomeTitle = cuteStyle !== 'off' ? formatCute('Ticket Created', cuteStyle, '🎫') : '🎫 Ticket Created';
        const embed = new EmbedBuilder()
          .setColor('#00FF00')
          .setTitle(welcomeTitle)
          .setDescription(`Hello ${interaction.user}, thanks for opening a ticket! Support will be with you shortly.\nUse \`/ticket close\` to end this support session.`);

        await ticketChannel.send({ content: `${interaction.user}`, embeds: [embed] });
        await logAction(guild, 'Ticket Opened', interaction.user, `Channel: ${ticketChannel.name}`);

        await interaction.reply({ content: `✅ Your ticket has been created: ${ticketChannel}`, ephemeral: true });
      }

      if (subcommand === 'close') {
        // Staff validation gate: Only people who can Manage Guild or are Admin can close support threads
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator) && 
            !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
          return interaction.reply({ 
            content: '❌ Only staff members with **Administrator** or **Manage Server** permissions can close tickets!', 
            ephemeral: true 
          });
        }

        // Safety check to ensure they are inside a ticket channel
        if (!interaction.channel.name.includes('ticket')) {
          return interaction.reply({ content: '❌ This command can only be executed inside an active ticket channel!', ephemeral: true });
        }

        await interaction.reply({ content: '🔒 Closing ticket channel in 5 seconds...' });
        await logAction(guild, 'Ticket Closed', interaction.user, `Channel: ${interaction.channel.name}`);

        setTimeout(async () => {
          try {
            await interaction.channel.delete();
          } catch (e) {
            console.error('Failed to delete ticket channel:', e);
          }
        }, 5000);
      }
    } catch (error) {
      console.error('Ticket system error:', error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: `❌ Ticket error: ${error.message}`, ephemeral: true });
      } else {
        await interaction.reply({ content: `❌ Ticket error: ${error.message}`, ephemeral: true });
      }
    }
  },
};
