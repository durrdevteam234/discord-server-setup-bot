const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { logAction } = require('../utils/auditLog');
const db = require('../utils/database'); // Restored your internal adapter mapping

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unban a user from the server using their username')
    .addStringOption(option => 
      option.setName('username')
        .setDescription('The exact username of the user to unban')
        .setRequired(true)
    )
    .addStringOption(option => 
      option.setName('reason')
        .setDescription('Reason for the unban')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  name: 'unban',

  async execute(interaction, client) {
    await interaction.deferReply().catch(() => null);

    const guild = interaction.guild;
    const author = interaction.user;
    const memberExecutor = interaction.member;
    const guildId = interaction.guildId;

    if (!memberExecutor.permissions.has(PermissionFlagsBits.BanMembers)) {
      const msg = '❌ You need Ban Members permission to revoke bans!';
      return interaction.editReply({ content: msg });
    }

    try {
      const targetName = interaction.options.getString('username')?.trim();
      const reason = interaction.options.getString('reason') || 'No reason provided';

      if (!targetName) {
        const msg = '❌ Please specify a username to unban! Example: `/unban username:john_doe`';
        return interaction.editReply({ content: msg });
      }

      const banList = await guild.bans.fetch({ cache: false }).catch(() => null);
      if (!banList || banList.size === 0) {
        const msg = '❌ There are no banned users registered on this server!';
        return interaction.editReply({ content: msg });
      }

      const targetNameLower = targetName.toLowerCase();
      const banEntry = banList.find(b => 
        b.user.username.toLowerCase() === targetNameLower || 
        b.user.tag.toLowerCase() === targetNameLower ||
        b.user.id === targetNameLower
      );

      if (!banEntry) {
        const msg = `❌ Could not find a banned user named **${targetName}**! Ensure spelling matches exactly.`;
        return interaction.editReply({ content: msg });
      }

      const user = banEntry.user;
      await guild.members.unban(user.id, reason);


      await logAction(guild, 'User Unbanned', author, `User: ${user.username}, Reason: ${reason}`);

      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✅ User Unbanned')
        .setDescription(`**${user.username}** has been successfully unbanned.\nReason: ${reason}`);

      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Unban error:', error);
      const msg = `❌ Error unbanning user: ${error.message}`;
      return interaction.editReply({ content: msg });
    }
  },

  
};
