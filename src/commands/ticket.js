const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const { logAction } = require('../utils/auditLog');
const { readData, writeData } = require('../utils/database');
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

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const guild = interaction.guild;
    const guildId = interaction.guildId;

    // ==========================================
    // 🎟️ TICKET CREATE SUBCOMMAND
    // ==========================================
    if (subcommand === 'create') {
      await interaction.deferReply({ ephemeral: true });

      try {
        const cuteData = readData('cute.json');
        const cuteStyle = cuteData[guildId] || 'off';

        // Use a persistent slice of the User ID instead of a counter variable that resets on Railway restarts
        const uniqueId = interaction.user.id.slice(-4);
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
              id: interaction.user.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
            },
          ],
        });

        const welcomeTitle = cuteStyle !== 'off' ? formatCute('Ticket Created', cuteStyle, '🎫') : '🎫 Ticket Created';
        const embed = new EmbedBuilder()
          .setColor('#00FF00')
          .setTitle(welcomeTitle)
          .setDescription(`Hello ${interaction.user}, thanks for opening a ticket!\nUse \`/ticket close\` to request a staff member close this channel.`);

        await ticketChannel.send({ content: `${interaction.user}`, embeds: [embed] });
        try { await logAction(guild, 'Ticket Opened', interaction.user, `Channel: ${ticketChannel.name}`); } catch(e){}
        
        await interaction.editReply({ content: `✅ Ticket channel created successfully: ${ticketChannel}` });

      } catch (error) {
        console.error('Ticket creation error:', error);
        await interaction.editReply({ content: `❌ Failed to create ticket: ${error.message}` }).catch(() => null);
      }
    }

    // ==========================================
    // 🔒 TICKET CLOSE SUBCOMMAND
    // ==========================================
    if (subcommand === 'close') {
      // Permission restriction check for closing staff actions
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator) && 
          !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({ content: '❌ You need **Manage Server** or **Admin** permissions to close tickets!', ephemeral: true });
      }

      // Check if they are inside a ticket channel
      if (!interaction.channel.name.includes('ticket')) {
        return interaction.reply({ content: '❌ This command can only be used inside a ticket channel!', ephemeral: true });
      }

      await interaction.reply({ content: '🔒 Closing and purging this channel in 5 seconds...' });
      try { await logAction(guild, 'Ticket Closed', interaction.user, `Channel: ${interaction.channel.name}`); } catch(e){}

      setTimeout(async () => {
        try {
          await interaction.channel.delete();
        } catch (e) {
          console.error('Failed to delete ticket channel:', e.message);
        }
      }, 5000);
    }
  }
};
