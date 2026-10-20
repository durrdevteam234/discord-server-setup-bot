const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { outranks } = require('../utils/hierarchy');
const { logAction = () => {} } = require('../utils/auditLog');
const db = require('../utils/database'); // Restored your internal adapter mapping
const { createCase } = require('../utils/moderationCases');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a user from the server')
    .addUserOption(option => option.setName('user').setDescription('User to kick').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for kick').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  name: 'kick',

  async execute(interaction, client) {
    await interaction.deferReply().catch(() => null);

    const guild = interaction.guild;
    const author = interaction.user;
    const memberExecutor = interaction.member;
    const guildId = interaction.guildId;

    if (!memberExecutor.permissions.has(PermissionFlagsBits.KickMembers)) {
      const msg = '❌ You need Kick Members permission!';
      return interaction.editReply({ content: msg });
    }

    try {
      const user = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'No reason provided';

      if (!user) {
        const msg = '❌ Please mention a valid user or provide a valid user ID.';
        return interaction.editReply({ content: msg });
      }

      const member = await guild.members.fetch({ user: user.id, force: true }).catch(() => null);
      if (!member) {
        const msg = '❌ This user is not in the server! You cannot kick someone who has already left.';
        return interaction.editReply({ content: msg });
      }

      if (!member.kickable || !outranks(memberExecutor, member)) {
        const msg = '❌ I cannot kick this user! Their roles are higher than mine or yours.';
        return interaction.editReply({ content: msg });
      }

      await member.kick(reason);


      await logAction(guild, 'User Kicked', author, `User: ${user.username}, Reason: ${reason}`);
      const moderationCase = await createCase({ guildId, action: 'kick', target: user, moderator: author, reason });

      const embed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('✅ User Kicked')
        .setDescription(`${user.username} has been kicked.\nReason: ${reason}\nCase: **#${moderationCase.caseNumber}**`);

      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Kick error:', error);
      const msg = `❌ Error kicking user: ${error.message}`;
      return interaction.editReply({ content: msg });
    }
  },

  
};
