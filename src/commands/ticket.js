const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const { logAction } = require('../utils/auditLog');
const { readData, writeData } = require('../utils/database');
const { formatCute } = require('../utils/textFormatter.js');

let ticketCounter = 0;

module.exports = [
  // 🎟️ MEMBER COMMAND
  {
    data: new SlashCommandBuilder()
      .setName('ticket')
      .setDescription('Create a support ticket'),
    async execute(interaction) {
      const guild = interaction.guild;
      const guildId = interaction.guildId;

      try {
        const cuteData = readData('cute.json');
        const cuteStyle = cuteData[guildId] || 'off';

        ticketCounter++;
        const rawName = `ticket-${ticketCounter.toString().padStart(4, '0')}`;
        const ticketChannelName = cuteStyle !== 'off' ? formatCute(rawName, cuteStyle, '🎟️') : rawName;

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
          .setDescription(`Hello ${interaction.user}, thanks for opening a ticket!\nUse \`/ticket-staff close\` to request a close.`);

        await ticketChannel.send({ content: `${interaction.user}`, embeds: [embed] });
        await logAction(guild, 'Ticket Opened', interaction.user, `Channel: ${ticketChannel.name}`);
        await interaction.reply({ content: `✅ Created: ${ticketChannel}`, ephemeral: true });
      } catch (error) {
        console.error(error);
        await interaction.reply({ content: `❌ Error: ${error.message}`, ephemeral: true });
      }
    }
  },

  // 🔒 STAFF ONLY COMMAND
  {
    data: new SlashCommandBuilder()
      .setName('ticket-staff')
      .setDescription('Staff ticket controls')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator | PermissionFlagsBits.ManageGuild)
      .addSubcommand(subcommand =>
        subcommand.setName('close')
          .setDescription('Close this ticket')
      ),
    async execute(interaction) {
      const guild = interaction.guild;

      if (!interaction.channel.name.includes('ticket')) {
        return interaction.reply({ content: '❌ Run this inside a ticket channel!', ephemeral: true });
      }

      await interaction.reply({ content: '🔒 Closing channel in 5 seconds...' });
      await logAction(guild, 'Ticket Closed', interaction.user, `Channel: ${interaction.channel.name}`);

      setTimeout(async () => {
        try {
          await interaction.channel.delete();
        } catch (e) {
          console.error(e);
        }
      }, 5000);
    }
  }
];
