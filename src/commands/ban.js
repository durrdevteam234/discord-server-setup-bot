const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { outranks } = require('../utils/hierarchy');
const { logAction } = require('../utils/auditLog');
const db = require('../utils/database'); // Restored your dynamic helper model
const { createCase } = require('../utils/moderationCases');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a user from the server')
    .addUserOption(option => option.setName('user').setDescription('User to ban').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for ban').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  name: 'ban',

  async execute(interaction, client) {
    await interaction.deferReply().catch(() => null);

    const guild = interaction.guild;
    const author = interaction.user;
    const memberExecutor = interaction.member;
    const guildId = interaction.guildId;

    if (!memberExecutor.permissions.has(PermissionFlagsBits.BanMembers)) {
      const msg = '❌ You need Ban Members permission!';
      return interaction.editReply({ content: msg });
    }

    try {
      const user = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'No reason provided';

      if (!user) {
        const msg = '❌ Please mention a valid user or provide a valid user ID.';
        return interaction.editReply({ content: msg });
      }

      const existingBan = await guild.bans.fetch({ user: user.id, cache: false }).catch(() => null);
      if (existingBan) {
        const msg = `❌ **${user.username}** is already banned from this server!`;
        return interaction.editReply({ content: msg });
      }

      const member = await guild.members.fetch({ user: user.id, force: true }).catch(() => null);
      if (member && (!member.bannable || !outranks(memberExecutor, member))) {
        const msg = '❌ I cannot ban this user! Their roles are higher than mine or yours.';
        return interaction.editReply({ content: msg });
      }

      await guild.members.ban(user.id, { reason });


      await logAction(guild, 'User Banned', author, `User: ${user.username}, Reason: ${reason}`);
      const moderationCase = await createCase({ guildId, action: 'ban', target: user, moderator: author, reason });

      const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('✅ User Banned')
        .setDescription(`${user.username} has been banned.\nReason: ${reason}\nCase: **#${moderationCase.caseNumber}**`);

      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Ban error:', error);
      const msg = `❌ Error banning user: ${error.message}`;
      return interaction.editReply({ content: msg });
    }
  },

  
};
