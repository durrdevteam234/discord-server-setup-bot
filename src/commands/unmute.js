const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { logAction } = require('../utils/auditLog');
const db = require('../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Unmute a user')
    .addUserOption(option => option.setName('user').setDescription('User to unmute').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  name: 'unmute',

  async execute(interaction, client) {
    await interaction.deferReply().catch(() => null);

    const guild = interaction.guild;
    const author = interaction.user;
    const memberExecutor = interaction.member;
    const guildId = interaction.guildId;

    if (!memberExecutor.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      const msg = '❌ You need Moderate Members permission!';
      return interaction.editReply({ content: msg });
    }

    try {
      const user = interaction.options.getUser('user');

      if (!user) {
        const msg = '❌ Please mention a valid user or provide a valid user ID.';
        return interaction.editReply({ content: msg });
      }

      const member = await guild.members.fetch(user.id).catch(() => null);
      if (!member) {
        const msg = '❌ This user is not in the server.';
        return interaction.editReply({ content: msg });
      }

      await member.timeout(null);

      const mutes = (await db.readData('mutes.json')) || {};
      if (mutes[guildId] && mutes[guildId][user.id]) {
        delete mutes[guildId][user.id];
        await db.writeData('mutes.json', mutes);
      }


      await logAction(guild, 'User Unmuted', author, `User: ${user.username}`);

      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✅ User Unmuted')
        .setDescription(`${user.username} has been unmuted.`);

      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Unmute error:', error);
      const msg = `❌ Error unmuting user: ${error.message}`;
      return interaction.editReply({ content: msg });
    }
  },

  
};
