const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { outranks } = require('../utils/hierarchy');
const { logAction } = require('../utils/auditLog');
const db = require('../utils/database'); // Restored your internal adapter mapping
const { createCase } = require('../utils/moderationCases');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a server member')
    .addUserOption(option => option.setName('user').setDescription('User to warn').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for warning').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  name: 'warn',

  async execute(interaction, client) {
    await interaction.deferReply().catch(() => null);

    const guild = interaction.guild;
    const author = interaction.user;
    const memberExecutor = interaction.member;
    const guildId = interaction.guildId;

    if (!memberExecutor.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      const msg = '❌ You need Moderate Members permission to issue warnings!';
      return interaction.editReply({ content: msg });
    }

    try {
      const user = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason');

      if (!user) {
        const msg = '❌ Please mention a valid user or provide a valid user ID.';
        return interaction.editReply({ content: msg });
      }

      const member = await guild.members.fetch({ user: user.id, force: true }).catch(() => null);
      if (!member) {
        const msg = '❌ This user is not in the server! You cannot warn someone who is not here.';
        return interaction.editReply({ content: msg });
      }

      if (!outranks(memberExecutor, member)) {
        const msg = '❌ You cannot warn someone with an equal or higher role than yours.';
        return interaction.editReply({ content: msg });
      }

      if (!reason) {
        const msg = '❌ Please provide a reason for the warning.';
        return interaction.editReply({ content: msg });
      }

      // 🌟 ADAPTER OPERATION: Safely updating through your custom json/mongodb schema wrapper
      const warnings = (await db.readData('warnings.json')) || {};
      if (!warnings[guildId]) warnings[guildId] = {};
      if (!warnings[guildId][user.id]) warnings[guildId][user.id] = [];

      warnings[guildId][user.id].push({
        moderatorId: author.id,
        reason: reason,
        timestamp: new Date().toISOString()
      });
      await db.writeData('warnings.json', warnings);

      const totalWarnings = warnings[guildId][user.id].length;

      // DM the user safely
      await user.send(`⚠️ You have been warned in **${guild.name}**.\n**Reason:** ${reason}`).catch(() => null);


      await logAction(guild, 'User Warned', author, `User: ${user.username}, Reason: ${reason}`);
      const moderationCase = await createCase({ guildId, action: 'warn', target: user, moderator: author, reason });

      const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('⚠️ User Warned')
        .setDescription(`${user.username} has been warned.\nReason: ${reason}\nTotal warnings: **${totalWarnings}**\nCase: **#${moderationCase.caseNumber}**`);

      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Warn error:', error);
      const msg = `❌ Error running warning system: ${error.message}`;
      return interaction.editReply({ content: msg });
    }
  },

  
};
